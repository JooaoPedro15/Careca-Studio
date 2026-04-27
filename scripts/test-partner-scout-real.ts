import { runProspection } from '../electron/services/partner-scout-agent.js'
import { resolveGeminiApiKey } from '../electron/services/gemini-key-resolver.js'
import { ROBERTO_CARECA_PROFILE } from '../src/modules/partner-scout-v2/data/creator-profile.js'

const { key, source } = resolveGeminiApiKey()
if (!key) {
  console.error('❌ Gemini API key não encontrada em nenhuma das 3 fontes')
  process.exit(1)
}
console.log(`✓ Chave Gemini de fonte: ${source}`)
console.log('Iniciando run de smoke (pode demorar 2-5min)...\n')

const { run, result } = await runProspection({
  apiKey: key,
  creator: ROBERTO_CARECA_PROFILE,
  cacheHints: [],
  maxToolCalls: 20,  // reduzido pra smoke
  onProgress: (e) => console.log(`[${e.kind}] ${e.detail}`),
})

console.log('\n=== RESULTADO ===')
console.log(`status: ${run.status}`)
console.log(`error: ${run.error}`)
console.log(`modelo: ${run.usage.modelo_efetivo}`)
console.log(`tool_use: ${run.usage.tool_use_count}`)
console.log(`custo: US$ ${run.usage.custo_estimado_usd}`)
console.log(`marcas no resultado: ${result?.resultado_final.length ?? 0}`)
if (result) {
  console.log('\nPrimeira marca:')
  console.log(JSON.stringify(result.resultado_final[0], null, 2))
}
