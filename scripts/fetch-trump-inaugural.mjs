import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import * as cheerio from 'cheerio'
import webvtt from 'node-webvtt'

const outputDirectory = new URL('../content/donald-trump/2017-inaugural-address/', import.meta.url)
const audioPath = new URL('audio.mp3', outputDirectory)
const partialAudioPath = new URL('audio.mp3.part', outputDirectory)
const transcriptPath = new URL('transcript-official.md', outputDirectory)
const captionsPath = new URL('captions-en.vtt', outputDirectory)
const lessonPath = new URL('lesson.json', outputDirectory)
const metadataPath = new URL('metadata.json', outputDirectory)

const transcriptSource = 'https://trumpwhitehouse.archives.gov/briefings-statements/the-inaugural-address/'
const commonsPage = "https://commons.wikimedia.org/wiki/File:President_Donald_Trump%27s_First_Inaugural_Address_-_January_20,_2017.wav"
const audioSource = "https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f5/President_Donald_Trump%27s_First_Inaugural_Address_-_January_20%2C_2017.wav/President_Donald_Trump%27s_First_Inaugural_Address_-_January_20%2C_2017.wav.mp3"
const originalVideo = 'https://www.youtube.com/watch?v=jWaJe5pBYic'
const captionsSource = "https://commons.wikimedia.org/w/api.php?action=timedtext&title=File%3APresident%20Trump%27s%20Inaugural%20Address.webm&lang=en&trackformat=vtt&format=json"
const captionedVideo = "https://commons.wikimedia.org/wiki/File:President_Trump%27s_Inaugural_Address.webm"

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function downloadAudio() {
  if (await exists(audioPath)) return

  const response = await fetch(audioSource, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok || !response.body) {
    throw new Error(`Audio download failed: ${response.status} ${response.statusText}`)
  }

  await rm(partialAudioPath, { force: true })
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partialAudioPath))
  await rename(partialAudioPath, audioPath)
}

async function sha256(path) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

async function fetchTranscript() {
  const response = await fetch(transcriptSource, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) {
    throw new Error(`Transcript download failed: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const paragraphs = $('.page-content__content.editor > p')
    .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean)

  const openingIndex = paragraphs.findIndex((paragraph) => paragraph.startsWith('Chief Justice Roberts'))
  const closingIndex = paragraphs.findIndex((paragraph) => paragraph.toLowerCase().includes('god bless america.'))

  if (openingIndex === -1 || closingIndex === -1 || closingIndex < openingIndex) {
    throw new Error('Could not identify the official transcript boundaries')
  }

  const speech = paragraphs.slice(openingIndex, closingIndex + 1)
  const markdown = [
    '# The Inaugural Address',
    '',
    '- Speaker: Donald J. Trump',
    '- Date: January 20, 2017',
    '- Location: Washington, D.C.',
    `- Official transcript: ${transcriptSource}`,
    '- Document type: Prepared remarks, not a verbatim audio transcription',
    '',
    ...speech.flatMap((paragraph) => [paragraph, '']),
  ].join('\n').trimEnd() + '\n'

  await writeFile(transcriptPath, markdown, 'utf8')
  return speech.length
}

async function fetchCaptions() {
  let source
  if (await exists(captionsPath)) {
    source = await readFile(captionsPath, 'utf8')
  } else {
    const response = await fetch(captionsSource, { signal: AbortSignal.timeout(30_000) })
    if (!response.ok) {
      throw new Error(`Caption download failed: ${response.status} ${response.statusText}`)
    }
    source = await response.text()
  }
  const parsed = webvtt.parse(source)
  const words = []

  for (const cue of parsed.cues) {
    const text = cheerio.load(cue.text).text().replace(/\s+/g, ' ').trim()
    if (!text || /^\[.*\]$/.test(text) || /^\(Mouthing\):/i.test(text)) continue

    const cueWords = text.split(' ')
    const wordDuration = (cue.end - cue.start) / cueWords.length
    cueWords.forEach((word, index) => {
      words.push({
        text: word,
        start: cue.start + wordDuration * index,
        end: cue.start + wordDuration * (index + 1),
      })
    })
  }

  const segments = []
  let current = []
  for (const word of words) {
    current.push(word)
    const endsSentence = /[.!?][\"']?$/.test(word.text)
    const isLongEnoughToSplit = current.length >= 34 && /[,;:][\"']?$/.test(word.text)
    if (endsSentence || isLongEnoughToSplit) {
      segments.push({
        id: 1000 + segments.length + 1,
        start: Number(current[0].start.toFixed(3)),
        end: Number(current.at(-1).end.toFixed(3)),
        text: current.map((item) => item.text).join(' '),
        translation: '',
      })
      current = []
    }
  }

  if (current.length) {
    segments.push({
      id: 1000 + segments.length + 1,
      start: Number(current[0].start.toFixed(3)),
      end: Number(current.at(-1).end.toFixed(3)),
      text: current.map((item) => item.text).join(' '),
      translation: '',
    })
  }

  if (segments.length < 50 || segments.at(-1).end < 980) {
    throw new Error('Caption segmentation produced an incomplete timeline')
  }

  await writeFile(captionsPath, source, 'utf8')
  await writeFile(lessonPath, `${JSON.stringify({
    id: 'donald-trump-2017-inaugural-address',
    title: 'The Inaugural Address',
    speaker: 'Donald J. Trump',
    category: 'Presidential address',
    level: 'B1-B2',
    minutes: 17,
    sourceUrl: transcriptSource,
    segments,
  }, null, 2)}\n`, 'utf8')

  return { cueCount: parsed.cues.length, segmentCount: segments.length }
}

await mkdir(outputDirectory, { recursive: true })
const paragraphCount = await fetchTranscript()
const captions = await fetchCaptions()
await downloadAudio()

const audioBytes = (await stat(audioPath)).size
const metadata = {
  id: 'donald-trump-2017-inaugural-address',
  title: 'The Inaugural Address',
  speaker: 'Donald J. Trump',
  date: '2017-01-20',
  location: 'Washington, D.C.',
  language: 'en-US',
  durationSeconds: 1008.65161,
  transcript: {
    file: 'transcript-official.md',
    sourceUrl: transcriptSource,
    sourcePublisher: 'The White House Historical Archive',
    kind: 'prepared-remarks',
    paragraphCount,
  },
  captions: {
    file: 'captions-en.vtt',
    sourceUrl: captionsSource,
    sourceVideoUrl: captionedVideo,
    cueCount: captions.cueCount,
    segmentCount: captions.segmentCount,
  },
  audio: {
    file: 'audio.mp3',
    bytes: audioBytes,
    sha256: await sha256(audioPath),
    mimeType: 'audio/mpeg',
    sourceUrl: commonsPage,
    derivativeUrl: audioSource,
    originalVideoUrl: originalVideo,
    license: 'Public domain',
  },
}

await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
console.log(`Saved ${captions.segmentCount} timed segments, ${paragraphCount} transcript paragraphs, and ${(audioBytes / 1024 / 1024).toFixed(2)} MiB of audio.`)
