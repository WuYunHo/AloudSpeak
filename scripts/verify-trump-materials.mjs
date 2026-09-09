import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { chromium } from 'playwright-core'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const materials = [
  {
    directory: '2017-inaugural-address',
    transcriptFile: 'transcript-official.md',
    segmentCount: 78,
    transcriptMarkers: ['Chief Justice Roberts', 'God Bless America.'],
  },
  {
    directory: '2018-syria-address',
    transcriptFile: 'transcript-from-captions.md',
    segmentCount: 50,
    transcriptMarkers: ['precision strikes', 'Thank you, and goodnight.'],
  },
  {
    directory: '2020-address-to-the-nation',
    transcriptFile: 'transcript-official.md',
    segmentCount: 74,
    transcriptMarkers: ['My fellow Americans', 'God bless America. Thank you.'],
  },
]

const browser = await chromium.launch({ executablePath: edgePath, headless: true })

for (const material of materials) {
  const directory = new URL(`../content/donald-trump/${material.directory}/`, import.meta.url)
  const audioPath = new URL('audio.mp3', directory)
  const metadata = JSON.parse(await readFile(new URL('metadata.json', directory), 'utf8'))
  const lesson = JSON.parse(await readFile(new URL('lesson.json', directory), 'utf8'))
  const translations = JSON.parse(await readFile(new URL('translations-zh-CN.json', directory), 'utf8')).translations
  const transcript = await readFile(new URL(material.transcriptFile, directory), 'utf8')
  const captions = await readFile(new URL('captions-en.vtt', directory), 'utf8')
  const audioStats = await stat(audioPath)
  const hash = createHash('sha256')
  await pipeline(createReadStream(audioPath), hash)

  const checks = [
    [audioStats.size === metadata.audio.bytes, 'audio byte count does not match metadata'],
    [hash.digest('hex') === metadata.audio.sha256, 'audio SHA-256 does not match metadata'],
    [captions.startsWith('WEBVTT'), 'caption file is not valid WebVTT'],
    [lesson.segments.length === material.segmentCount, 'unexpected timed segment count'],
    [lesson.segments.length === metadata.captions.segmentCount, 'segment count does not match metadata'],
    [Object.keys(translations).length === lesson.segments.length, 'translation count does not match segments'],
    [lesson.segments.every((segment) => translations[String(segment.id)]?.trim()), 'one or more translations are missing'],
    [material.transcriptMarkers.every((marker) => transcript.includes(marker)), 'transcript boundary text is missing'],
    [metadata.audio.license === 'Public domain', 'unexpected media license'],
  ]
  for (const [passed, message] of checks) {
    if (!passed) throw new Error(`${material.directory}: ${message}`)
  }

  const page = await browser.newPage()
  await page.goto(audioPath.href)
  await page.waitForFunction(() => {
    const media = document.querySelector('video, audio')
    return media && Number.isFinite(media.duration) && media.duration > 0
  }, undefined, { timeout: 15_000 })
  const browserDuration = await page.locator('video, audio').evaluate((media) => media.duration)
  await page.close()
  if (Math.abs(browserDuration - metadata.durationSeconds) > 1) {
    throw new Error(`${material.directory}: browser duration ${browserDuration} does not match metadata ${metadata.durationSeconds}`)
  }

  console.log(`${material.directory}: ${lesson.segments.length} bilingual segments, ${browserDuration.toFixed(2)} seconds`)
}

await browser.close()
console.log('All 3 Trump speech materials verified.')
