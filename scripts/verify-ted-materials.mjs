import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

const directories = [
  'emily-esfahani-smith-more-to-life-than-being-happy',
  'wendy-suzuki-brain-changing-benefits-of-exercise',
  'anjali-sud-how-great-leaders-take-on-uncertainty',
  'daniel-alexander-jones-what-to-do-when-everything-feels-broken',
  'kate-raworth-healthy-economy-should-thrive-not-grow',
]
const expectedTimelineOffsetSeconds = 3.4

function parseVttTime(hours, minutes, seconds) {
  return Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds)
}

async function sha256(path) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

for (const directory of directories) {
  const root = new URL(`../content/ted/${directory}/`, import.meta.url)
  const [lesson, metadata, translations, , , captions] = await Promise.all([
    readFile(new URL('lesson.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('metadata.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('translations-zh-CN.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('transcript-en.md', root), 'utf8'),
    readFile(new URL('transcript-zh-CN.md', root), 'utf8'),
    readFile(new URL('captions-en.vtt', root), 'utf8'),
  ])
  const audioPath = new URL('audio.mp3', root)
  const coverPath = new URL('cover.jpg', root)
  const [audioStat, coverStat] = await Promise.all([stat(audioPath), stat(coverPath)])
  if (audioStat.size < 1_000_000) throw new Error(`${directory}: audio is too small`)
  if (coverStat.size < 10_000) throw new Error(`${directory}: cover is too small`)
  if (lesson.segments.length < 10) throw new Error(`${directory}: transcript has too few segments`)
  if (lesson.segments.some((segment, index) => index && segment.start <= lesson.segments[index - 1].start)) {
    throw new Error(`${directory}: segment timeline is not strictly increasing`)
  }
  if (lesson.segments.some((segment) => segment.end <= segment.start || segment.end > metadata.durationSeconds)) {
    throw new Error(`${directory}: segment timeline exceeds the audio duration`)
  }
  if (metadata.captions.timelineAlignment?.offsetSeconds !== expectedTimelineOffsetSeconds) {
    throw new Error(`${directory}: expected a ${expectedTimelineOffsetSeconds}s Bilibili timeline offset`)
  }
  const vttTimes = [...captions.matchAll(/(\d{2}):(\d{2}):(\d{2}\.\d{3})/g)]
    .map((match) => parseVttTime(match[1], match[2], match[3]))
  if (!vttTimes.length || vttTimes[0] !== lesson.segments[0].start) {
    throw new Error(`${directory}: VTT and lesson timelines start at different times`)
  }
  if (vttTimes.some((time) => time > metadata.durationSeconds + 0.001)) {
    throw new Error(`${directory}: VTT timeline exceeds the audio duration`)
  }
  const translated = lesson.segments.filter((segment) => translations.translations[String(segment.id)]).length
  if (translated / lesson.segments.length < 0.8) throw new Error(`${directory}: Chinese translation coverage is below 80%`)
  if (metadata.audio.bytes !== audioStat.size || metadata.audio.sha256 !== await sha256(audioPath)) {
    throw new Error(`${directory}: audio metadata does not match the file`)
  }
  if (metadata.cover.bytes !== coverStat.size || metadata.cover.sha256 !== await sha256(coverPath)) {
    throw new Error(`${directory}: cover metadata does not match the file`)
  }
  console.log(`${directory}: ${lesson.segments.length} segments, ${translated} translated, ${(audioStat.size / 1_000_000).toFixed(1)} MB`)
}
