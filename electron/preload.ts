import { contextBridge, ipcRenderer, webUtils } from 'electron'

// API segura exposta para o renderer acessar janelas, dialogs e filas sem habilitar Node direto.
const api = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  dialog: {
    // Encapsula os dialogs nativos e a recuperacao do path real de um File do browser.
    openFiles: (filters: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('dialog:openFiles', filters),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },
  shell: {
    // Revela arquivos e pastas no explorador do sistema operacional.
    showItemInFolder: (filePath: string) =>
      ipcRenderer.invoke('shell:showItemInFolder', filePath),
    openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  },
  subtitle: {
    // Namespace dedicado ao workflow de transcricao sequencial.
    process: (filePath: string, options: Record<string, unknown>) =>
      ipcRenderer.invoke('subtitle:process', filePath, options),
    cancel: (taskId: string) => ipcRenderer.invoke('subtitle:cancel', taskId),
    onProgress: (cb: (data: unknown) => void) => {
      const listener = (_event: unknown, data: unknown) => cb(data)
      ipcRenderer.on('subtitle:progress', listener)
      return () => {
        ipcRenderer.removeListener('subtitle:progress', listener)
      }
    },
    onDone: (cb: (data: unknown) => void) => {
      const listener = (_event: unknown, data: unknown) => cb(data)
      ipcRenderer.on('subtitle:done', listener)
      return () => {
        ipcRenderer.removeListener('subtitle:done', listener)
      }
    },
    onError: (cb: (data: unknown) => void) => {
      const listener = (_event: unknown, data: unknown) => cb(data)
      ipcRenderer.on('subtitle:error', listener)
      return () => {
        ipcRenderer.removeListener('subtitle:error', listener)
      }
    },
  },
  clipSplitter: {
    // Namespace dedicado ao workflow de corte e feedback de clipes.
    process: (sourcePath: string, options: Record<string, unknown>) =>
      ipcRenderer.invoke('clipSplitter:process', sourcePath, options),
    cancel: (taskId: string) => ipcRenderer.invoke('clipSplitter:cancel', taskId),
    saveFeedback: (clip: Record<string, unknown>, label: string | null) =>
      ipcRenderer.invoke('clipSplitter:saveFeedback', clip, label),
    onProgress: (cb: (data: unknown) => void) => {
      const listener = (_event: unknown, data: unknown) => cb(data)
      ipcRenderer.on('clipSplitter:progress', listener)
      return () => {
        ipcRenderer.removeListener('clipSplitter:progress', listener)
      }
    },
    onDone: (cb: (data: unknown) => void) => {
      const listener = (_event: unknown, data: unknown) => cb(data)
      ipcRenderer.on('clipSplitter:done', listener)
      return () => {
        ipcRenderer.removeListener('clipSplitter:done', listener)
      }
    },
    onError: (cb: (data: unknown) => void) => {
      const listener = (_event: unknown, data: unknown) => cb(data)
      ipcRenderer.on('clipSplitter:error', listener)
      return () => {
        ipcRenderer.removeListener('clipSplitter:error', listener)
      }
    },
  },
  partnerScout: {
    // Legacy v1 (mantido ate Task 10)
    fetchOfficialYoutubeSignals: () => ipcRenderer.invoke('partnerScout:fetchOfficialYoutubeSignals'),
    // V2
    run: () => ipcRenderer.invoke('partnerScout:run'),
    abort: () => ipcRenderer.invoke('partnerScout:abort'),
    onProgress: (cb: (data: unknown) => void) => {
      const handler = (_e: unknown, p: unknown) => cb(p)
      ipcRenderer.on('partnerScout:progress', handler)
      return () => {
        ipcRenderer.removeListener('partnerScout:progress', handler)
      }
    },
    onDone: (cb: (data: unknown) => void) => {
      const handler = (_e: unknown, p: unknown) => cb(p)
      ipcRenderer.on('partnerScout:done', handler)
      return () => {
        ipcRenderer.removeListener('partnerScout:done', handler)
      }
    },
    onError: (cb: (data: unknown) => void) => {
      const handler = (_e: unknown, p: unknown) => cb(p)
      ipcRenderer.on('partnerScout:error', handler)
      return () => {
        ipcRenderer.removeListener('partnerScout:error', handler)
      }
    },
    listRuns: () => ipcRenderer.invoke('partnerScout:listRuns'),
    getRun: (id: string) => ipcRenderer.invoke('partnerScout:getRun', id),
    deleteRun: (id: string) => ipcRenderer.invoke('partnerScout:deleteRun', id),
    listCache: () => ipcRenderer.invoke('partnerScout:listCache'),
    setBrandStatus: (nomeNormalizado: string, status: string, nota?: string) =>
      ipcRenderer.invoke('partnerScout:setBrandStatus', { nomeNormalizado, status, nota }),
    updateBrandContact: (nomeNormalizado: string, patch: Record<string, unknown>) =>
      ipcRenderer.invoke('partnerScout:updateBrandContact', { nomeNormalizado, patch }),
    addBrandNote: (nomeNormalizado: string, text: string) =>
      ipcRenderer.invoke('partnerScout:addBrandNote', { nomeNormalizado, text }),
    getApiKeyStatus: () => ipcRenderer.invoke('partnerScout:getApiKeyStatus'),
    getCreatorProfile: () => ipcRenderer.invoke('partnerScout:getCreatorProfile'),
    openMarkdownFolder: () => ipcRenderer.invoke('partnerScout:openMarkdownFolder'),
    openMarkdownFile: (path: string) => ipcRenderer.invoke('partnerScout:openMarkdownFile', path),
  },
  pptx: {
    inspect: (filePath: string) => ipcRenderer.invoke('pptx:inspect', filePath),
    updateText: (filePath: string, updates: Array<Record<string, unknown>>) =>
      ipcRenderer.invoke('pptx:updateText', filePath, updates),
  },
} as const

// Injeta a API no objeto window do renderer.
contextBridge.exposeInMainWorld('careca', api)

export type CarecaAPI = typeof api
