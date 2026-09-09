import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import * as cheerio from 'cheerio'
import ffmpegPath from 'ffmpeg-static'
import webvtt from 'node-webvtt'

const materials = [
  {
    id: 'donald-trump-2020-address-to-the-nation',
    directory: '2020-address-to-the-nation',
    title: 'Address to the Nation',
    date: '2020-03-11',
    location: 'Washington, D.C.',
    level: 'B1-B2',
    minutes: 10,
    durationSeconds: 571.66,
    segmentIdStart: 2001,
    transcriptKind: 'prepared-remarks',
    transcriptFile: 'transcript-official.md',
    transcriptSource: 'https://trumpwhitehouse.archives.gov/briefings-statements/remarks-president-trump-address-nation/',
    commonsPage: 'https://commons.wikimedia.org/wiki/File:President_Trump_Addresses_the_Nation_-_March_11,_2020.webm',
    mediaSource: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/d/d9/President_Trump_Addresses_the_Nation_-_March_11%2C_2020.webm/President_Trump_Addresses_the_Nation_-_March_11%2C_2020.webm.240p.vp9.webm',
    captionsSource: 'https://commons.wikimedia.org/w/api.php?action=timedtext&title=File%3APresident%20Trump%20Addresses%20the%20Nation%20-%20March%2011%2C%202020.webm&lang=en&trackformat=vtt&format=json',
  },
  {
    id: 'donald-trump-2018-syria-address',
    directory: '2018-syria-address',
    title: 'Address to the Nation on Syria',
    date: '2018-04-13',
    location: 'Washington, D.C.',
    level: 'B2',
    minutes: 8,
    durationSeconds: 460.9,
    segmentIdStart: 3001,
    transcriptKind: 'caption-transcript',
    transcriptFile: 'transcript-from-captions.md',
    transcriptSource: null,
    commonsPage: 'https://commons.wikimedia.org/wiki/File:President_Trump_Delivers_an_Address_to_the_Nation_(April_14,_2018).webm',
    mediaSource: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/50/President_Trump_Delivers_an_Address_to_the_Nation_%28April_14%2C_2018%29.webm/President_Trump_Delivers_an_Address_to_the_Nation_%28April_14%2C_2018%29.webm.240p.vp9.webm',
    captionsSource: 'https://commons.wikimedia.org/w/api.php?action=timedtext&title=File%3APresident%20Trump%20Delivers%20an%20Address%20to%20the%20Nation%20%28April%2014%2C%202018%29.webm&lang=en&trackformat=vtt&format=json',
  },
]

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function download(url, destination) {
  if (await exists(destination)) return
  const partial = new URL(`${destination.pathname.split('/').at(-1)}.part`, destination)
  await rm(partial, { force: true })
  const curlCommand = process.platform === 'win32' ? 'curl.exe' : 'curl'
  await new Promise((resolve, reject) => {
    const process = spawn(curlCommand, [
      '--fail', '--location', '--retry', '4', '--retry-all-errors',
      '--connect-timeout', '30', '--output', fileURLToPath(partial), url,
    ], { stdio: 'inherit' })
    process.on('error', reject)
    process.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`curl exited with code ${code}`)))
  })
  await rename(partial, destination)
}

async function sha256(path) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

function runFfmpeg(inputPath, outputPath) {
  if (!ffmpegPath) throw new Error('ffmpeg-static did not provide a binary')
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegPath, [
      '-y', '-i', fileURLToPath(inputPath), '-vn', '-codec:a', 'libmp3lame', '-b:a', '128k', fileURLToPath(outputPath),
    ], { stdio: 'inherit' })
    process.on('error', reject)
    process.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)))
  })
}

function cleanCueText(text) {
  return cheerio.load(text).text().replace(/\s+/g, ' ').trim()
}

