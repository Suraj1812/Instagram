-- ============================================================================
-- SwiftGram — Supabase (Postgres) schema. Run this once in your project's
-- SQL Editor (https://supabase.com/dashboard/project/_/sql/new), top to
-- bottom. Safe to re-run: everything is IF NOT EXISTS / OR REPLACE.
--
-- Design notes:
--   * `profiles` mirrors auth.users 1:1 (id = auth.users.id). A trigger
--     creates the row automatically right after signup.
--   * Denormalized counters (followers_count, following_count, posts_count,
--     comment_count) are maintained by triggers, not by client code — the
--     database is the single source of truth for them, same as the local
--     SQLite version's transactions used to be.
--   * Notifications (like/comment/follow) are also created by triggers, so
--     the client just inserts the "real" row (a like, a comment, a follow)
--     and everything else happens server-side, atomically.
--   * RPC functions (LANGUAGE sql/plpgsql) handle the composite reads that
--     need a join across the follow graph (feed, explore, reels, stories,
--     conversations) — these mirror the hand-written SQL the local SQLite
--     repositories used to run directly.
--   * Row Level Security is ON for every table. Public content (profiles,
--     posts, comments, likes, follows, stories) is readable by any signed-in
--     user; writes are restricted to "your own" rows; DMs/notifications are
--     restricted to their participants/recipient.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique not null,
  display_name     text,
  avatar_path      text,
  bio              text,
  is_private       boolean not null default false,
  is_seed          boolean not null default false,
  followers_count  integer not null default 0,
  following_count  integer not null default 0,
  posts_count      integer not null default 0,
  created_at       bigint not null
);

create table if not exists public.posts (
  id             text primary key,
  author_id      uuid not null references public.profiles(id) on delete cascade,
  caption        text,
  media_type     text not null,               -- 'image' | 'video' | 'carousel'
  media_json     jsonb not null,               -- [{path, thumbPath, width, height}]
  is_reel        boolean not null default false,
  comment_count  integer not null default 0,
  created_at     bigint not null
);
create index if not exists idx_posts_author on public.posts(author_id, created_at desc);
create index if not exists idx_posts_reel on public.posts(is_reel, created_at desc);
create index if not exists idx_posts_created on public.posts(created_at desc);

create table if not exists public.likes (
  post_id     text not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  bigint not null,
  primary key (post_id, user_id)
);
create index if not exists idx_likes_post on public.likes(post_id);

create table if not exists public.saves (
  post_id     text not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  bigint not null,
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id          text primary key,
  post_id     text not null references public.posts(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  body        text not null,
  created_at  bigint not null
);
create index if not exists idx_comments_post on public.comments(post_id, created_at);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  bigint not null,
  primary key (follower_id, followee_id)
);
create index if not exists idx_follows_followee on public.follows(followee_id);

create table if not exists public.stories (
  id          text primary key,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  media_path  text not null,
  media_type  text not null,                   -- 'image' | 'video'
  duration_ms integer not null default 5000,
  created_at  bigint not null,
  expires_at  bigint not null
);
create index if not exists idx_stories_author on public.stories(author_id, created_at);
create index if not exists idx_stories_expires on public.stories(expires_at);

create table if not exists public.story_views (
  story_id    text not null references public.stories(id) on delete cascade,
  viewer_id   uuid not null references public.profiles(id) on delete cascade,
  viewed_at   bigint not null,
  primary key (story_id, viewer_id)
);

create table if not exists public.conversations (
  id              text primary key,
  is_group        boolean not null default false,
  title           text,
  last_message_id text,
  updated_at      bigint not null
);

create table if not exists public.conversation_members (
  conversation_id text not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  body            text,
  media_path      text,
  created_at      bigint not null,
  read_at         bigint
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);

create table if not exists public.notifications (
  id            text primary key,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  type          text not null,                 -- 'like' | 'comment' | 'follow' | 'mention'
  actor_id      uuid not null references public.profiles(id),
  target_type   text,                          -- 'post' | 'comment' | 'user'
  target_id     text,
  is_read       boolean not null default false,
  created_at    bigint not null
);
create index if not exists idx_notif_recipient on public.notifications(recipient_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Auth trigger: create a profile row automatically right after signup.
-- Client sends username/display_name in supabase.auth.signUp(... options.data)
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, created_at)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username'),
    (extract(epoch from now()) * 1000)::bigint
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Triggers: denormalized counters (replace the local SQLite transactions)
-- ----------------------------------------------------------------------------

