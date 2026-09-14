import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import * as OpenCC from 'opencc-js'

const inputDir = '.artifacts/tvb-transcripts'
const outputFile = 'src/tvbCaptions.ts'
const toHongKong = OpenCC.Converter({ from: 'cn', to: 'hk' })
const toSimplified = OpenCC.Converter({ from: 'hk', to: 'cn' })

function timestamp(value) {
  const [hours, minutes, rest] = value.split(':')
  const [seconds, milliseconds] = rest.split(',')
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 1000
}

const captions = {}
for (const file of await readdir(inputDir)) {
  if (!file.endsWith('.json')) continue
  const videoId = basename(file, '.json')
  const transcript = JSON.parse(await readFile(join(inputDir, file), 'utf8')).transcription || []
  captions[videoId] = transcript
    .map((segment, index) => {
      const text = String(segment.text || '').replace(/\s+/g, '').trim()
      if (!text) return null
      return {
        id: index + 1,
        start: timestamp(segment.timestamps.from),
        end: timestamp(segment.timestamps.to),
        text: toHongKong(text),
        translation: toSimplified(text),
      }
    })
    .filter(Boolean)
}

await mkdir('src', { recursive: true })
await writeFile(outputFile, `export const tvbCaptions: Record<string, Array<{ id: number; start: number; end: number; text: string; translation: string }>> = ${JSON.stringify(captions, null, 2)}\n`, 'utf8')
