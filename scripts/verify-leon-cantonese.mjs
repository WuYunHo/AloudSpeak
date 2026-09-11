import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const materials = [
  { directory: '2016-line-entertainment-interview', firstId: 9001 },
  { directory: '2017-viutv-interviu', firstId: 12001 },
  { directory: '2016-crhk-903-short-interview', firstId: 15001 },
  { directory: '2016-crhk-903-full-interview', firstId: 18001 },
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function sha256(url) {
  return createHash('sha256').update(await readFile(url)).digest('hex')
}

function readMediaDuration(url) {
  assert(ffmpegPath, 'ffmpeg-static did not provide a binary')
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-i', fileURLToPath(url)])
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', () => {
      const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (!match) return reject(new Error(`Could not read duration for ${fileURLToPath(url)}`))
      resolve(Number(match[1]) * 3_600 + Number(match[2]) * 60 + Number(match[3]))
    })
  })
}

for (const material of materials) {
  const root = new URL(`../content/cantonese/leon-lai/${material.directory}/`, import.meta.url)
  const audioUrl = new URL('audio.mp3', root)
  const coverUrl = new URL('cover.jpg', root)
  const [source, lesson, metadata, translations, captions, transcript, audioStats, coverStats, audioDuration] = await Promise.all([
    readFile(new URL('source.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('lesson.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('metadata.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('translations-zh-CN.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('captions-yue-Hant.vtt', root), 'utf8'),
    readFile(new URL('transcript-yue-Hant.md', root), 'utf8'),
    stat(audioUrl),
    stat(coverUrl),
    readMediaDuration(audioUrl),
  ])

  const label = material.directory
  assert(source.id === lesson.id && lesson.id === metadata.id, `${label}: IDs do not match`)
  assert(metadata.language === 'yue-Hant-HK', `${label}: expected yue-Hant-HK metadata`)
  assert(metadata.transcript.kind === 'machine-transcript', `${label}: transcript provenance is incorrect`)
  assert(metadata.audio.bytes === audioStats.size, `${label}: audio byte size does not match`)
  assert(metadata.cover.bytes === coverStats.size, `${label}: cover byte size does not match`)
  assert(metadata.audio.sha256 === await sha256(audioUrl), `${label}: audio hash does not match`)
  assert(metadata.cover.sha256 === await sha256(coverUrl), `${label}: cover hash does not match`)
  assert(Math.abs(audioDuration - metadata.durationSeconds) <= 0.15, `${label}: audio duration differs from metadata`)
  assert(lesson.segments.length >= 20, `${label}: transcript has too few segments`)
  assert(metadata.transcript.segmentCount === lesson.segments.length, `${label}: transcript segment count does not match`)
  assert(metadata.captions.segmentCount === lesson.segments.length, `${label}: caption segment count does not match`)
  assert(translations.locale === 'zh-CN' && translations.kind === 'machine-translation', `${label}: translation provenance is incorrect`)
  assert(Object.keys(translations.translations).length === lesson.segments.length, `${label}: translation count does not match segments`)
  assert(lesson.segments.every((segment) => segment.translation?.trim() && translations.translations[String(segment.id)] === segment.translation), `${label}: one or more Chinese translations are missing or mismatched`)
  assert(captions.startsWith('WEBVTT\n'), `${label}: invalid VTT header`)
  assert((captions.match(/ --> /g) || []).length === lesson.segments.length, `${label}: VTT cue count does not match`)
  assert((transcript.match(/^\[\d{2,}:\d{2}\] /gm) || []).length === lesson.segments.length, `${label}: transcript line count does not match`)

  const frequencies = new Map()
  lesson.segments.forEach((segment, index) => {
    assert(segment.id === material.firstId + index, `${label}: segment IDs are not contiguous`)
    assert(Number.isFinite(segment.start) && Number.isFinite(segment.end), `${label}: invalid segment time`)
    assert(segment.start >= 0 && segment.end > segment.start, `${label}: non-positive segment duration`)
    assert(segment.end <= audioDuration + 0.15, `${label}: segment exceeds audio duration`)
    if (index > 0) assert(segment.start > lesson.segments[index - 1].start, `${label}: start times are not strictly increasing`)
    assert(segment.text === segment.text.trim() && segment.text.length > 0, `${label}: empty or padded text`)
    assert(!segment.text.includes('\uFFFD'), `${label}: replacement character found`)
    assert(!/(.)\1{7}/u.test(segment.text), `${label}: repeated-character garbage found`)
    assert(!/\bJoyne\b|字幕志願者|字幕製作/iu.test(segment.text), `${label}: known hallucination found`)
    assert(!/下班|落班|上班|我們|你們|他們|這個|這些|那個|那些|沒有|不是|為什麼|為甚麼|甚麼|什麼|現在|今天|明天|剛才|一起|聊天|吃飯|回家/u.test(segment.text), `${label}: written-Mandarin wording remains in Cantonese transcript`)
    frequencies.set(segment.text, (frequencies.get(segment.text) || 0) + 1)
  })

  const highestFrequency = Math.max(...frequencies.values())
  assert(highestFrequency <= Math.max(12, Math.ceil(lesson.segments.length * 0.02)), `${label}: one line repeats suspiciously often`)
  console.log(`${label}: ${lesson.segments.length} segments, ${audioDuration.toFixed(2)} seconds`)
}

console.log('All 4 Leon Lai Cantonese materials verified.')
