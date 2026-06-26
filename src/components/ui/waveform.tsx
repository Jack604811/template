"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

// ─── Scrolling waveform (real-time visualization) ─────────────────────────────

interface ScrollingWaveformProps {
  height?: number
  barWidth?: number
  barGap?: number
  speed?: number
  fadeEdges?: boolean
  barColor?: string
  className?: string
}

export function ScrollingWaveform({
  height = 80,
  barWidth = 3,
  barGap = 2,
  speed = 30,
  fadeEdges = true,
  barColor = "gray",
  className,
}: ScrollingWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ bars: [] as number[], offset: 0 })
  const rafRef = useRef(0)

  useEffect(() => {
    const canvasOrNull = canvasRef.current
    if (!canvasOrNull) return
    const canvas: HTMLCanvasElement = canvasOrNull
    const ctxOrNull = canvas.getContext("2d")
    if (!ctxOrNull) return
    const ctx: CanvasRenderingContext2D = ctxOrNull

    const step = barWidth + barGap
    const count = Math.ceil(canvas.width / step) + 4

    while (stateRef.current.bars.length < count) {
      stateRef.current.bars.push(Math.random() * 0.8 + 0.1)
    }

    let last = performance.now()

    function draw(now: number) {
      const dt = (now - last) / 1000
      last = now
      const state = stateRef.current
      state.offset += speed * dt

      while (state.offset >= step) {
        state.offset -= step
        state.bars.shift()
        state.bars.push(Math.random() * 0.8 + 0.1)
      }

      const w = canvas.width
      const ch = canvas.height
      ctx.clearRect(0, 0, w, ch)

      const computedColor =
        barColor === "gray"
          ? (getComputedStyle(document.documentElement)
              .getPropertyValue("--muted-foreground")
              .trim() || "#888")
          : barColor

      for (const [i, amp] of state.bars.entries()) {
        const x = i * step - state.offset
        const h = amp * ch
        const y = (ch - h) / 2
        ctx.fillStyle = computedColor
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, h, barWidth / 2)
        ctx.fill()
      }

      if (fadeEdges) {
        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, "rgba(0,0,0,0.95)")
        grad.addColorStop(0.08, "rgba(0,0,0,0)")
        grad.addColorStop(0.92, "rgba(0,0,0,0)")
        grad.addColorStop(1, "rgba(0,0,0,0.95)")
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, ch)
        ctx.globalCompositeOperation = "source-over"
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [barWidth, barGap, speed, fadeEdges, barColor])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      className={cn("w-full", className)}
      style={{ height }}
    />
  )
}

// ─── Static waveform (stereo, seekable) ──────────────────────────────────────

interface StaticWaveformProps {
  bars: number[]
  progress: number
  isUser?: boolean
  onSeek?: (progress: number) => void
  className?: string
}

export function StaticWaveform({
  bars,
  progress,
  isUser,
  onSeek,
  className,
}: StaticWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const maxBar = Math.max(...bars, 1)

  function getProgressFromX(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!onSeek) return
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeek(getProgressFromX(e.clientX))
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!onSeek || !(e.buttons & 1)) return
    onSeek(getProgressFromX(e.clientX))
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-10 items-stretch gap-px",
        onSeek && "cursor-pointer touch-none select-none",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    >
      {bars.map((h, i) => {
        const norm = h / maxBar
        const played = i < progress * bars.length
        const colorClass = played
          ? isUser ? "bg-primary-foreground" : "bg-primary"
          : isUser ? "bg-primary-foreground/25" : "bg-foreground/20"

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: bars are positional and never reorder
          <div key={`bar-${i}`} className="relative" style={{ width: 3 }}>
            {/* Upper arm — grows upward from center */}
            <div
              className={cn("absolute left-0 w-[3px] rounded-t-full", colorClass)}
              style={{
                bottom: "50%",
                height: `${Math.max(norm * 46, 6)}%`,
              }}
            />
            {/* Lower arm — grows downward from center */}
            <div
              className={cn("absolute left-0 w-[3px] rounded-b-full", colorClass)}
              style={{
                top: "50%",
                height: `${Math.max(norm * 34, 5)}%`,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
