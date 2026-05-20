'use client';

import { useRef, useState, useTransition } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { importClientsAction } from '@/app/actions';
import type { Client } from '@/lib/types';

interface Props {
  clients: Client[];
}

const CSV_HEADERS = ['id', 'nombre', 'empresa', 'industria', 'email', 'telefono', 'pain_points', 'notas'];

function toCsvRow(values: (string | null | undefined)[]) {
  return values.map((v) => `"${(v ?? '').replace(/"/g, '""')}"`).join(',');
}

export function ClientsToolbar({ clients }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);

  function downloadTemplate() {
    const rows = [CSV_HEADERS.join(','), toCsvRow(['', '', '', '', '', '', '', ''])];
    triggerCsvDownload(rows.join('\n'), 'plantilla-clientes.csv');
  }

  function exportClients() {
    const rows = [
      CSV_HEADERS.join(','),
      ...clients.map((c) =>
        toCsvRow([c.id, c.name, c.company, c.industry, c.email, c.phone, c.pain_points, c.notes]),
      ),
    ];
    triggerCsvDownload(rows.join('\n'), 'clientes.csv');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const rows = parseCsv(text);
        setStatus(null);
        startTransition(async () => {
          try {
            const result = await importClientsAction(rows);
            setStatus({ type: 'ok', msg: `${result.inserted} insertados, ${result.updated} actualizados.` });
          } catch (err) {
            setStatus({ type: 'error', msg: err instanceof Error ? err.message : 'Error al importar.' });
          }
        });
      } catch {
        setStatus({ type: 'error', msg: 'Archivo CSV inválido.' });
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${
            status.type === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}
        >
          {status.type === 'ok' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {status.msg}
        </span>
      )}

      <button
        onClick={downloadTemplate}
        title="Descargar plantilla CSV vacía"
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-150"
      >
        <FileSpreadsheet size={13} className="text-emerald-500" />
        Plantilla
      </button>

      <button
        onClick={exportClients}
        disabled={clients.length === 0}
        title="Exportar clientes existentes como CSV"
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download size={13} className="text-indigo-500" />
        Exportar
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={isPending}
        title="Importar clientes desde CSV"
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin text-slate-400" />
        ) : (
          <Upload size={13} className="text-violet-500" />
        )}
        Importar CSV
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function triggerCsvDownload(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
