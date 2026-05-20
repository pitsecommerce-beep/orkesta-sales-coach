'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { TranscriptEntry } from '@/lib/types';

interface TranscriptFeedProps {
  entries: TranscriptEntry[];
  liveText?: string;
  liveSpeaker?: 'seller' | 'client';
  isActive: boolean;
}

export function TranscriptFeed({ entries, liveText, liveSpeaker, isActive }: TranscriptFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, liveText]);

  return (
    <div className="bg-[#0d1b2e] rounded-xl flex flex-col overflow-hidden border border-slate-800/60">
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Transcripción en vivo
        </h2>
        {isActive && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            En vivo
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {entries.length === 0 && !isActive && (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            La transcripción aparecerá aquí durante la llamada
          </div>
        )}

        {entries.length === 0 && isActive && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Escuchando...
          </div>
        )}

        {entries.map((entry, i) => (
          <TranscriptBubble key={i} entry={entry} />
        ))}

        {/* Live interim text */}
        {liveText && (
          <div
            className={cn(
              'animate-slide-in',
              liveSpeaker === 'client' ? 'flex justify-start' : 'flex justify-end',
            )}
          >
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-xl text-sm opacity-60',
                liveSpeaker === 'client'
                  ? 'bg-slate-700 text-slate-300'
                  : 'bg-sky-900/40 text-sky-200',
              )}
            >
              <span className="cursor-blink">{liveText}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isSeller = entry.speaker === 'seller';

  return (
    <div className={cn('flex animate-slide-in', isSeller ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[80%]">
        <p
          className={cn(
            'text-[10px] font-medium mb-1',
            isSeller ? 'text-right text-sky-500' : 'text-left text-amber-500',
          )}
        >
          {isSeller ? 'TÚ' : 'CLIENTE'}
        </p>
        <div
          className={cn(
            'px-3 py-2 rounded-xl text-sm leading-relaxed',
            isSeller
              ? 'bg-sky-500/10 text-sky-100 border border-sky-500/20'
              : 'bg-slate-700/60 text-slate-200 border border-slate-600/40',
          )}
        >
          {entry.text}
        </div>
      </div>
    </div>
  );
}
