import type { ProspectionResult } from './schema.js'

export type RunStatus = 'pending' | 'running' | 'done' | 'error' | 'aborted'

export interface RunUsage {
  prompt_tokens: number
  candidates_tokens: number
  cached_content_tokens: number
  tool_use_count: number
  modelo_efetivo: string
  custo_estimado_usd: number
}

export interface RunProgressEvent {
  ts: string
  kind: 'tool_use' | 'tool_result' | 'text_delta' | 'error' | 'phase' | 'fallback'
  detail: string
}

export interface ProspectionRun {
  id: string
  startedAt: string
  finishedAt: string | null
  status: RunStatus
  error: string | null
  usage: RunUsage
  result: ProspectionResult | null
  progressLog: RunProgressEvent[]
}
