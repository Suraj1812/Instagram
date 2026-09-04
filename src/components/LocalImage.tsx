import React from 'react';
import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

interface Props {
  path?: string;
  style?: StyleProp<ImageStyle>;
  priority?: 'low' | 'normal' | 'high';
  contentFit?: 'cover' | 'contain';
}

/**
 * There's no network image anywhere in this app — every image is a file on
 * device storage (bundled seed asset copied in at first launch, or media the
 * user captured/picked). expo-image still gives us memory+disk caching and
 * downsampled decoding, which matters once the grid has hundreds of local
 * files to recycle through.
 */
export function LocalImage({ path, style, priority = 'normal', contentFit = 'cover' }: Props) {
  if (!path) return <Image source={undefined} style={style} />;
  const uri = path.startsWith('file://') || path.startsWith('http') ? path : `file://${path}`;
  return (
    <Image
      source={{ uri }}
      contentFit={contentFit}
      transition={120}
      cachePolicy="memory-disk"
      priority={priority}
      style={style}
      recyclingKey={path}
    />
  );
}
