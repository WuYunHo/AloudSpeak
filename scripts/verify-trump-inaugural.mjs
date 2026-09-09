import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { chromium } from 'playwright-core'

const directory = new URL('../content/donald-trump/2017-inaugural-address/', import.meta.url)
const audioPath = new URL('audio.mp3', directory)
const transcriptPath = new URL('transcript-official.md', directory)
const captionsPath = new URL('captions-en.vtt', directory)
const lessonPath = new URL('lesson.json', directory)
const translationsPath = new URL('translations-zh-CN.json', directory)
const metadataPath = new URL('metadata.json', directory)
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
const transcript = await readFile(transcriptPath, 'utf8')
const captions = await readFile(captionsPath, 'utf8')
const lesson = JSON.parse(await readFile(lessonPath, 'utf8'))
const translations = JSON.parse(await readFile(translationsPath, 'utf8')).translations
const audioStats = await stat(audioPath)
const hash = createHash('sha256')
await pipeline(createReadStream(audioPath), hash)
const audioHash = hash.digest('hex')

const checks = [
  [audioStats.size === metadata.audio.bytes, 'audio byte count does not match metadata'],
  [audioHash === metadata.audio.sha256, 'audio SHA-256 does not match metadata'],
  [transcript.includes('Chief Justice Roberts'), 'transcript opening is missing'],
  [transcript.includes('God Bless America.'), 'transcript closing is missing'],
  [metadata.transcript.paragraphCount === 75, 'unexpected transcript paragraph count'],
  [captions.startsWith('WEBVTT'), 'caption file is not valid WebVTT'],
  [lesson.segments.length === metadata.captions.segmentCount, 'timed segment count does not match metadata'],
  [lesson.segments.at(-1).end > 980, 'timed transcript ends too early'],
  [Object.keys(translations).length === lesson.segments.length, 'Chinese translation count does not match timed segments'],
  [lesson.segments.every((segment) => translations[String(segment.id)]?.trim()), 'one or more Chinese translations are missing'],
]

for (const [passed, message] of checks) {
  if (!passed) throw new Error(message)
}

const browser = await chromium.launch({ executablePath: edgePath, headless: true })
const page = await browser.newPage()
await page.goto(audioPath.href)
await page.waitForFunction(() => {
  const media = document.querySelector('video, audio')
  return media && Number.isFinite(media.duration) && media.duration > 0
}, undefined, { timeout: 15_000 })
const duration = await page.locator('video, audio').evaluate((media) => media.duration)
await browser.close()

if (Math.abs(duration - metadata.durationSeconds) > 1) {
  throw new Error(`browser duration ${duration} does not match metadata`)
}

console.log(`Verified audio (${duration.toFixed(2)} seconds), SHA-256, and ${metadata.transcript.paragraphCount} transcript paragraphs.`)
