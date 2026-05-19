import { useEffect, useState } from 'react'

interface SourcesConfigProps {
  onBack: () => void
}

export function SourcesConfig({ onBack }: SourcesConfigProps) {
  const [apiStatus, setApiStatus] = useState<{ configured: boolean; source: string; masked?: string } | null>(null)

  useEffect(() => {
    void window.careca.partnerScout.getApiKeyStatus().then(setApiStatus)
  }, [])

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="text-zinc-400 hover:text-white">← Voltar</button>
        <h1 className="font-display text-2xl text-white">Configurações</h1>
      </header>

      <section className="rounded-[10px] border border-white/10 bg-[#131316] p-4">
        <h2 className="font-display text-base text-white">Gemini API</h2>
        {apiStatus === null ? (
          <p className="mt-2 text-sm text-zinc-400">Carregando…</p>
        ) : apiStatus.configured ? (
          <>
            <p className="mt-2 text-sm text-green-400">✓ Configurada</p>
            <p className="mt-1 font-mono text-xs text-zinc-300">{apiStatus.masked}</p>
            <p className="mt-1 font-mono text-xs text-zinc-500">fonte: {apiStatus.source}</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-red-400">✗ Não configurada</p>
            <p className="mt-2 text-xs text-zinc-300">
              Configure em uma das 3 fontes (na ordem que será verificada):
            </p>
            <ol className="mt-1 list-decimal pl-5 text-xs text-zinc-400 space-y-1">
              <li>variável de ambiente <code className="font-mono">GEMINI_API_KEY</code></li>
              <li>arquivo <code className="font-mono">D:\Projetos\Clip-Splitter\.env</code> (linha <code>GEMINI_API_KEY=...</code>)</li>
              <li>variável de ambiente do usuário Windows (HKCU\Environment\GEMINI_API_KEY)</li>
            </ol>
            <p className="mt-2 text-xs text-zinc-500">Reinicie o app após configurar.</p>
          </>
        )}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-violet-300 underline"
        >
          Obter chave Gemini →
        </a>
      </section>

      <section className="rounded-[10px] border border-white/10 bg-[#131316] p-4">
        <h2 className="font-display text-base text-white">Perfil do criador</h2>
        <p className="mt-2 text-xs text-zinc-400">
          Read-only no v1. Pra atualizar, edite{' '}
          <code className="font-mono text-violet-300">src/modules/partner-scout/data/creator-profile.ts</code>{' '}
          e recompile o app.
        </p>
      </section>

      <section className="rounded-[10px] border border-white/10 bg-[#131316] p-4">
        <h2 className="font-display text-base text-white">Cache de marcas</h2>
        <p className="mt-2 text-xs text-zinc-400">Janela de skip: 90 dias (hard-coded no v1).</p>
      </section>
    </div>
  )
}
