import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function Icon({ name, size = 24, color = '#fff', style }: { name: IoniconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export function HomeIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  return <Icon name={filled ? 'home' : 'home-outline'} size={size} color={color} />;
}

export function SearchIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="search-outline" size={size} color={color} />;
}

export function PlusSquareIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="add-circle-outline" size={size} color={color} />;
}

export function ReelsIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  return <Icon name={filled ? 'play-circle' : 'play-circle-outline'} size={size} color={color} />;
}

export function HeartIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  return <Icon name={filled ? 'heart' : 'heart-outline'} size={size} color={color} />;
}

export function ChatBubbleIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="chatbubble-outline" size={size} color={color} />;
}

export function PaperPlaneIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="paper-plane-outline" size={size} color={color} />;
}

export function CommentIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="chatbubble-outline" size={size} color={color} />;
}

export function BookmarkIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  return <Icon name={filled ? 'bookmark' : 'bookmark-outline'} size={size} color={color} />;
}

export function MenuIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="menu-outline" size={size} color={color} />;
}

export function ChevronLeftIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="chevron-back" size={size} color={color} />;
}

export function CameraIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="camera-outline" size={size} color={color} />;
}

export function PhoneCallIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="call-outline" size={size} color={color} />;
}

export function VideoCameraIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="videocam-outline" size={size} color={color} />;
}

export function MicIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="mic-outline" size={size} color={color} />;
}

export function EndCallIcon({ size = 28, color = '#fff' }: IconProps) {
  return <Icon name="call" size={size} color={color} style={{ transform: [{ rotate: '135deg' }] }} />;
}

export function FlipCameraIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="camera-reverse-outline" size={size} color={color} />;
}

export function QrCodeIcon({ size = 24, color = '#fff' }: IconProps) {
  return <Icon name="qr-code-outline" size={size} color={color} />;
}
