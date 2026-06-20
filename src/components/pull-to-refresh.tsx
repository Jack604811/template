"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const INDICATOR_H = 52;
const THRESHOLD = 80;

type Phase = "idle" | "pulling" | "ready" | "refreshing" | "done";

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ progress, phase }: { progress: number; phase: Phase }) {
  const r = 11;
  const circ = 2 * Math.PI * r;
  const isSpinning = phase === "refreshing";
  const isDone = phase === "done";
  const arc = isSpinning ? circ * 0.72 : progress * circ;

  return (
    <div
      className={cn(
        "flex size-9 items-center justify-center rounded-full",
        "bg-background border border-border/40 shadow-[0_2px_12px_rgba(0,0,0,0.10)]",
        "transition-transform duration-100",
        phase === "ready" && "scale-110",
      )}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 26 26"
        fill="none"
        className={cn(isSpinning && "animate-spin")}
        style={isSpinning ? { animationDuration: "0.75s" } : undefined}
      >
        <circle cx="13" cy="13" r={r} stroke="currentColor" strokeOpacity={0.12} strokeWidth="2.5" />
        {!isDone && (
          <circle
            cx="13" cy="13" r={r}
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circ}`}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        )}
        {isDone && (
          <polyline
            points="6,13 11,18 20,8"
            stroke="hsl(var(--primary))"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

// ─── Scroll detection ─────────────────────────────────────────────────────────

function findMaxScrollTop(el: Element): number {
  const { overflowY } = getComputedStyle(el);
  let max = 0;
  if (
    (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
    el.scrollHeight > el.clientHeight + 1
  ) {
    max = (el as HTMLElement).scrollTop;
  }
  for (const child of el.children) {
    const childMax = findMaxScrollTop(child);
    if (childMax > max) max = childMax;
  }
  return max;
}

// ─── PullToRefresh ────────────────────────────────────────────────────────────

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, className, disabled }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [push, setPush] = useState(0);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [settling, setSettling] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  const disabledRef = useRef(disabled);
  useEffect(() => { disabledRef.current = disabled; }, [disabled]);

  const phaseRef = useRef<Phase>("idle");
  const syncPhase = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const snapBack = useCallback(() => {
    setSettling(true);
    setPush(0);
    setProgress(0);
    setTimeout(() => {
      syncPhase("idle");
      setSettling(false);
    }, 420);
  }, []);

  const runRefresh = useCallback(async () => {
    syncPhase("refreshing");
    setSettling(true);
    setPush(INDICATOR_H);
    try { await onRefreshRef.current(); } catch { /* ignore */ }
    syncPhase("done");
    await new Promise((r) => setTimeout(r, 620));
    snapBack();
  }, [snapBack]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startY = 0;
    let startScrollTop = 0;
    let active = false;
    let rawDy = 0;

    function onTouchStart(e: TouchEvent) {
      if (disabledRef.current) return;
      if (phaseRef.current === "refreshing" || phaseRef.current === "done") return;
      startY = e.touches[0].clientY;
      startScrollTop = findMaxScrollTop(el as Element);
      active = false;
      rawDy = 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (disabledRef.current) return;
      if (phaseRef.current === "refreshing" || phaseRef.current === "done") return;
      if (startScrollTop > 1) return;

      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) return;
      if (!active && dy < 12) return;

      active = true;
      rawDy = dy;
      e.preventDefault();

      const eased = dy < THRESHOLD
        ? (dy / THRESHOLD) * INDICATOR_H
        : INDICATOR_H + (dy - THRESHOLD) * 0.06;
      const capped = Math.min(eased, INDICATOR_H + 6);
      const prog = Math.min(dy / THRESHOLD, 1);

      setPush(capped);
      setProgress(prog);
      syncPhase(prog >= 1 ? "ready" : "pulling");
      setSettling(false);
    }

    function onTouchEnd() {
      if (!active) return;
      active = false;
      if (rawDy >= THRESHOLD * 0.8) {
        runRefresh();
      } else {
        snapBack();
      }
      rawDy = 0;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [runRefresh, snapBack]);

  const spring = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center"
        style={{
          height: INDICATOR_H,
          transform: `translateY(${push - INDICATOR_H}px)`,
          transition: settling ? spring : "none",
        }}
      >
        {phase !== "idle" && <Spinner progress={progress} phase={phase} />}
      </div>
      <div
        className="h-full"
        style={{
          transform: `translateY(${push}px)`,
          transition: settling ? spring : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────

export function LayoutPullToRefresh({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  async function handleRefresh() {
    await queryClient.refetchQueries({ type: "active" });
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="flex flex-1 flex-col">
      {children}
    </PullToRefresh>
  );
}
