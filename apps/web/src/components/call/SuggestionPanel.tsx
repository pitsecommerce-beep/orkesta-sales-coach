'use client';

import { Sparkles, Clock } from 'lucide-react';
import type { Suggestion } from '@/lib/types';

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  currentSuggestion: string;
}

export function SuggestionPanel({ suggestions, currentSuggestion }: SuggestionPanelProps) {
  const latest = suggestions[suggestions.length - 1];
  const history = suggestions.slice(0, -1).reverse();
  const isStreaming = currentSuggestion.length > 0;

  return (
    <div className="bg-[#0d1b2e] rounded-xl flex flex-col overflow-hidden border border-slate-800/60">
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
        <Sparkles size={14} className="text-violet-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          AI Coach
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
        {/* Current streaming suggestion */}
        {isStreaming && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 animate-slide-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                Generando respuesta...
              </span>
            </div>
            <p className="text-sm text-violet-100 leading-relaxed cursor-blink">
              {currentSuggestion}
            </p>
          </div>
        )}

        {/* Latest completed suggestion */}
        {!isStreaming && latest && (
          <div className="bg-gradient-to-br from-violet-500/15 to-indigo-500/10 border border-violet-500/30 rounded-xl p-4 animate-slide-in">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={12} className="text-violet-400" />
              <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
                Di esto ahora
              </span>
            </div>
            <p className="text-sm text-white leading-relaxed font-medium">{latest.text}</p>
          </div>
        )}

        {/* Empty state */}
        {!isStreaming && !latest && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <Sparkles size={24} className="text-slate-700" />
            <p className="text-sm text-slate-600">
              Las sugerencias aparecerán<br />cuando el cliente hable
            </p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock size={10} />
              Anteriores
            </p>
            {history.map((s, i) => (
              <div
                key={i}
                className="bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/40"
              >
                <p className="text-xs text-slate-400 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
