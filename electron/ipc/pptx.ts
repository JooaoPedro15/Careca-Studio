import { spawn } from 'node:child_process'
import path from 'node:path'

import { ipcMain } from 'electron'

interface PptxTextShape {
  shapeName: string
  text: string
}

interface PptxSlide {
  slideIndex: number
  title: string
  textShapes: PptxTextShape[]
}

interface PptxDeck {
  filePath: string
  fileName: string
  slideCount: number
  updatedAt: string
  slides: PptxSlide[]
}

interface PptxTextUpdate {
  slideIndex: number
  shapeName: string
  text: string
}

function encodePowerShellScript(script: string): string {
  return Buffer.from(script, 'utf16le').toString('base64')
}

function getPowerShellScript(): string {
  return `
$ErrorActionPreference = 'Stop'
$payload = $env:CARECA_PPTX_PAYLOAD | ConvertFrom-Json -Depth 16
$application = $null
$presentation = $null

function Convert-Slide($slide) {
  $title = ''
  try {
    if ($slide.Shapes.HasTitle -eq -1) {
      $titleShape = $slide.Shapes.Title
      if ($titleShape -and $titleShape.HasTextFrame -eq -1 -and $titleShape.TextFrame.HasText -eq -1) {
        $title = [string]$titleShape.TextFrame.TextRange.Text
      }
    }
  } catch {}

  $textShapes = @()

  foreach ($shape in @($slide.Shapes)) {
    try {
      if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
        $textShapes += @{
          shapeName = [string]$shape.Name
          text = [string]$shape.TextFrame.TextRange.Text
        }
      }
    } catch {}
  }

  return @{
    slideIndex = [int]$slide.SlideIndex
    title = if ([string]::IsNullOrWhiteSpace($title)) { "Slide $($slide.SlideIndex)" } else { $title.Trim() }
    textShapes = $textShapes
  }
}

function Convert-Presentation($presentation, $filePath) {
  $slides = @()
  foreach ($slide in @($presentation.Slides)) {
    $slides += Convert-Slide $slide
  }

  $fileItem = Get-Item -LiteralPath $filePath

  return @{
    filePath = [string]$fileItem.FullName
    fileName = [string]$fileItem.Name
    slideCount = [int]$presentation.Slides.Count
    updatedAt = $fileItem.LastWriteTime.ToString('o')
    slides = $slides
  }
}

try {
  $application = New-Object -ComObject PowerPoint.Application
  $presentation = $application.Presentations.Open($payload.filePath, $false, $false, $false)

  if ($payload.action -eq 'update') {
    foreach ($update in @($payload.updates)) {
      $slide = $presentation.Slides.Item([int]$update.slideIndex)
      $shape = $slide.Shapes.Item([string]$update.shapeName)
      if ($shape.HasTextFrame -eq -1) {
        $shape.TextFrame.TextRange.Text = [string]$update.text
      }
    }
    $presentation.Save()
  }

  $result = Convert-Presentation $presentation $payload.filePath
  $result | ConvertTo-Json -Depth 16 -Compress
}
finally {
  if ($presentation) {
    try { $presentation.Close() } catch {}
    try { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) } catch {}
  }
  if ($application) {
    try { $application.Quit() } catch {}
    try { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($application) } catch {}
  }
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}
`
}

function runPptxAction(filePath: string, action: 'inspect' | 'update', updates: PptxTextUpdate[] = []): Promise<PptxDeck> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      action,
      filePath,
      updates,
    })

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodePowerShellScript(getPowerShellScript())],
      {
        env: {
          ...process.env,
          CARECA_PPTX_PAYLOAD: payload,
        },
        windowsHide: true,
      },
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Falha ao processar PPTX nativo (codigo ${code}).`))
        return
      }

      try {
        resolve(JSON.parse(stdout.trim()) as PptxDeck)
      } catch (error) {
        reject(error)
      }
    })
  })
}

export function registerPptxHandlers() {
  ipcMain.handle('pptx:inspect', async (_event, filePath: string) => {
    return runPptxAction(path.resolve(filePath), 'inspect')
  })

  ipcMain.handle('pptx:updateText', async (_event, filePath: string, updates: PptxTextUpdate[]) => {
    return runPptxAction(path.resolve(filePath), 'update', updates)
  })
}
