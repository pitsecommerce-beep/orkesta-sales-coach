'use client';

import { useState, useTransition } from 'react';
import { X, Plus, Loader2, User, Building2, Briefcase, Mail, Phone, AlertCircle, FileText } from 'lucide-react';
import { createClientAction } from '@/app/actions';
import { cn } from '@/lib/utils';

export function NewClientButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/30 hover:-translate-y-px"
      >
        <Plus size={15} />
        Nuevo cliente
      </button>

      {open && <NewClientModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      const result = await createClientAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-card-lg w-full max-w-lg animate-fade-up">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Nuevo cliente</h2>
            <p className="text-xs text-slate-400 mt-0.5">Agrega un cliente al CRM</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field
            label="Nombre completo"
            name="name"
            required
            icon={User}
            placeholder="Ej. Carlos Méndez"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Empresa"
              name="company"
              icon={Building2}
              placeholder="Ej. TechCorp MX"
            />
            <Field
              label="Industria"
              name="industry"
              icon={Briefcase}
              placeholder="Ej. Tecnología"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Email"
              name="email"
              type="email"
              icon={Mail}
              placeholder="carlos@empresa.com"
            />
            <Field
              label="Teléfono"
              name="phone"
              type="tel"
              icon={Phone}
              placeholder="+52 55 0000 0000"
            />
          </div>

          <Field
            label="Pain points"
            name="pain_points"
            icon={AlertCircle}
            placeholder="¿Cuáles son sus principales problemas?"
            multiline
          />

          <Field
            label="Notas"
            name="notes"
            icon={FileText}
            placeholder="Información adicional relevante..."
            multiline
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all duration-150"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-all duration-150',
                isPending && 'opacity-70 cursor-not-allowed',
              )}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Creando…' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  icon: React.ElementType;
  placeholder?: string;
  multiline?: boolean;
}

function Field({ label, name, required, type = 'text', icon: Icon, placeholder, multiline }: FieldProps) {
  const inputClass =
    'w-full text-sm text-slate-800 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all duration-150';

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}
        {required && <span className="text-indigo-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" style={multiline ? { top: '14px', transform: 'none' } : {}} />
        {multiline ? (
          <textarea
            name={name}
            placeholder={placeholder}
            rows={3}
            className={inputClass + ' resize-none pt-2.5'}
          />
        ) : (
          <input
            type={type}
            name={name}
            required={required}
            placeholder={placeholder}
            className={inputClass}
          />
        )}
      </div>
    </div>
  );
}
