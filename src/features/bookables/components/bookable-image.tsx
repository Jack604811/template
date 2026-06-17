"use client";

import { memo } from "react";
import Image from "next/image";
import { formatBookableImage } from "../lib/utils";

interface BookableImageProps {
  images: unknown;
  alt?: string;
  size?: number;
}

export const BookableImage = memo(({ images, alt = "Bookable", size = 40 }: BookableImageProps) => {
  const imageUrl = formatBookableImage(images);

  if (!imageUrl) {
    return <div style={{ width: size, height: size }} className="shrink-0 bg-muted rounded-lg" />;
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-lg object-cover"
    />
  );
});

BookableImage.displayName = "BookableImage";

