import { runProspection } from '../electron/services/partner-scout-agent.js'
import { resolveGeminiApiKey } from '../electron/services/gemini-key-resolver.js'
import { ROBERTO_CARECA_PROFILE } from '../src/modules/partner-scout-v2/data/creator-profile.js'

const { key, source } = resolveGeminiApiKey()
console.log(key ? `Chave Gemini de fonte: ${source} (usada apenas em enriquecimento)` : 'Sem Gemini API key; busca local continua normalmente')
console.log('Iniciando run local de prospeccao...\n')

const { run, result } = await runProspection({
  creator: ROBERTO_CARECA_PROFILE,
  minimumBrands: 25,
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
