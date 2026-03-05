"use client";

import type { ReactNode, Ref } from "react";
import { memo, useRef, useEffect } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";


export const BorderBeam = memo(({
  children,
  duration = 2000,
  rx,
  ry,
  ...otherProps
}: {
  children: ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: unknown;
}) => {
  const pathRef = useRef<SVGGeometryElement>(null);
  const progress = useMotionValue(0);
  const durationRef = useRef(duration);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length && durationRef.current > 0) {
      const pxPerMillisecond = length / durationRef.current;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val)?.x ?? 0,
  );
  const y = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val)?.y ?? 0,
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative border animation */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef as Ref<SVGRectElement>}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
});

BorderBeam.displayName = "BorderBeam";
