import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import * as OpenCC from 'opencc-js'

const toHongKongTraditional = OpenCC.Converter({ from: 'cn', to: 'hk' })

const transcriptCorrections = new Map([
  ['其實我一時而落這麼久', '我主持了這麼久的《一綫娛樂》'],
  ['終於讓我等到這一天', '終於等到這一天了'],
  ['就是和我的偶像黎明黎明來做訪問', '就是和我的偶像黎明做訪問'],
  ['不聞其長', '願聞其詳'],
  ['人事關係、人物關係', '人事關係、人脈關係'],
  ['因為這次整個抱著春天', '因為今次這個《抱著春天》'],
  ['是我很久的朋友', '是我很多年的朋友'],
  ['小爺杰 王二興 精於你', ''],
  ['出現一隻過室，他都說，可否這些燈能夠浪漫一些，暗黃一些那些呢？', ''],
])

const materials = [
  { directory: '2016-line-entertainment-interview', segmentIdStart: 9001 },
  { directory: '2017-viutv-interviu', segmentIdStart: 12001 },
  { directory: '2016-crhk-903-short-interview', segmentIdStart: 15001 },
  { directory: '2016-crhk-903-full-interview', segmentIdStart: 18001 },
  { directory: '1993-radio-interview', segmentIdStart: 21001 },
]

function formatVttTime(milliseconds) {
  const safe = Math.max(0, Math.round(milliseconds))
  const hours = Math.floor(safe / 3_600_000)
  const minutes = Math.floor((safe % 3_600_000) / 60_000)
  const seconds = Math.floor((safe % 60_000) / 1_000)
  const millis = safe % 1_000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function formatTranscriptTime(milliseconds) {
  const minutes = Math.floor(milliseconds / 60_000)
  const seconds = Math.floor((milliseconds % 60_000) / 1_000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function cleanText(value) {
  const normalized = toHongKongTraditional(value)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '，')
    .replace(/\?/g, '？')
    .replace(/!+/g, '！')
    .replace(/\b(?:Lion|Eon|Diamn)\b/gi, 'Leon')
    .replace(/(?:黎[鳴鸣鶏鸡雅鸥])+|麗明|來明/g, '黎明')
    .replace(/字幕志愿者/gu, '字幕志願者')
  return transcriptCorrections.get(normalized) ?? normalized
}

function cleanSegments(rawSegments, durationSeconds, firstId) {
  const durationMilliseconds = durationSeconds * 1_000
  const cleaned = rawSegments
    .map((segment) => ({
      startMs: Math.max(0, segment.offsets.from),
      endMs: Math.min(durationMilliseconds, segment.offsets.to),
      text: cleanText(segment.text),
    }))
    .filter((segment) => segment.endMs > segment.startMs)
    .filter((segment) => segment.text && !segment.text.includes('\uFFFD'))
    .filter((segment) => !/(.)\1{7}/u.test(segment.text))
    .filter((segment) => !/^字幕(志願者|製作)[:： ]/u.test(segment.text))

  const deduplicated = []
  for (const segment of cleaned) {
    const previous = deduplicated.at(-1)
    if (previous && previous.text === segment.text && segment.startMs - previous.endMs < 1_500) {
      previous.endMs = Math.max(previous.endMs, segment.endMs)
      continue
    }
    deduplicated.push(segment)
  }

  return deduplicated.map((segment, index) => ({
    id: firstId + index,
    start: Number((segment.startMs / 1_000).toFixed(3)),
    end: Number((segment.endMs / 1_000).toFixed(3)),
    text: segment.text,
    translation: '',
  }))
}

for (const material of materials) {
  const root = new URL(`../content/cantonese/leon-lai/${material.directory}/`, import.meta.url)
  const artifact = new URL(`../.artifacts/leon-transcripts/${material.directory}-contextless.json`, import.meta.url)
  const rawTranscriptPath = new URL('transcript-raw.json', root)
  await mkdir(root, { recursive: true })
  try {
    await stat(artifact)
    await copyFile(artifact, rawTranscriptPath)
  } catch {
    await stat(rawTranscriptPath)
  }

  const [source, rawTranscript] = await Promise.all([
    readFile(new URL('source.json', root), 'utf8').then(JSON.parse),
    readFile(rawTranscriptPath, 'utf8').then(JSON.parse),
  ])
  const segments = cleanSegments(rawTranscript.transcription, source.durationSeconds, material.segmentIdStart)
  if (segments.length < 20) throw new Error(`${material.directory}: transcript has too few usable segments`)

  const lesson = {
    id: source.id,
    title: source.title,
    speaker: source.speaker,
    category: '粵語訪談',
    level: '粵語',
    minutes: Math.round(source.durationSeconds / 60),
    sourceUrl: source.source.url,
    segments,
  }
  const captions = [
    'WEBVTT',
    '',
    ...segments.flatMap((segment) => [
      `${formatVttTime(segment.start * 1_000)} --> ${formatVttTime(segment.end * 1_000)}`,
      segment.text,
      '',
    ]),
  ].join('\n')
  const transcript = [
    `# ${source.title}`,
    '',
    `- 講者：${source.speaker}`,
    `- 語言：香港粵語（繁體中文）`,
    `- 來源：${source.source.url}`,
    `- 說明：由本地語音模型生成時間軸，並進行重複句與異常片段清理。`,
    '',
    ...segments.map((segment) => `[${formatTranscriptTime(segment.start * 1_000)}] ${segment.text}`),
    '',
  ].join('\n')
  const metadata = {
    id: source.id,
    title: source.title,
    speaker: source.speaker,
    date: source.date,
    location: '香港',
    language: 'yue-Hant-HK',
    durationSeconds: source.durationSeconds,
    transcript: {
      file: 'transcript-yue-Hant.md',
      rawFile: 'transcript-raw.json',
      sourceUrl: source.source.url,
      sourcePublisher: source.source.platform,
      kind: 'machine-transcript',
      model: 'whisper.cpp large-v3-turbo-q5_0',
      segmentCount: segments.length,
      qualityControl: 'Context isolation, duplicate removal, invalid-duration filtering, and sampled checks against burned-in captions.',
    },
    captions: {
      file: 'captions-yue-Hant.vtt',
      sourceUrl: source.source.url,
      sourceVideoUrl: source.source.url,
      segmentCount: segments.length,
    },
    audio: {
      ...source.audio,
      sourceUrl: source.source.url,
      sourceCid: source.source.cid,
      rights: source.source.rights,
    },
    cover: source.cover,
  }

  await Promise.all([
    writeFile(new URL('lesson.json', root), `${JSON.stringify(lesson, null, 2)}\n`, 'utf8'),
    writeFile(new URL('captions-yue-Hant.vtt', root), captions, 'utf8'),
    writeFile(new URL('transcript-yue-Hant.md', root), transcript, 'utf8'),
    writeFile(new URL('translations-zh-CN.json', root), `${JSON.stringify({ locale: 'zh-CN', kind: 'none', translations: {} }, null, 2)}\n`, 'utf8'),
    writeFile(new URL('metadata.json', root), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
  ])
  console.log(`${source.title}: ${segments.length} segments`)
}