function buildSegments(vttSource, firstId) {
  const parsed = webvtt.parse(vttSource)
  const words = []
  for (const cue of parsed.cues) {
    const text = cleanCueText(cue.text)
    if (!text || /^\[.*\]$/.test(text) || /^\(Mouthing\):/i.test(text)) continue
    const cueWords = text.split(' ')
    const wordDuration = (cue.end - cue.start) / cueWords.length
    cueWords.forEach((word, index) => words.push({
      text: word,
      start: cue.start + wordDuration * index,
      end: cue.start + wordDuration * (index + 1),
    }))
  }

  const segments = []
  let current = []
  for (const word of words) {
    current.push(word)
    const endsSentence = /[.!?]["']?$/.test(word.text)
    const splitLongClause = current.length >= 34 && /[,;:]["']?$/.test(word.text)
    if (endsSentence || splitLongClause) {
      segments.push({
        id: firstId + segments.length,
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
      id: firstId + segments.length,
      start: Number(current[0].start.toFixed(3)),
      end: Number(current.at(-1).end.toFixed(3)),
      text: current.map((item) => item.text).join(' '),
      translation: '',
    })
  }
  return { cueCount: parsed.cues.length, segments }
}

async function fetchOfficialTranscript(material, outputDirectory) {
  if (!material.transcriptSource) return null
  const response = await fetch(material.transcriptSource, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Transcript download failed: ${response.status}`)
  const $ = cheerio.load(await response.text())
  const paragraphs = $('.page-content__content.editor > p')
    .map((_, element) => $(element).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter(Boolean)
  const openingIndex = paragraphs.findIndex((paragraph) => paragraph.toLowerCase().includes('my fellow americans'))
  const closingIndex = paragraphs.findIndex((paragraph) => paragraph.includes('God bless you, and God bless America.'))
  if (openingIndex < 0 || closingIndex < openingIndex) throw new Error('Official transcript boundaries not found')
  const speech = paragraphs.slice(openingIndex, closingIndex + 1)
  const markdown = [
    `# ${material.title}`,
    '',
    '- Speaker: Donald J. Trump',
    `- Date: ${material.date}`,
    `- Location: ${material.location}`,
    `- Official transcript: ${material.transcriptSource}`,
    '- Document type: Prepared remarks, not a verbatim audio transcription',
    '',
    ...speech.flatMap((paragraph) => [paragraph, '']),
  ].join('\n').trimEnd() + '\n'
  await writeFile(new URL(material.transcriptFile, outputDirectory), markdown, 'utf8')
  return speech.length
}

async function processMaterial(material) {
  const outputDirectory = new URL(`../content/donald-trump/${material.directory}/`, import.meta.url)
  const captionsPath = new URL('captions-en.vtt', outputDirectory)
  const mediaPath = new URL('source-video.webm', outputDirectory)
  const audioPath = new URL('audio.mp3', outputDirectory)
  await mkdir(outputDirectory, { recursive: true })

  await download(material.captionsSource, captionsPath)
  const vttSource = await readFile(captionsPath, 'utf8')
  const { cueCount, segments } = buildSegments(vttSource, material.segmentIdStart)
  if (segments.length < 20) throw new Error(`${material.id}: incomplete caption timeline`)

  if (!material.transcriptSource) {
    const markdown = [
      `# ${material.title}`,
      '',
      '- Speaker: Donald J. Trump',
      `- Date: ${material.date}`,
      `- Source captions: ${material.commonsPage}`,
      '- Document type: Transcript reconstructed from the English caption track',
      '',
      ...segments.flatMap((segment) => [segment.text, '']),
    ].join('\n').trimEnd() + '\n'
    await writeFile(new URL(material.transcriptFile, outputDirectory), markdown, 'utf8')
  }
  const paragraphCount = await fetchOfficialTranscript(material, outputDirectory)

  if (!await exists(audioPath)) {
    await download(material.mediaSource, mediaPath)
    await runFfmpeg(mediaPath, audioPath)
    await rm(mediaPath, { force: true })
  }

  const audioBytes = (await stat(audioPath)).size
  await writeFile(new URL('lesson.json', outputDirectory), `${JSON.stringify({
    id: material.id,
    title: material.title,
    speaker: 'Donald J. Trump',
    category: 'Presidential address',
    level: material.level,
    minutes: material.minutes,
    year: Number(material.date.slice(0, 4)),
    sourceUrl: material.transcriptSource || material.commonsPage,
    segments,
  }, null, 2)}\n`, 'utf8')

  await writeFile(new URL('metadata.json', outputDirectory), `${JSON.stringify({
    id: material.id,
    title: material.title,
    speaker: 'Donald J. Trump',
    date: material.date,
    location: material.location,
    language: 'en-US',
    durationSeconds: material.durationSeconds,
    transcript: {
      file: material.transcriptFile,
      sourceUrl: material.transcriptSource || material.commonsPage,
      sourcePublisher: material.transcriptSource ? 'The White House Historical Archive' : 'Wikimedia Commons captions',
      kind: material.transcriptKind,
      paragraphCount,
    },
    captions: {
      file: 'captions-en.vtt',
      sourceUrl: material.captionsSource,
      sourceVideoUrl: material.commonsPage,
      cueCount,
      segmentCount: segments.length,
    },
    audio: {
      file: 'audio.mp3',
      bytes: audioBytes,
      sha256: await sha256(audioPath),
      mimeType: 'audio/mpeg',
      sourceUrl: material.commonsPage,
      derivativeUrl: material.mediaSource,
      license: 'Public domain',
    },
  }, null, 2)}\n`, 'utf8')

  console.log(`${material.title}: ${segments.length} segments, ${(audioBytes / 1_000_000).toFixed(1)} MB`)
}

for (const material of materials) await processMaterial(material)