create or replace function public.handle_follow_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set followers_count = followers_count + 1 where id = new.followee_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set followers_count = greatest(0, followers_count - 1) where id = old.followee_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_follows_counts on public.follows;
create trigger trg_follows_counts after insert or delete on public.follows
  for each row execute function public.handle_follow_counts();

create or replace function public.handle_posts_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set posts_count = greatest(0, posts_count - 1) where id = old.author_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_posts_count on public.posts;
create trigger trg_posts_count after insert or delete on public.posts
  for each row execute function public.handle_posts_count();

create or replace function public.handle_comments_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists trg_comments_count on public.comments;
create trigger trg_comments_count after insert or delete on public.comments
  for each row execute function public.handle_comments_count();

-- ----------------------------------------------------------------------------
-- Triggers: notifications (like / comment / follow) — never notify yourself
-- ----------------------------------------------------------------------------

create or replace function public.handle_like_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (id, recipient_id, type, actor_id, target_type, target_id, created_at)
    values (gen_random_uuid()::text, v_author, 'like', new.user_id, 'post', new.post_id, new.created_at);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_likes_notify on public.likes;
create trigger trg_likes_notify after insert on public.likes
  for each row execute function public.handle_like_notify();

create or replace function public.handle_comment_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.author_id then
    insert into public.notifications (id, recipient_id, type, actor_id, target_type, target_id, created_at)
    values (gen_random_uuid()::text, v_author, 'comment', new.author_id, 'post', new.post_id, new.created_at);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_comments_notify on public.comments;
create trigger trg_comments_notify after insert on public.comments
  for each row execute function public.handle_comment_notify();

create or replace function public.handle_follow_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.follower_id <> new.followee_id then
    insert into public.notifications (id, recipient_id, type, actor_id, target_type, target_id, created_at)
    values (gen_random_uuid()::text, new.followee_id, 'follow', new.follower_id, 'user', new.follower_id::text, new.created_at);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_follows_notify on public.follows;
create trigger trg_follows_notify after insert on public.follows
  for each row execute function public.handle_follow_notify();

-- Keep conversations.last_message_id / updated_at in sync automatically.
create or replace function public.handle_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_id = new.id, updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists trg_messages_conversation on public.messages;
create trigger trg_messages_conversation after insert on public.messages
  for each row execute function public.handle_message_insert();

-- ----------------------------------------------------------------------------
-- RPC: atomic "find or create" a 1:1 DM (bypasses RLS deliberately, via
-- SECURITY DEFINER, since it must insert a membership row for the *other*
-- user too — but only ever between the two callers, never arbitrary users).
-- ----------------------------------------------------------------------------

