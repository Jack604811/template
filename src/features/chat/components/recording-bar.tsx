"use client";

import { SquareIcon, Trash2Icon } from "lucide-react";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { formatDuration } from "./use-voice-recorder";

interface RecordingBarProps {
  duration: number;
  analyserRef: React.RefObject<AnalyserNode | null>;
  onCancel: () => void;
  onStop: () => void;
}

export function RecordingBar({ duration, analyserRef, onCancel, onStop }: RecordingBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2.5">
      <button
        type="button"
        onClick={onCancel}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Cancelar grabación"
      >
        <Trash2Icon className="size-4" />
      </button>

      <LiveWaveform
        analyserRef={analyserRef}
        height={32}
        barWidth={3}
        barGap={2}
        speed={35}
        fadeEdges={true}
        barColor="primary"
        mode="scrolling"
        className="flex-1"
      />

      <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
        {formatDuration(duration)}
      </span>

      <button
        type="button"
        onClick={onStop}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        aria-label="Detener y enviar"
      >
        <SquareIcon className="size-[14px] fill-current" />
      </button>
    </div>
  );
}
