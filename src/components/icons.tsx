import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polygon } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

/**
 * All icons below are original line-art, drawn stroke-by-stroke to match the
 * general weight/rounding of familiar social-app nav bars — no traced or
 * copied vector paths from any existing app's asset files.
 */

export function HomeIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {filled ? (
        <Path d="M12 2.5 2.5 10.5V21a1 1 0 0 0 1 1H9v-7h6v7h5.5a1 1 0 0 0 1-1V10.5L12 2.5Z" fill={color} />
      ) : (
        <Path
          d="M3.5 10.8 12 3.5l8.5 7.3V20a1 1 0 0 1-1 1h-4.75a.5.5 0 0 1-.5-.5V15a2.25 2.25 0 0 0-4.5 0v5.5a.5.5 0 0 1-.5.5H4.5a1 1 0 0 1-1-1v-9.2Z"
          stroke={color} strokeWidth={1.8} strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

export function SearchIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={10.5} cy={10.5} r={7} stroke={color} strokeWidth={1.8} />
      <Line x1={20.5} y1={20.5} x2={15.8} y2={15.8} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusSquareIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={5} stroke={color} strokeWidth={1.8} />
      <Line x1={12} y1={7.5} x2={12} y2={16.5} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={7.5} y1={12} x2={16.5} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ReelsIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={3.5} width={19} height={17} rx={4} stroke={color} strokeWidth={1.8} fill={filled ? color : 'none'} />
      <Path d="M8 3.5 11 8.2M15.5 3.5 18.5 8.2" stroke={filled ? '#000' : color} strokeWidth={1.6} strokeLinecap="round" />
      <Polygon points="10.2,11.3 15.3,14 10.2,16.7" fill={filled ? '#000' : color} />
    </Svg>
  );
}

export function HeartIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  const path = 'M12 20.2s-7.6-4.6-10-9.4C.5 7.4 2.2 4 5.7 3.4c2.1-.3 4 .6 5.1 2.3l1.2 1.8 1.2-1.8c1.1-1.7 3-2.6 5.1-2.3 3.5.6 5.2 4 3.7 7.4-2.4 4.8-10 9.4-10 9.4Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={path} stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={filled ? color : 'none'} />
    </Svg>
  );
}

export function ChatBubbleIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5c-5 0-9 3.4-9 7.6 0 2.4 1.3 4.5 3.4 5.9-.2 1.2-.7 2.4-1.5 3.4 1.6-.2 3.1-.8 4.3-1.7.9.3 1.8.4 2.8.4 5 0 9-3.4 9-7.6s-4-8-9-8Z"
        stroke={color} strokeWidth={1.8} strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PaperPlaneIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21.5 2.5 2.8 10.2c-.7.3-.6 1.3.1 1.5l6.6 1.9 1.9 6.6c.2.7 1.2.8 1.5.1L21.5 2.5Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Line x1={9.5} y1={13.6} x2={21.5} y2={2.5} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function CommentIcon({ size = 24, color = '#fff' }: IconProps) {
  return <ChatBubbleIcon size={size} color={color} />;
}

export function BookmarkIcon({ size = 24, color = '#fff', filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={filled ? color : 'none'} />
    </Svg>
  );
}

export function MenuIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 4.5 7.5 12l7.5 7.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l.9-1.6A1 1 0 0 1 8.5 5h7a1 1 0 0 1 .9.6L17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={12} cy={13} r={3.4} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function PhoneCallIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.6 10.8c1.3 2.6 3.4 4.6 5.9 5.9l2-2a1 1 0 0 1 1-.2c1.1.4 2.3.6 3.5.6a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1C10.7 20 4 13.3 4 5a1 1 0 0 1 1-1h2.9a1 1 0 0 1 1 1c0 1.2.2 2.4.6 3.5a1 1 0 0 1-.2 1l-2 2.3Z"
        stroke={color} strokeWidth={1.8} strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VideoCameraIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.5} y={6.5} width={13} height={11} rx={2.2} stroke={color} strokeWidth={1.8} />
      <Path d="M15.5 10.8 21 8v8l-5.5-2.8" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function MicIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={2.5} width={6} height={11} rx={3} stroke={color} strokeWidth={1.8} />
      <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function EndCallIcon({ size = 28, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12.5c3.2-3.4 6.4-5 10-5s6.8 1.6 10 5c.5.5.5 1.4-.2 1.8l-3 2c-.5.3-1.1.2-1.5-.2l-1.7-1.8a1 1 0 0 0-1.1-.2c-1.5.6-3.1.6-4.6 0a1 1 0 0 0-1.1.2l-1.7 1.8c-.4.4-1 .5-1.5.2l-3-2c-.7-.4-.7-1.3-.2-1.8Z"
        fill={color} transform="rotate(135 12 12)"
      />
    </Svg>
  );
}

export function FlipCameraIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M9 13a3 3 0 0 1 5.5-1.7M15 13a3 3 0 0 1-5.5 1.7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

export function QrCodeIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={1.7} />
      <Rect x={14} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={1.7} />
      <Rect x={3} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={1.7} />
      <Rect x={14.5} y={14.5} width={2.5} height={2.5} fill={color} />
      <Rect x={18.5} y={14.5} width={2.5} height={2.5} fill={color} />
      <Rect x={14.5} y={18.5} width={2.5} height={2.5} fill={color} />
      <Rect x={18.5} y={18.5} width={2.5} height={2.5} fill={color} />
    </Svg>
  );
}
