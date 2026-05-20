const RLS_FIX_SQL = `-- Ejecutar en Supabase → SQL Editor
drop policy if exists "auth_all" on sellers;
drop policy if exists "auth_all" on products;
drop policy if exists "auth_all" on clients;
drop policy if exists "auth_all" on calls;

create policy "open_access" on sellers for all using (true) with check (true);
create policy "open_access" on products for all using (true) with check (true);
create policy "open_access" on clients for all using (true) with check (true);
create policy "open_access" on calls for all using (true) with check (true);`;

export default function SettingsPage() {
  const webVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', note: 'Build Variable en Railway', critical: true },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', note: 'Build Variable en Railway', critical: true },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', note: 'Runtime Variable — omite las políticas RLS', critical: false },
    { key: 'NEXT_PUBLIC_API_WS_URL', note: 'URL del servicio API en Railway', critical: true },
  ];

  const apiVars = [
    { key: 'SUPABASE_URL', critical: true },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', critical: true },
    { key: 'DEEPGRAM_API_KEY', critical: true },
    { key: 'ANTHROPIC_API_KEY', critical: true },
    { key: 'ALLOWED_ORIGIN', critical: false },
  ];

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Variables de entorno y diagnóstico</p>
      </div>

      {/* RLS Fix — Most important */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm font-bold">!</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-amber-800">La app no muestra datos</h2>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              El schema de Supabase tiene políticas RLS que bloquean el acceso con la clave anon.
              Ejecuta este SQL en{' '}
              <strong>Supabase → SQL Editor</strong> para habilitar el acceso:
            </p>
          </div>
        </div>
        <pre className="bg-amber-900/10 border border-amber-200 rounded-xl p-4 text-xs font-mono text-amber-900 overflow-x-auto leading-relaxed whitespace-pre">
          {RLS_FIX_SQL}
        </pre>
        <p className="text-xs text-amber-600">
          Alternativa: agrega <code className="bg-amber-100 px-1 rounded font-mono">SUPABASE_SERVICE_ROLE_KEY</code> como variable del servicio <em>web</em> en Railway (sin prefijo NEXT_PUBLIC_).
        </p>
      </div>

      {/* Web service vars */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-card">
        <h2 className="text-sm font-semibold text-slate-700">Servicio <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">web</code> — Railway</h2>
        <div className="space-y-2">
          {webVars.map(({ key, note, critical }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
              <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{key}</code>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{note}</span>
                {critical && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                    Requerida
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-3 leading-relaxed">
          <strong className="text-slate-600">Importante:</strong> Las variables <code className="font-mono">NEXT_PUBLIC_*</code> deben configurarse como <strong>Build Variables</strong> en Railway, no solo Runtime Variables. Sin esto, el bundle no las incluye y la app no verá los valores aunque estén configuradas.
        </p>
      </div>

      {/* API service vars */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-card">
        <h2 className="text-sm font-semibold text-slate-700">Servicio <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">api</code> — Railway</h2>
        <div className="space-y-2 font-mono text-xs">
          {apiVars.map(({ key, critical }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
              <code className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">{key}</code>
              {critical && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                  Requerida
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
