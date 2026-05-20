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
    <div className="bg-[#0a1628] border border-slate-800/60 rounded-xl px-5 py-3 flex items-center justify-between">
      {/* Left: status */}
      <div className="flex items-center gap-3">
        {isRecording ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <Mic size={16} className="animate-pulse" />
            <span className="text-sm font-medium">Micrófono activo</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-500">
            <MicOff size={16} />
            <span className="text-sm">Micrófono inactivo</span>
          </div>
        )}

        {audioError && (
          <div className="flex items-center gap-1.5 text-red-400 text-xs">
            <AlertCircle size={12} />
            {audioError}
          </div>
        )}
      </div>

      {/* Center: timer */}
      {isCallActive && (
        <div className="font-mono text-lg text-white tabular-nums">
          {mm}:{ss}
        </div>
      )}

      {/* Right: controls */}
      <div className="flex items-center gap-3">
        {!isCallActive && (
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withSystemAudio}
              onChange={(e) => setWithSystemAudio(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
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
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
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
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20',
              loading && 'opacity-60 cursor-not-allowed',
            )}
          >
            <Phone size={15} />
            {loading ? 'Iniciando...' : 'Iniciar llamada'}
          </button>
        )}
      </div>
    </div>
  );
}
