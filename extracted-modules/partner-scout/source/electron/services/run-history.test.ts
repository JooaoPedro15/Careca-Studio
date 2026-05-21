import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createRunHistory, type RunHistory } from './run-history.js'
import type { ProspectionRun } from '../../src/modules/partner-scout/agent/run.js'

const baseRun = (id: string, startedAt: string): ProspectionRun => ({
  id,
  startedAt,
  finishedAt: null,
  status: 'pending',
  error: null,
  usage: {
    prompt_tokens: 0,
    candidates_tokens: 0,
    cached_content_tokens: 0,
    tool_use_count: 0,
    modelo_efetivo: 'gemini-2.5-flash',
    custo_estimado_usd: 0,
  },
  result: null,
  progressLog: [],
})

describe('RunHistory', () => {
  let dir: string
  let history: RunHistory

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'run-hist-'))
    history = createRunHistory({ cwd: dir, name: 'test', maxRuns: 3 })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('append + get + list', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.append(baseRun('b', '2026-04-02T00:00:00Z'))

    expect(history.get('a')?.id).toBe('a')
    expect(history.list().map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('list limita ao maxRuns mais recente', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.append(baseRun('b', '2026-04-02T00:00:00Z'))
    history.append(baseRun('c', '2026-04-03T00:00:00Z'))
    history.append(baseRun('d', '2026-04-04T00:00:00Z'))

    expect(history.list().map((r) => r.id)).toEqual(['d', 'c', 'b'])
    expect(history.get('a')).toBeNull()
  })

  it('update altera campos do run', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.update('a', { status: 'done', finishedAt: '2026-04-01T00:05:00Z' })

    expect(history.get('a')?.status).toBe('done')
    expect(history.get('a')?.finishedAt).toBe('2026-04-01T00:05:00Z')
  })

  it('delete remove o run', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.delete('a')
    expect(history.get('a')).toBeNull()
  })
})
