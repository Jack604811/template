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
    return <div className="w-10 h-10 bg-muted rounded" />;
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={size}
      height={size}
      className="rounded object-cover"
    />
  );
});

BookableImage.displayName = "BookableImage";

