import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeFeedScreen } from '../screens/Home/HomeFeedScreen';
import { ExploreScreen } from '../screens/Explore/ExploreScreen';
import { CreatePostScreen } from '../screens/Create/CreatePostScreen';
import { ReelsScreen } from '../screens/Reels/ReelsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { registerSharedScreens } from './sharedScreens';
import { useTheme } from '../theme/useTheme';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/Avatar';
import { HomeIcon, SearchIcon, PlusSquareIcon, ReelsIcon } from '../components/icons';
import { getProfileById } from '../db/repositories/userRepository';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function makeStack(homeName: string, HomeComponent: React.ComponentType<any>) {
  return function StackScreen() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name={homeName} component={HomeComponent} />
        {registerSharedScreens(Stack)}
      </Stack.Navigator>
    );
  };
}

const HomeStack = makeStack('HomeFeed', HomeFeedScreen);
const ExploreStack = makeStack('Explore', ExploreScreen);
const ReelsStack = makeStack('Reels', ReelsScreen);
const ProfileStack = makeStack('MyProfile', ProfileScreen);

/** Own-avatar tab icon — a small circular photo, same convention as every major social app's profile tab. */
function ProfileTabIcon({ focused }: { focused: boolean }) {
  const session = useAuthStore((s) => s.session)!;
  const [avatarPath, setAvatarPath] = useState<string | undefined>();
  useEffect(() => {
    getProfileById(session.userId, session.userId).then((p) => setAvatarPath(p?.avatarPath));
  }, [session.userId]);
  return <Avatar path={avatarPath} size={26} ringState={focused ? 'seen' : 'none'} />;
}

export function MainTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border, height: 54, paddingTop: 6 },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab" component={HomeStack}
        options={{ tabBarIcon: ({ color, focused }) => <HomeIcon size={26} color={color} filled={focused} /> }}
      />
      <Tab.Screen
        name="ExploreTab" component={ExploreStack}
        options={{ tabBarIcon: ({ color }) => <SearchIcon size={25} color={color} /> }}
      />
      <Tab.Screen
        name="CreateTab" component={CreatePostScreen}
        options={{ tabBarIcon: ({ color }) => <PlusSquareIcon size={26} color={color} /> }}
      />
      <Tab.Screen
        name="ReelsTab" component={ReelsStack}
        options={{ tabBarIcon: ({ color, focused }) => <ReelsIcon size={26} color={color} filled={focused} /> }}
      />
      <Tab.Screen
        name="ProfileTab" component={ProfileStack}
        options={{ tabBarIcon: ProfileTabIcon }}
      />
    </Tab.Navigator>
  );
}
