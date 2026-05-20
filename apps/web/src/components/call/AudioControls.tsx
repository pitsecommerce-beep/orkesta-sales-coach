'use client';

import { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Monitor, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioControlsProps {
  isCallActive: boolean;
  isRecording: boolean;
  audioError: string | null;
  duration: number;
  onStartCall: (withSystemAudio: boolean) => Promise<void>;
  onEndCall: () => Promise<void>;
}

export function AudioControls({
  isCallActive,
  isRecording,
  audioError,
  duration,
  onStartCall,
  onEndCall,
}: AudioControlsProps) {
  const [loading, setLoading] = useState(false);
  const [withSystemAudio, setWithSystemAudio] = useState(false);

  const mm = Math.floor(duration / 60).toString().padStart(2, '0');
  const ss = (duration % 60).toString().padStart(2, '0');

  const handleStart = async () => {
    setLoading(true);
    try {
      await onStartCall(withSystemAudio);
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    setLoading(true);
    try {
      await onEndCall();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 shadow-card rounded-2xl px-5 py-3.5 flex items-center justify-between">
      {/* Left: status */}
      <div className="flex items-center gap-3">
        {isRecording ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <Mic size={16} className="animate-pulse" />
            <span className="text-sm font-medium">Micrófono activo</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <MicOff size={16} />
            <span className="text-sm">Micrófono inactivo</span>
          </div>
        )}

        {audioError && (
          <div className="flex items-center gap-1.5 text-rose-500 text-xs">
            <AlertCircle size={12} />
            {audioError}
          </div>
        )}
      </div>

      {/* Center: timer */}
      {isCallActive && (
        <div className="font-mono text-lg text-slate-700 font-semibold tabular-nums tracking-tight">
          {mm}:{ss}
        </div>
      )}

      {/* Right: controls */}
      <div className="flex items-center gap-3">
        {!isCallActive && (
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors duration-150">
            <input
              type="checkbox"
              checked={withSystemAudio}
              onChange={(e) => setWithSystemAudio(e.target.checked)}
              className="rounded border-slate-300 bg-white text-indigo-500 focus:ring-indigo-400 focus:ring-offset-0 transition-colors duration-150"
            />
            <Monitor size={12} />
            Capturar audio del sistema
          </label>
        )}

        {isCallActive ? (
          <button
            onClick={handleEnd}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 hover:border-rose-200',
              loading && 'opacity-60 cursor-not-allowed',
            )}
          >
            <PhoneOff size={15} />
            Terminar llamada
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/25 hover:shadow-md hover:shadow-emerald-500/30',
              loading && 'opacity-60 cursor-not-allowed',
            )}
          >
            <Phone size={15} />
            {loading ? 'Iniciando…' : 'Iniciar llamada'}
          </button>
        )}
      </div>
    </div>
  );
}
