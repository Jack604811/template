"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type AgentVisualState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "connecting"
  | "initializing"
  | "disconnected";

export interface AgentAudioVisualizerWaveProps {
  state?: AgentVisualState;
  color?: string;
  colorShift?: number;
  lineWidth?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASS: Record<string, string> = {
  xs: "w-16 h-16",
  sm: "w-24 h-24",
  md: "w-40 h-40",
  lg: "w-60 h-60",
  xl: "w-80 h-80",
};

interface WaveTarget {
  amplitude: number;
  speed: number;
  chaos: number;
  glowOpacity: number;
}

const STATE_TARGETS: Record<string, WaveTarget> = {
  disconnected: { amplitude: 0.00, speed: 0.0, chaos: 0.00, glowOpacity: 0.00 },
  idle:         { amplitude: 0.04, speed: 0.5, chaos: 0.00, glowOpacity: 0.06 },
  connecting:   { amplitude: 0.06, speed: 0.8, chaos: 0.00, glowOpacity: 0.08 },
  initializing: { amplitude: 0.10, speed: 1.0, chaos: 0.10, glowOpacity: 0.10 },
  listening:    { amplitude: 0.22, speed: 1.5, chaos: 0.15, glowOpacity: 0.18 },
  thinking:     { amplitude: 0.14, speed: 1.2, chaos: 0.35, glowOpacity: 0.14 },
  speaking:     { amplitude: 0.42, speed: 2.5, chaos: 0.55, glowOpacity: 0.30 },
};

const WAVE_COUNT = 5;
const LERP_SPEED = 0.045;
const STEP = 2; // px per point — lower = smoother but heavier

function parseHsl(hex: string): { h: number; s: number; l: number } {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s, l };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function AgentAudioVisualizerWave({
  state = "idle",
  color = "#8800ff",
  colorShift = 0.3,
  lineWidth = 2,
  size = "md",
  className,
}: AgentAudioVisualizerWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef(state);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const currentRef = useRef<WaveTarget>({ amplitude: 0, speed: 0, chaos: 0, glowOpacity: 0 });
  const chaosOffsets = useRef(Array.from({ length: WAVE_COUNT }, (_, i) => i * 73.1));

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const base = parseHsl(color);

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas!.width = Math.round(rect.width * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function draw() {
      rafRef.current = requestAnimationFrame(draw);

      const target = STATE_TARGETS[stateRef.current] ?? STATE_TARGETS.idle;
      const cur = currentRef.current;

      cur.amplitude   = lerp(cur.amplitude,   target.amplitude,   LERP_SPEED);
      cur.speed       = lerp(cur.speed,        target.speed,       LERP_SPEED);
      cur.chaos       = lerp(cur.chaos,        target.chaos,       LERP_SPEED);
      cur.glowOpacity = lerp(cur.glowOpacity,  target.glowOpacity, LERP_SPEED);

      timeRef.current += 0.016 * Math.max(cur.speed, 0.01);

      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) return;

      ctx!.clearRect(0, 0, w, h);

      // Radial glow background
      if (cur.glowOpacity > 0.005) {
        const grad = ctx!.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.55);
        grad.addColorStop(0, `hsla(${base.h * 360}, ${base.s * 100}%, ${base.l * 100}%, ${cur.glowOpacity})`);
        grad.addColorStop(1, "transparent");
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);
      }

      for (let i = 0; i < WAVE_COUNT; i++) {
        const progress = i / (WAVE_COUNT - 1);

        // Each wave shifts hue slightly and fades toward the back
        const hDeg = ((base.h + colorShift * progress) % 1) * 360;
        const sDeg = base.s * 100;
        const lDeg = base.l * 100;
        const opacity = 0.25 + (1 - progress) * 0.65;
        const waveLineWidth = lineWidth * (1 - progress * 0.35);

        // Chaos perturbation (secondary oscillation)
        chaosOffsets.current[i] += 0.008 * cur.chaos;
        const chaosMod = cur.chaos > 0.01
          ? 1 + cur.chaos * 0.4 * Math.sin(timeRef.current * 3.1 + chaosOffsets.current[i])
          : 1;

        const amplitudePx = cur.amplitude * h * (0.85 - progress * 0.25) * chaosMod;
        const frequency = 1.5 + i * 0.4;
        const phaseShift = (i / WAVE_COUNT) * Math.PI * 2;

        ctx!.beginPath();
        ctx!.lineWidth = waveLineWidth;
        ctx!.strokeStyle = `hsla(${hDeg}, ${sDeg}%, ${lDeg}%, ${opacity})`;
        ctx!.lineJoin = "round";
        ctx!.lineCap = "round";

        for (let x = 0; x <= w; x += STEP) {
          const nx = x / w;
          const y = h / 2 + amplitudePx * Math.sin(nx * Math.PI * 2 * frequency + timeRef.current + phaseShift);
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }

        ctx!.stroke();
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [color, colorShift, lineWidth]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(SIZE_CLASS[size] ?? SIZE_CLASS.md, "block", className)}
    />
  );
}
