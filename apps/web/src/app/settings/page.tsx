export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Variables de entorno y preferencias</p>
      </div>

      <div className="bg-[#0d1b2e] border border-slate-800/60 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Variables de entorno requeridas</h2>
        <div className="space-y-2 font-mono text-xs">
          {[
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'NEXT_PUBLIC_API_WS_URL',
            'DEEPGRAM_API_KEY (en el servidor API)',
            'ANTHROPIC_API_KEY (en el servidor API)',
            'SUPABASE_SERVICE_ROLE_KEY (en el servidor API)',
          ].map((v) => (
            <p key={v} className="text-slate-400">
              <span className="text-sky-400">$</span> {v}
            </p>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Copia <code className="text-sky-400">.env.example</code> a <code className="text-sky-400">.env</code> y completa los valores.
        </p>
      </div>
    </div>
  );
}
