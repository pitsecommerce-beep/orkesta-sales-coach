export default function SettingsPage() {
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_API_WS_URL',
    'DEEPGRAM_API_KEY (en el servidor API)',
    'ANTHROPIC_API_KEY (en el servidor API)',
    'SUPABASE_SERVICE_ROLE_KEY (en el servidor API)',
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Configuración</h1>
        <p className="text-slate-500 text-sm mt-1">Variables de entorno y preferencias</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-card">
        <h2 className="text-sm font-semibold text-slate-700">Variables de entorno requeridas</h2>
        <div className="space-y-2 font-mono text-xs bg-slate-50 rounded-xl p-4 border border-slate-100">
          {envVars.map((v) => (
            <p key={v} className="text-slate-600">
              <span className="text-indigo-500 font-semibold select-none">$ </span>
              {v}
            </p>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Copia{' '}
          <code className="text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">.env.example</code>{' '}
          a{' '}
          <code className="text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">.env</code>{' '}
          y completa los valores.
        </p>
      </div>
    </div>
  );
}
