'use client';

import { useState, useTransition, KeyboardEvent } from 'react';
import { Bot, Volume2, Loader2, CheckCircle2, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateSellerAgentConfig } from '@/app/actions';
import type { AgentConfig, Seller } from '@/lib/types';

const TTS_VOICES = [
  { value: 'aura-asteria-es', label: 'Valeria', description: 'Femenino · Natural' },
  { value: 'aura-orion-es', label: 'Orion', description: 'Masculino · Profesional' },
  { value: 'aura-luna-es', label: 'Luna', description: 'Femenino · Cálido' },
] as const;

const LANGUAGE_STYLES = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'tecnico', label: 'Técnico' },
] as const;

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:bg-white focus-within:border-indigo-300 transition-colors">
      {value.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-indigo-400 hover:text-indigo-700 transition-colors"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
        placeholder={value.length === 0 ? placeholder : 'Agregar...'}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      {inputValue.trim() && (
        <button
          type="button"
          onClick={() => addTag(inputValue)}
          className="text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

interface AgentConfigFormProps {
  seller: Seller;
}

export function AgentConfigForm({ seller }: AgentConfigFormProps) {
  const initial = seller.agent_config ?? {};
  const [personaName, setPersonaName] = useState(initial.persona_name ?? '');
  const [ttsVoice, setTtsVoice] = useState<string>(initial.tts_voice ?? 'aura-asteria-es');
  const [personality, setPersonality] = useState(initial.personality ?? '');
  const [languageStyle, setLanguageStyle] = useState<AgentConfig['language_style']>(
    initial.language_style ?? 'formal',
  );
  const [salesMethodology, setSalesMethodology] = useState(initial.sales_methodology ?? '');
  const [forbiddenTopics, setForbiddenTopics] = useState<string[]>(initial.forbidden_topics ?? []);
  const [escalationTriggers, setEscalationTriggers] = useState<string[]>(
    initial.escalation_triggers ?? [],
  );

  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_API_WS_URL ?? 'ws://localhost:3001/ws')
    .replace(/^ws:/, 'http:')
    .replace(/^wss:/, 'https:')
    .replace(/\/ws$/, '');

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const previewText = personaName
        ? `Hola, soy ${personaName}, tu asistente de ventas.`
        : 'Hola, soy tu asistente de ventas.';
      const url = `${apiBase}/tts-preview?text=${encodeURIComponent(previewText)}&voice=${encodeURIComponent(ttsVoice)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al obtener la vista previa de voz.');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audio.onended = () => URL.revokeObjectURL(objectUrl);
      await audio.play();
    } catch (err) {
      console.error('[TTS Preview]', err);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = () => {
    setSaveError(null);
    setSavedOk(false);
    startTransition(async () => {
      const config: AgentConfig = {
        persona_name: personaName || undefined,
        tts_voice: ttsVoice || undefined,
        personality: personality || undefined,
        sales_methodology: salesMethodology || undefined,
        forbidden_topics: forbiddenTopics.length > 0 ? forbiddenTopics : undefined,
        escalation_triggers: escalationTriggers.length > 0 ? escalationTriggers : undefined,
        language_style: languageStyle,
      };
      const result = await updateSellerAgentConfig(seller.id, config);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 3000);
      }
    });
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white focus:border-indigo-300 transition-colors placeholder:text-slate-400';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1.5';
  const cardClass = 'bg-white rounded-2xl border border-slate-100 shadow-card p-6 space-y-5';
  const sectionTitleClass = 'text-sm font-semibold text-slate-700 flex items-center gap-2 pb-1 border-b border-slate-100';

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Configurar agente — {seller.name}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Define la personalidad y comportamiento del coach de IA para este vendedor
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
          <Bot size={18} className="text-indigo-500" />
        </div>
      </div>

      {/* Card 1: Identidad */}
      <div className={cardClass}>
        <p className={sectionTitleClass}>
          <Bot size={14} className="text-indigo-400" />
          Identidad del Agente
        </p>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="persona_name">
            ¿Cómo se llama tu agente?
          </label>
          <input
            id="persona_name"
            type="text"
            value={personaName}
            onChange={(e) => setPersonaName(e.target.value)}
            placeholder="Ej: Valeria, Orion, Sofía..."
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="tts_voice">
            Voz del agente
          </label>
          <select
            id="tts_voice"
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
            className={inputClass}
          >
            {TTS_VOICES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} · {v.description}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewing}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border',
            isPreviewing
              ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
              : 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100',
          )}
        >
          {isPreviewing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Volume2 size={14} />
          )}
          {isPreviewing ? 'Reproduciendo...' : '▶ Escuchar voz'}
        </button>
      </div>

      {/* Card 2: Personalidad & Estilo */}
      <div className={cardClass}>
        <p className={sectionTitleClass}>
          <span className="text-indigo-400 text-base leading-none">✦</span>
          Personalidad & Estilo
        </p>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="personality">
            Actitud, tono y forma de ser del agente
          </label>
          <textarea
            id="personality"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={3}
            placeholder="Ej: Empático pero directo, nunca agresivo. Usa preguntas abiertas para entender al cliente antes de proponer soluciones."
            className={cn(inputClass, 'resize-none leading-relaxed')}
          />
        </div>

        <div className="space-y-2">
          <label className={labelClass}>Estilo de lenguaje</label>
          <div className="flex gap-3">
            {LANGUAGE_STYLES.map((style) => (
              <label key={style.value} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="language_style"
                  value={style.value}
                  checked={languageStyle === style.value}
                  onChange={() => setLanguageStyle(style.value)}
                  className="accent-indigo-500"
                />
                <span
                  className={cn(
                    'text-sm font-medium transition-colors',
                    languageStyle === style.value ? 'text-indigo-600' : 'text-slate-600',
                  )}
                >
                  {style.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className={labelClass} htmlFor="sales_methodology">
            Metodología de ventas
          </label>
          <textarea
            id="sales_methodology"
            value={salesMethodology}
            onChange={(e) => setSalesMethodology(e.target.value)}
            rows={3}
            placeholder="Ej: SPIN Selling — formula preguntas de Situación, Problema, Implicación y Necesidad antes de presentar la solución."
            className={cn(inputClass, 'resize-none leading-relaxed')}
          />
        </div>
      </div>

      {/* Card 3: Restricciones */}
      <div className={cardClass}>
        <p className={sectionTitleClass}>
          <span className="text-rose-400 text-base leading-none">⚑</span>
          Restricciones
        </p>

        <div className="space-y-2">
          <label className={labelClass}>
            Temas prohibidos{' '}
            <span className="font-normal text-slate-400">(el agente nunca los mencionará)</span>
          </label>
          <TagInput
            value={forbiddenTopics}
            onChange={setForbiddenTopics}
            placeholder='Ej: "descuentos adicionales", "competidores"...'
          />
          <p className="text-[11px] text-slate-400">Escribe un tema y presiona Enter para agregarlo</p>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>
            Señales de cierre{' '}
            <span className="font-normal text-slate-400">
              (frases del cliente que indican estar listo para cerrar)
            </span>
          </label>
          <TagInput
            value={escalationTriggers}
            onChange={setEscalationTriggers}
            placeholder='Ej: "¿cuándo pueden empezar?", "me interesa"...'
          />
          <p className="text-[11px] text-slate-400">Escribe una frase y presiona Enter para agregarla</p>
        </div>
      </div>

      {/* Save controls */}
      {saveError && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm">
          <X size={14} className="flex-shrink-0 text-rose-400" />
          {saveError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className={cn(
          'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 shadow-sm',
          isPending
            ? 'bg-indigo-300 text-white cursor-not-allowed'
            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20',
        )}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : savedOk ? (
          <CheckCircle2 size={14} />
        ) : null}
        {isPending ? 'Guardando...' : savedOk ? 'Guardado' : 'Guardar cambios'}
      </button>
    </div>
  );
}