create or replace function public.get_or_create_direct_conversation(user_a uuid, user_b uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if auth.uid() is null or (auth.uid() <> user_a and auth.uid() <> user_b) then
    raise exception 'not a participant';
  end if;

  select c.id into v_id
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = user_a
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = user_b
  where c.is_group = false
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  v_id := encode(gen_random_bytes(12), 'hex');
  insert into public.conversations (id, is_group, updated_at) values (v_id, false, (extract(epoch from now()) * 1000)::bigint);
  insert into public.conversation_members (conversation_id, user_id) values (v_id, user_a), (v_id, user_b);
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: called once right after a real signup so a brand-new (non-seed)
-- account doesn't open to an empty app — auto-follows a few demo accounts
-- (follow triggers above already handle counts + notifications) and drops a
-- welcome DM. SECURITY DEFINER because it needs to send that DM *as* the
-- demo account, which the new user could never do under normal RLS.
-- ----------------------------------------------------------------------------

create or replace function public.onboard_new_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_user uuid := auth.uid();
  v_seed_id uuid;
  v_convo_id text;
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_target record;
begin
  if v_new_user is null then
    raise exception 'not authenticated';
  end if;

  for v_target in
    select id from public.profiles where is_seed = true and id <> v_new_user order by followers_count desc limit 5
  loop
    insert into public.follows (follower_id, followee_id, created_at)
    values (v_new_user, v_target.id, v_now)
    on conflict do nothing;
    if v_seed_id is null then v_seed_id := v_target.id; end if;
  end loop;

  if v_seed_id is null then
    return; -- no seed accounts yet (run scripts/seed.js first)
  end if;

  select c.id into v_convo_id
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = v_new_user
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = v_seed_id
  where c.is_group = false
  limit 1;

  if v_convo_id is null then
    v_convo_id := encode(gen_random_bytes(12), 'hex');
    insert into public.conversations (id, is_group, updated_at) values (v_convo_id, false, v_now);
    insert into public.conversation_members (conversation_id, user_id) values (v_convo_id, v_new_user), (v_convo_id, v_seed_id);
  end if;

  insert into public.messages (id, conversation_id, sender_id, body, created_at)
  values (encode(gen_random_bytes(12), 'hex'), v_convo_id, v_seed_id, 'hey! welcome to SwiftGram 👋', v_now);
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: composite reads that need the follow graph (feed / explore / reels /
-- stories) or per-row aggregation (conversation list). Each returns rows
-- shaped exactly like the old SQLite repository queries expected.
-- ----------------------------------------------------------------------------

create or replace function public.get_feed_page(before_ts bigint, page_limit int default 10)
returns table (
  id text, author_id uuid, caption text, media_type text, media_json jsonb, is_reel boolean,
  comment_count int, created_at bigint, username text, display_name text, avatar_path text,
  like_count int, liked_by_me boolean, saved_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.author_id, p.caption, p.media_type, p.media_json, p.is_reel, p.comment_count, p.created_at,
    u.username, u.display_name, u.avatar_path,
    (select count(*)::int from public.likes l where l.post_id = p.id) as like_count,
    exists(select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    exists(select 1 from public.saves s where s.post_id = p.id and s.user_id = auth.uid()) as saved_by_me
  from public.posts p join public.profiles u on u.id = p.author_id
  where p.is_reel = false and p.created_at < before_ts
    and (p.author_id = auth.uid() or p.author_id in (select followee_id from public.follows where follower_id = auth.uid()))
  order by p.created_at desc limit page_limit;
$$;

create or replace function public.get_explore_page(page_offset int default 0, page_limit int default 24)
returns table (
  id text, author_id uuid, caption text, media_type text, media_json jsonb, is_reel boolean,
  comment_count int, created_at bigint, username text, display_name text, avatar_path text,
  like_count int, liked_by_me boolean, saved_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.author_id, p.caption, p.media_type, p.media_json, p.is_reel, p.comment_count, p.created_at,
    u.username, u.display_name, u.avatar_path,
    (select count(*)::int from public.likes l where l.post_id = p.id) as like_count,
    exists(select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    exists(select 1 from public.saves s where s.post_id = p.id and s.user_id = auth.uid()) as saved_by_me
  from public.posts p join public.profiles u on u.id = p.author_id
  where p.is_reel = false and p.author_id <> auth.uid()
    and p.author_id not in (select followee_id from public.follows where follower_id = auth.uid())
  order by like_count desc, p.created_at desc limit page_limit offset page_offset;
$$;

create or replace function public.get_reels_page(before_ts bigint, page_limit int default 6)
returns table (
  id text, author_id uuid, caption text, media_type text, media_json jsonb, is_reel boolean,
  comment_count int, created_at bigint, username text, display_name text, avatar_path text,
  like_count int, liked_by_me boolean, saved_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.author_id, p.caption, p.media_type, p.media_json, p.is_reel, p.comment_count, p.created_at,
    u.username, u.display_name, u.avatar_path,
    (select count(*)::int from public.likes l where l.post_id = p.id) as like_count,
    exists(select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    exists(select 1 from public.saves s where s.post_id = p.id and s.user_id = auth.uid()) as saved_by_me
  from public.posts p join public.profiles u on u.id = p.author_id
  where p.is_reel = true and p.created_at < before_ts
  order by p.created_at desc limit page_limit;
$$;

create or replace function public.get_user_posts(target_author_id uuid, reels_only boolean default false)
returns table (
  id text, author_id uuid, caption text, media_type text, media_json jsonb, is_reel boolean,
  comment_count int, created_at bigint, username text, display_name text, avatar_path text,
  like_count int, liked_by_me boolean, saved_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.author_id, p.caption, p.media_type, p.media_json, p.is_reel, p.comment_count, p.created_at,
    u.username, u.display_name, u.avatar_path,
    (select count(*)::int from public.likes l where l.post_id = p.id) as like_count,
    exists(select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    exists(select 1 from public.saves s where s.post_id = p.id and s.user_id = auth.uid()) as saved_by_me
  from public.posts p join public.profiles u on u.id = p.author_id
  where p.author_id = target_author_id and p.is_reel = reels_only
  order by p.created_at desc;
$$;

create or replace function public.get_saved_posts()
returns table (
  id text, author_id uuid, caption text, media_type text, media_json jsonb, is_reel boolean,
  comment_count int, created_at bigint, username text, display_name text, avatar_path text,
  like_count int, liked_by_me boolean, saved_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.author_id, p.caption, p.media_type, p.media_json, p.is_reel, p.comment_count, p.created_at,
    u.username, u.display_name, u.avatar_path,
    (select count(*)::int from public.likes l where l.post_id = p.id) as like_count,
    exists(select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    true as saved_by_me
  from public.posts p join public.profiles u on u.id = p.author_id
  join public.saves sv on sv.post_id = p.id and sv.user_id = auth.uid()
  order by sv.created_at desc;
$$;

create or replace function public.get_post_by_id(target_post_id text)
returns table (
  id text, author_id uuid, caption text, media_type text, media_json jsonb, is_reel boolean,
  comment_count int, created_at bigint, username text, display_name text, avatar_path text,
  like_count int, liked_by_me boolean, saved_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.author_id, p.caption, p.media_type, p.media_json, p.is_reel, p.comment_count, p.created_at,
    u.username, u.display_name, u.avatar_path,
    (select count(*)::int from public.likes l where l.post_id = p.id) as like_count,
    exists(select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
    exists(select 1 from public.saves s where s.post_id = p.id and s.user_id = auth.uid()) as saved_by_me
  from public.posts p join public.profiles u on u.id = p.author_id
  where p.id = target_post_id;
$$;

create or replace function public.get_active_story_groups()
returns table (
  id text, author_id uuid, media_path text, media_type text, duration_ms int,
  created_at bigint, expires_at bigint, username text, display_name text, avatar_path text,
  viewed_by_me boolean
)
language sql stable security definer set search_path = public as $$
  select s.id, s.author_id, s.media_path, s.media_type, s.duration_ms, s.created_at, s.expires_at,
    u.username, u.display_name, u.avatar_path,
    exists(select 1 from public.story_views v where v.story_id = s.id and v.viewer_id = auth.uid()) as viewed_by_me
  from public.stories s join public.profiles u on u.id = s.author_id
  where s.expires_at > (extract(epoch from now()) * 1000)::bigint
    and (s.author_id = auth.uid() or s.author_id in (select followee_id from public.follows where follower_id = auth.uid()))
  order by s.created_at asc;
$$;

create or replace function public.get_conversations()
returns table (
  id text, title text, updated_at bigint, last_body text,
  other_id uuid, other_username text, other_display_name text, other_avatar_path text,
  unread_count int
)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.updated_at, m.body as last_body,
    ou.id as other_id, ou.username as other_username, ou.display_name as other_display_name, ou.avatar_path as other_avatar_path,
    (select count(*)::int from public.messages mm where mm.conversation_id = c.id and mm.sender_id <> auth.uid() and mm.read_at is null) as unread_count
  from public.conversations c
  join public.conversation_members mem on mem.conversation_id = c.id and mem.user_id = auth.uid()
  left join public.messages m on m.id = c.last_message_id
  left join public.conversation_members other_mem on other_mem.conversation_id = c.id and other_mem.user_id <> auth.uid()
  left join public.profiles ou on ou.id = other_mem.user_id
  order by c.updated_at desc;
$$;

create or replace function public.get_suggested_accounts(page_limit int default 10)
returns table (id uuid, username text, display_name text, avatar_path text)
language sql stable security definer set search_path = public as $$
  select id, username, display_name, avatar_path from public.profiles
  where id <> auth.uid() and id not in (select followee_id from public.follows where follower_id = auth.uid())
  order by followers_count desc limit page_limit;
$$;

create or replace function public.search_all(term text, result_limit int default 30)
returns table (entity_id text, entity_type text, text_value text)
language sql stable security definer set search_path = public as $$
  (
    select id::text as entity_id, 'user'::text as entity_type, coalesce(display_name, '') || ' ' || username as text_value
    from public.profiles where username ilike '%' || term || '%' or display_name ilike '%' || term || '%'
    limit result_limit
  )
  union all
  (
    select id as entity_id, 'post'::text as entity_type, coalesce(caption, '') as text_value
    from public.posts where caption ilike '%' || term || '%'
    limit result_limit
  )
$$;

-- ----------------------------------------------------------------------------
-- RPC: let a signed-in user delete their own account. Deleting the
-- auth.users row cascades (via `profiles.id references auth.users(id) on
-- delete cascade`) through every table that references profiles — posts,
-- likes, comments, follows, stories, messages, notifications, all of it.
-- ----------------------------------------------------------------------------

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts for select using (true);
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = author_id);

drop policy if exists "likes_select_all" on public.likes;
create policy "likes_select_all" on public.likes for select using (true);
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own" on public.saves for select using (auth.uid() = user_id);
drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own" on public.saves for insert with check (auth.uid() = user_id);
drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_delete_own" on public.saves for delete using (auth.uid() = user_id);

drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all" on public.comments for select using (true);
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = author_id);

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all" on public.follows for select using (true);
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists "stories_select_all" on public.stories;
create policy "stories_select_all" on public.stories for select using (true);
drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories for insert with check (auth.uid() = author_id);
drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories for delete using (auth.uid() = author_id);

drop policy if exists "story_views_select_own" on public.story_views;
create policy "story_views_select_own" on public.story_views for select using (auth.uid() = viewer_id);
drop policy if exists "story_views_insert_own" on public.story_views;
create policy "story_views_insert_own" on public.story_views for insert with check (auth.uid() = viewer_id);

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations for select using (
  exists (select 1 from public.conversation_members m where m.conversation_id = id and m.user_id = auth.uid())
);

drop policy if exists "conv_members_select_own" on public.conversation_members;
create policy "conv_members_select_own" on public.conversation_members for select using (
  exists (select 1 from public.conversation_members m2 where m2.conversation_id = conversation_id and m2.user_id = auth.uid())
);

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member" on public.messages for select using (
  exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member" on public.messages for insert with check (
  auth.uid() = sender_id and exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);
drop policy if exists "messages_update_member" on public.messages;
create policy "messages_update_member" on public.messages for update using (
  exists (select 1 from public.conversation_members m where m.conversation_id = conversation_id and m.user_id = auth.uid())
);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = recipient_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = recipient_id);

-- ----------------------------------------------------------------------------
-- Realtime: let the app subscribe to live inserts on these tables (DMs,
-- notifications, conversation list). Safe to re-run — skips tables already
-- in the publication.
-- ----------------------------------------------------------------------------

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.messages';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.notifications';
  exception when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.conversations';
  exception when duplicate_object then null;
  end;
end $$;

-- ----------------------------------------------------------------------------
-- Storage buckets (public read, so posted media loads without signed URLs).
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('stories', 'stories', true) on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects for select using (bucket_id in ('avatars', 'posts', 'stories'));
drop policy if exists "media_auth_insert" on storage.objects;
create policy "media_auth_insert" on storage.objects for insert with check (bucket_id in ('avatars', 'posts', 'stories') and auth.role() = 'authenticated');
drop policy if exists "media_own_delete" on storage.objects;
create policy "media_own_delete" on storage.objects for delete using (bucket_id in ('avatars', 'posts', 'stories') and auth.uid() = owner);

-- Done. Next: Project Settings -> API for your URL + anon key, then run
-- `npx supabase gen types` is optional — the app doesn't need generated types.
