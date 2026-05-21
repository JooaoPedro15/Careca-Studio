import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

import { resolveRunnerScriptPath } from './subtitle.js'

describe('resolveRunnerScriptPath', () => {
  let tempRoot: string | null = null

  afterEach(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true })
      tempRoot = null
    }
  })

  it('prefere o runner local do Careca Studio quando tambem existe script externo', () => {
    tempRoot = mkdtempSync(path.join(tmpdir(), 'subtitle-forge-'))
    writeFileSync(path.join(tempRoot, 'subtitle_forge.py'), '# external runner')

    const { scriptPath } = resolveRunnerScriptPath(tempRoot)

    expect(path.normalize(scriptPath ?? '')).toBe(path.normalize(path.resolve(process.cwd(), 'python', 'subtitle_service.py')))
  })
})
