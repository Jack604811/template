"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { PauseIcon, PlayIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ButtonProps = React.ComponentProps<typeof Button>
import { Slider } from "@/components/ui/slider"

// ─── Speed preference ─────────────────────────────────────────────────────────

export const AUDIO_SPEEDS = [1, 1.5, 2] as const
export type AudioSpeed = (typeof AUDIO_SPEEDS)[number]

export function getStoredAudioSpeed(): AudioSpeed {
  if (typeof window === "undefined") return 1
  const v = parseFloat(localStorage.getItem("audio-speed-preference") ?? "1")
  return (AUDIO_SPEEDS.includes(v as AudioSpeed) ? v : 1) as AudioSpeed
}

export function storeAudioSpeed(s: AudioSpeed) {
  localStorage.setItem("audio-speed-preference", String(s))
}

export function nextAudioSpeed(current: AudioSpeed): AudioSpeed {
  const idx = AUDIO_SPEEDS.indexOf(current)
  return AUDIO_SPEEDS[(idx + 1) % AUDIO_SPEEDS.length]
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface AudioItem<T = unknown> {
  id: string
  src: string
  data?: T
}

export interface AudioPlayerState<T = unknown> {
  activeItem: AudioItem<T> | null
  isPlaying: boolean
  currentTime: number
  duration: number
  progress: number
  speed: AudioSpeed
  play: (item: AudioItem<T>) => void
  pause: () => void
  toggle: () => void
  seek: (progress: number) => void
  cycleSpeed: () => void
  isItemActive: (id: string) => boolean
}

const AudioPlayerContext = createContext<AudioPlayerState | null>(null)

export function AudioPlayerProvider<T = unknown>({
  children,
}: {
  children: ReactNode
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [activeItem, setActiveItem] = useState<AudioItem<T> | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState<AudioSpeed>(getStoredAudioSpeed)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onTime = () => setCurrentTime(audio.currentTime)
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0)
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0) }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("durationchange", onDuration)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)

    return () => {
      audio.pause()
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("durationchange", onDuration)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  const play = useCallback((item: AudioItem<T>) => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.src !== item.src) {
      audio.src = item.src
      setCurrentTime(0)
      setDuration(0)
    }
    setActiveItem(item)
    void audio.play()
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else void audio.play()
  }, [isPlaying])

  const seek = useCallback((progress: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = progress * audio.duration
  }, [])

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const next = nextAudioSpeed(prev)
      storeAudioSpeed(next)
      if (audioRef.current) audioRef.current.playbackRate = next
      return next
    })
  }, [])

  const isItemActive = useCallback(
    (id: string) => activeItem?.id === id,
    [activeItem],
  )

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <AudioPlayerContext.Provider
      value={{
        activeItem: activeItem as AudioItem,
        isPlaying,
        currentTime,
        duration,
        progress,
        speed,
        play: play as (item: AudioItem) => void,
        pause,
        toggle,
        seek,
        cycleSpeed,
        isItemActive,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer<T = unknown>() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider")
  return ctx as AudioPlayerState<T>
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatAudioTime(seconds: number) {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

// ─── UI components ────────────────────────────────────────────────────────────

export function AudioPlayerButton({
  className,
  ...props
}: Omit<ButtonProps, "onClick" | "children">) {
  const player = useAudioPlayer()
  return (
    <Button
      onClick={player.toggle}
      className={cn("rounded-full", className)}
      {...props}
    >
      {player.isPlaying ? <PauseIcon /> : <PlayIcon />}
    </Button>
  )
}

export function AudioPlayerProgress({ className }: { className?: string }) {
  const player = useAudioPlayer()
  return (
    <Slider
      value={[player.progress * 100]}
      onValueChange={([v]) => player.seek(v / 100)}
      max={100}
      step={0.1}
      className={cn("w-full", className)}
    />
  )
}

export function AudioPlayerTime({ className }: { className?: string }) {
  const { currentTime } = useAudioPlayer()
  return <span className={className}>{formatAudioTime(currentTime)}</span>
}

export function AudioPlayerDuration({ className }: { className?: string }) {
  const { duration } = useAudioPlayer()
  return <span className={className}>{formatAudioTime(duration)}</span>
}

export function AudioPlayerSpeed({
  className,
  ...props
}: Omit<ButtonProps, "onClick" | "children">) {
  const { speed, cycleSpeed } = useAudioPlayer()
  return (
    <Button
      onClick={cycleSpeed}
      className={cn("tabular-nums", className)}
      {...props}
    >
      {speed}x
    </Button>
  )
}

// ─── Example tracks ───────────────────────────────────────────────────────────

export const exampleTracks = [
  {
    id: "1",
    name: "Acoustic Breeze",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "2",
    name: "Electronic Pulse",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "3",
    name: "Ambient Flow",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "4",
    name: "Jazz Groove",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  },
]
