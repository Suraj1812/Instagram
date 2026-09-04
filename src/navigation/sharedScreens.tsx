import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PostDetailScreen } from '../screens/Home/PostDetailScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { EditProfileScreen } from '../screens/Profile/EditProfileScreen';
import { FollowersScreen } from '../screens/Profile/FollowersScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { MessagesListScreen } from '../screens/Messages/MessagesListScreen';
import { ChatScreen } from '../screens/Messages/ChatScreen';
import { StoryViewerScreen } from '../screens/Stories/StoryViewerScreen';
import { CreateStoryScreen } from '../screens/Stories/CreateStoryScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { SearchScreen } from '../screens/Search/SearchScreen';
import { CallSetupScreen } from '../screens/Calls/CallSetupScreen';
import { InCallScreen } from '../screens/Calls/InCallScreen';

const Stack = createNativeStackNavigator();

/**
 * Every bottom tab gets its own instance of these shared detail screens, so
 * pushing into a profile or a post from the Home tab doesn't disturb the
 * Explore or Reels tab's navigation state (and doesn't remount their lists).
 */
export function registerSharedScreens(NavigatorStack: typeof Stack) {
  return (
    <>
      <NavigatorStack.Screen name="PostDetail" component={PostDetailScreen} />
      <NavigatorStack.Screen name="Profile" component={ProfileScreen} />
      <NavigatorStack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
      <NavigatorStack.Screen name="Followers" component={FollowersScreen} />
      <NavigatorStack.Screen name="Settings" component={SettingsScreen} />
      <NavigatorStack.Screen name="Messages" component={MessagesListScreen} />
      <NavigatorStack.Screen name="Chat" component={ChatScreen} />
      <NavigatorStack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <NavigatorStack.Screen name="CreateStory" component={CreateStoryScreen} options={{ presentation: 'modal' }} />
      <NavigatorStack.Screen name="Notifications" component={NotificationsScreen} />
      <NavigatorStack.Screen name="Search" component={SearchScreen} />
      <NavigatorStack.Screen name="CallSetup" component={CallSetupScreen} options={{ presentation: 'modal' }} />
      <NavigatorStack.Screen name="InCall" component={InCallScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false, headerShown: false }} />
    </>
  );
}

export { Stack as SharedStack };
