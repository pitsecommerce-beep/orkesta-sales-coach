'use client';

import { useRef, useState, useCallback } from 'react';

interface UseAudioCaptureOptions {
  onChunk: (data: ArrayBuffer) => void;
  timeslice?: number;
}

export function useAudioCapture({ onChunk, timeslice = 250 }: UseAudioCaptureOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startCapture = useCallback(
    async (captureSystemAudio = false) => {
      setError(null);

      try {
        const streams: MediaStream[] = [];

        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
          video: false,
        });
        streams.push(micStream);

        if (captureSystemAudio) {
          // Captures system audio (client voice via speakers) + screen video (discarded)
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true,
          });
          // Stop video tracks immediately, we only need audio
          displayStream.getVideoTracks().forEach((t) => t.stop());
          if (displayStream.getAudioTracks().length > 0) {
            streams.push(displayStream);
          }
        }

        streamsRef.current = streams;

        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;
        const destination = audioCtx.createMediaStreamDestination();

        for (const stream of streams) {
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(destination);
        }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        const recorder = new MediaRecorder(destination.stream, {
          mimeType,
          audioBitsPerSecond: 32000,
        });

        // Gate prevents chunks from being sent before the server processes start_session
        let gateOpen = false;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && gateOpen) {
            e.data.arrayBuffer().then(onChunk);
          }
        };

        recorder.start(timeslice);
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        gateOpen = true;
        recorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al acceder al micrófono';
        setError(msg);
      }
    },
    [onChunk, timeslice],
  );

  const stopCapture = useCallback(() => {
    recorderRef.current?.stop();
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    audioCtxRef.current?.close();
    streamsRef.current = [];
    recorderRef.current = null;
    audioCtxRef.current = null;
    setIsRecording(false);
  }, []);

  return { isRecording, error, startCapture, stopCapture };
}
