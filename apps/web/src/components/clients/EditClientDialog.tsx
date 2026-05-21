'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, User, Building2, Briefcase, Mail, Phone, AlertCircle, FileText, Package, Pencil } from 'lucide-react';
import { updateClientAction } from '@/app/actions';
import { cn } from '@/lib/utils';
import type { Client, Product } from '@/lib/types';

export function EditClientButton({ client, products }: { client: Client; products: Product[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-100 hover:border-slate-300 transition-all duration-150"
      >
        <Pencil size={12} />
        Editar
      </button>
      {open && <EditClientDialog client={client} products={products} onClose={() => setOpen(false)} />}
    </>
  );
}

interface EditClientDialogProps {
  client: Client;
  products: Product[];
  onClose: () => void;
}

export function EditClientDialog({ client, products, onClose }: EditClientDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      const result = await updateClientAction(client.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        onClose();
      }
    });
  };

  const inputClass =
    'w-full text-sm text-slate-800 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all duration-150';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-card-lg w-full max-w-lg animate-fade-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Editar cliente</h2>
            <p className="text-xs text-slate-400 mt-0.5">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Nombre completo<span className="text-indigo-400 ml-0.5">*</span>
            </label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                type="text"
                name="name"
                required
                defaultValue={client.name}
                placeholder="Ej. Carlos Méndez"
                className={inputClass}
              />
            </div>
          </div>

          {/* Empresa + Industria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Empresa</label>
              <div className="relative">
                <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <input
                  type="text"
                  name="company"
                  defaultValue={client.company ?? ''}
                  placeholder="Ej. TechCorp MX"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Industria</label>
              <div className="relative">
                <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <input
                  type="text"
                  name="industry"
                  defaultValue={client.industry ?? ''}
                  placeholder="Ej. Tecnología"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Email + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  defaultValue={client.email ?? ''}
                  placeholder="carlos@empresa.com"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Teléfono</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <input
                  type="tel"
                  name="phone"
                  defaultValue={client.phone ?? ''}
                  placeholder="+52 55 0000 0000"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Producto asignado */}
          {products.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Producto asignado</label>
              <div className="relative">
                <Package size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                <select
                  name="default_product_id"
                  defaultValue={client.default_product_id ?? ''}
                  className={cn(inputClass, 'appearance-none cursor-pointer')}
                >
                  <option value="">— Sin producto asignado —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.suggested_price.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Pain points */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Pain points</label>
            <div className="relative">
              <AlertCircle size={13} className="absolute left-3 text-slate-300 pointer-events-none" style={{ top: '14px' }} />
              <textarea
                name="pain_points"
                defaultValue={client.pain_points ?? ''}
                placeholder="¿Cuáles son sus principales problemas?"
                rows={3}
                className={cn(inputClass, 'resize-none pt-2.5')}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Notas</label>
            <div className="relative">
              <FileText size={13} className="absolute left-3 text-slate-300 pointer-events-none" style={{ top: '14px' }} />
              <textarea
                name="notes"
                defaultValue={client.notes ?? ''}
                placeholder="Información adicional relevante..."
                rows={3}
                className={cn(inputClass, 'resize-none pt-2.5')}
              />
            </div>
          </div>

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
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
