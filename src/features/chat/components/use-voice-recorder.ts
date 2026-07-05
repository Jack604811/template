"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecordState = "idle" | "requesting" | "recording";

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function useVoiceRecorder(onStop: (file: File) => void) {
  const [state, setState] = useState<RecordState>("idle");
  const [duration, setDuration] = useState(0);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create AudioContext immediately after getUserMedia (still in the user-gesture
      // async chain) so Chrome doesn't suspend it.
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/mp4";
      mimeTypeRef.current = mimeType;

      const mr = new MediaRecorder(stream, { mimeType });
      mrRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        const ext = mimeTypeRef.current.includes("ogg") ? "ogg"
          : mimeTypeRef.current.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeTypeRef.current });
        onStopRef.current(file);
        stream.getTracks().forEach((t) => { t.stop(); });
      };

      mr.start(100);
      setState("recording");

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } catch {
      setState("idle");
    }
  }, [state]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    const mr = mrRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    mrRef.current = null;
    setState("idle");
    setDuration(0);
  }, []);

  const cancel = useCallback(() => {
    clearInterval(timerRef.current);
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    const mr = mrRef.current;
    if (mr) {
      mr.ondataavailable = null;
      mr.onstop = null;
      if (mr.state !== "inactive") mr.stop();
      mrRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => { t.stop(); });
    streamRef.current = null;
    setState("idle");
    setDuration(0);
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { state, duration, start, stop, cancel, analyserRef };
}
