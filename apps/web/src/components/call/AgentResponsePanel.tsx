'use client';

import { Bot, Clock } from 'lucide-react';
import type { AgentResponse } from '@/lib/types';

interface AgentResponsePanelProps {
  responses: AgentResponse[];
  currentChunk: string;
  isSpeaking: boolean;
  agentName?: string;
}

export function AgentResponsePanel({ responses, currentChunk, isSpeaking, agentName = 'Agente' }: AgentResponsePanelProps) {
  const latest = responses[responses.length - 1];
  const history = responses.slice(0, -1).reverse();
  const isStreaming = currentChunk.length > 0;

  return (
    <div className="bg-white rounded-2xl flex flex-col overflow-hidden border border-slate-100 shadow-card">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center">
          <Bot size={11} className="text-indigo-500" />
        </div>
        <h2 className="text-xs font-semibold text-slate-400">{agentName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
        {/* TTS playback indicator */}
        {isSpeaking && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl flex-shrink-0">
            <span className="text-sm animate-pulse">🔊</span>
            <span className="text-xs font-semibold text-indigo-700">{agentName} está hablando...</span>
          </div>
        )}

        {/* Current streaming response */}
        {isStreaming && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 animate-slide-in">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">
                Generando respuesta…
              </span>
            </div>
            <p className="text-sm text-indigo-800 leading-relaxed cursor-blink">
              {currentChunk}
            </p>
          </div>
        )}

        {/* Latest completed response */}
        {!isStreaming && latest && (
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4 animate-slide-in shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={12} className="text-indigo-500" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                Última respuesta
              </span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">{latest.text}</p>
          </div>
        )}

        {/* Empty state */}
        {!isStreaming && !latest && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <Bot size={20} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {agentName} responderá<br />cuando el cliente hable
            </p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Clock size={10} />
              Anteriores
            </p>
            {history.map((r, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100"
              >
                <p className="text-xs text-slate-500 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
