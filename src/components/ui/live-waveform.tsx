"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface LiveWaveformProps {
  /** External analyser from useVoiceRecorder — skips own getUserMedia when provided. */
  analyserRef?: React.RefObject<AnalyserNode | null>
  active?: boolean
  processing?: boolean
  height?: number
  barWidth?: number
  barGap?: number
  speed?: number
  fadeEdges?: boolean
  barColor?: string
  historySize?: number
  mode?: "static" | "scrolling"
  className?: string
}

function resolveCssColor(token: string): string {
  if (token === "gray") {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim()
    return v ? `hsl(${v})` : "#888"
  }
  if (token === "primary") {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
    return v ? `hsl(${v})` : "#6366f1"
  }
  return token
}

export function LiveWaveform({
  analyserRef: externalAnalyserRef,
  active = false,
  processing = false,
  height = 40,
  barWidth = 3,
  barGap = 2,
  speed = 35,
  fadeEdges = true,
  barColor = "gray",
  historySize = 80,
  mode = "scrolling",
  className,
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Stable ref written by lifecycle effects; draw loop reads only from this.
  const activeAnalyserRef = useRef<AnalyserNode | null>(null)
  const ownStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // ── Sync external analyser into activeAnalyserRef ─────────────────────────
  useEffect(() => {
    if (!externalAnalyserRef) return
    activeAnalyserRef.current = externalAnalyserRef.current
    return () => { activeAnalyserRef.current = null }
  }, [externalAnalyserRef])

  // ── Own mic lifecycle (only when no external analyser is provided) ─────────
  useEffect(() => {
    if (externalAnalyserRef) return

    if (!active) {
      activeAnalyserRef.current = null
      ownStreamRef.current?.getTracks().forEach((t) => { t.stop() })
      ownStreamRef.current = null
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      return
    }

    let cancelled = false
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((t) => { t.stop() }); return }
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      ownStreamRef.current = stream
      audioCtxRef.current = ctx
      activeAnalyserRef.current = analyser
    }).catch(() => {})

    return () => {
      cancelled = true
      activeAnalyserRef.current = null
      ownStreamRef.current?.getTracks().forEach((t) => { t.stop() })
      ownStreamRef.current = null
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [active, externalAnalyserRef])

  // ── Canvas draw loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const ctxOrNull = canvasEl.getContext("2d")
    if (!ctxOrNull) return
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = ctxOrNull

    const step = barWidth + barGap

    // Scrolling mode state
    const scrollBars: number[] = Array(Math.ceil(canvas.width / step) + 4).fill(0.04)
    let scrollOffset = 0

    // Static mode state
    const staticHistory: number[] = Array(historySize).fill(0.04)
    let staticAccum = 0
    const staticInterval = 1 / (speed / step)

    let last = performance.now()
    let raf: number
    const dataArray = new Uint8Array(128)

    function getSample(now: number): number {
      const analyser = activeAnalyserRef.current
      if (analyser) {
        analyser.getByteTimeDomainData(dataArray)
        let sum = 0
        for (const v of dataArray) sum += (v - 128) ** 2
        return Math.min(Math.sqrt(sum / dataArray.length) / 38, 1)
      }
      if (processing) {
        return 0.28 + 0.22 * Math.sin(now / 260)
      }
      return 0.04
    }

    function drawBars(barsArr: number[], startX: number, spacing: number, ch: number, color: string) {
      ctx.fillStyle = color
      for (let i = 0; i < barsArr.length; i++) {
        const x = startX + i * spacing
        if (x + barWidth < 0 || x > canvas.width) continue
        const h = Math.max(barsArr[i] * ch, 3)
        const y = (ch - h) / 2
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, h, barWidth / 2)
        ctx.fill()
      }
    }

    function draw(now: number) {
      const dt = (now - last) / 1000
      last = now
      const w = canvas.width
      const ch = canvas.height
      ctx.clearRect(0, 0, w, ch)

      const color = resolveCssColor(barColor)

      if (mode === "scrolling") {
        scrollOffset += speed * dt
        while (scrollOffset >= step) {
          scrollOffset -= step
          scrollBars.shift()
          scrollBars.push(getSample(now))
        }
        drawBars(scrollBars, -scrollOffset, step, ch, color)
      } else {
        // Static: accumulate samples at fixed rate, spread across full width
        staticAccum += dt
        while (staticAccum >= staticInterval) {
          staticAccum -= staticInterval
          staticHistory.shift()
          staticHistory.push(getSample(now))
        }
        const slotWidth = w / historySize
        drawBars(staticHistory, slotWidth / 2 - barWidth / 2, slotWidth, ch, color)
      }

      if (fadeEdges) {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, 0)
        grad.addColorStop(0, "rgba(0,0,0,0.95)")
        grad.addColorStop(0.08, "rgba(0,0,0,0)")
        grad.addColorStop(0.92, "rgba(0,0,0,0)")
        grad.addColorStop(1, "rgba(0,0,0,0.95)")
        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, ch)
        ctx.globalCompositeOperation = "source-over"
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [barWidth, barGap, speed, fadeEdges, barColor, historySize, mode, processing])

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      className={cn("min-w-0 w-full", className)}
      style={{ height }}
    />
  )
}
