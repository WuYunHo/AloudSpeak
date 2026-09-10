import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import * as cheerio from 'cheerio'
import ffmpegPath from 'ffmpeg-static'

const bvid = 'BV1UbyZB9ERb'
const bilibiliUrl = `https://www.bilibili.com/video/${bvid}/`
const requestHeaders = {
  'User-Agent': 'Mozilla/5.0',
  Referer: bilibiliUrl,
}

const materials = [
  {
    page: 1,
    cid: 33622133700,
    segmentIdStart: 4001,
    timelineOffsetSeconds: 3.4,
    directory: 'emily-esfahani-smith-more-to-life-than-being-happy',
    chineseTitle: '人生不只是要快乐',
    tedSlug: 'emily_esfahani_smith_there_s_more_to_life_than_being_happy',
  },
  {
    page: 2,
    cid: 33622196378,
    segmentIdStart: 5001,
    timelineOffsetSeconds: 3.4,
    directory: 'wendy-suzuki-brain-changing-benefits-of-exercise',
    chineseTitle: '爱运动的人更聪明，更健康！',
    tedSlug: 'wendy_suzuki_the_brain_changing_benefits_of_exercise',
  },
  {
    page: 3,
    cid: 33622197754,
    segmentIdStart: 6001,
    timelineOffsetSeconds: 3.4,
    directory: 'anjali-sud-how-great-leaders-take-on-uncertainty',
    chineseTitle: '成功人士是如何应对挑战的？',
    tedSlug: 'anjali_sud_and_stephanie_mehta_how_great_leaders_take_on_uncertainty',
  },
  {
    page: 4,
    cid: 33622199729,
    segmentIdStart: 7001,
    timelineOffsetSeconds: 3.4,
    directory: 'daniel-alexander-jones-what-to-do-when-everything-feels-broken',
    chineseTitle: '当一切都陷入困境时，我们该怎么办？',
    tedSlug: 'daniel_alexander_jones_what_to_do_when_everything_feels_broken',
  },
  {
    page: 5,
    cid: 33622262560,
    segmentIdStart: 8001,
    timelineOffsetSeconds: 3.4,
    directory: 'kate-raworth-healthy-economy-should-thrive-not-grow',
    chineseTitle: '健康的经济应该以繁荣为目的，而不只是增长',
    tedSlug: 'kate_raworth_a_healthy_economy_should_be_designed_to_thrive_not_grow',
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

async function request(url, options = {}) {
  let lastError
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'User-Agent': 'Mozilla/5.0', ...options.headers },
        signal: AbortSignal.timeout(60_000),
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return response
    } catch (error) {
      lastError = error
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000))
    }
  }
  throw new Error(`Request failed for ${url}: ${lastError?.message}`)
}

async function requestJson(url, options) {
  return (await request(url, options)).json()
}

async function download(urlOrUrls, destination, headers = {}) {
  if (await exists(destination)) return
  const partial = new URL(`${destination.pathname.split('/').at(-1)}.part`, destination)
  const curlCommand = process.platform === 'win32' ? 'curl.exe' : 'curl'
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls]
  let lastError
  for (const url of urls) {
    await rm(partial, { force: true })
    const args = [
      '--fail', '--location', '--retry', '2', '--retry-all-errors',
      '--connect-timeout', '20', '--max-time', '300', '--speed-time', '15',
      '--speed-limit', '10240', '--output', fileURLToPath(partial),
    ]
    for (const [name, value] of Object.entries(headers)) args.push('--header', `${name}: ${value}`)
    args.push(url)
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(curlCommand, args, { stdio: 'inherit' })
        child.on('error', reject)
        child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`curl exited with code ${code}`)))
      })
      await rename(partial, destination)
      return
    } catch (error) {
      lastError = error
    }
  }
  await rm(partial, { force: true })
  throw new Error(`All download sources failed: ${lastError?.message}`)
}

function runFfmpeg(inputPath, outputPath) {
  if (!ffmpegPath) throw new Error('ffmpeg-static did not provide a binary')
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      '-y', '-i', fileURLToPath(inputPath), '-vn', '-codec:a', 'libmp3lame',
      '-b:a', '128k', fileURLToPath(outputPath),
    ], { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)))
  })
}

function readMediaDuration(inputPath) {
  if (!ffmpegPath) throw new Error('ffmpeg-static did not provide a binary')
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ['-hide_banner', '-i', fileURLToPath(inputPath)])
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', () => {
      const match = stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (!match) return reject(new Error(`Could not read duration for ${fileURLToPath(inputPath)}`))
      resolve(Number(match[1]) * 3_600 + Number(match[2]) * 60 + Number(match[3]))
    })
  })
}

async function sha256(path) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function flattenCues(translation) {
  return translation.paragraphs
    .flatMap((paragraph) => paragraph.cues)
    .map((cue) => ({ time: cue.time, text: cleanText(cue.text) }))
    .filter((cue) => cue.text)
    .sort((a, b) => a.time - b.time)
}

function alignCues(cues, offsetSeconds, durationSeconds) {
  const offsetMilliseconds = offsetSeconds * 1_000
  const durationMilliseconds = durationSeconds * 1_000
  return cues
    .map((cue) => ({ ...cue, time: Math.min(cue.time + offsetMilliseconds, durationMilliseconds) }))
    .filter((cue) => cue.time < durationMilliseconds)
}

function joinParagraph(paragraph, language) {
  const texts = paragraph.cues.map((cue) => cleanText(cue.text)).filter(Boolean)
  return language === 'en' ? texts.join(' ') : texts.join('')
}

function buildSegments(englishCues, chineseCues, firstId, durationSeconds) {
  const groups = []
  const chineseIntervals = chineseCues.map((cue, index) => ({
    ...cue,
    endTime: chineseCues[index + 1]?.time ?? durationSeconds * 1_000,
  }))
  let current = []
  let wordCount = 0

  for (const cue of englishCues) {
    current.push(cue)
    wordCount += cue.text.split(/\s+/).length
    const sentenceEnd = /[.!?]["')\]]?$/.test(cue.text)
    const clauseEnd = wordCount >= 32 && /[,;:]["')\]]?$/.test(cue.text)
    if (sentenceEnd || clauseEnd || wordCount >= 50) {
      groups.push(current)
      current = []
      wordCount = 0
    }
  }
  if (current.length) groups.push(current)

  return groups.map((group, index) => {
    const startMs = group[0].time
    const endMs = groups[index + 1]?.[0].time ?? durationSeconds * 1_000
    const translation = chineseIntervals
      .filter((cue) => cue.time < endMs && cue.endTime > startMs)
      .map((cue) => cue.text)
      .join('')
    return {
      id: firstId + index,
      start: Number((startMs / 1_000).toFixed(3)),
      end: Number((endMs / 1_000).toFixed(3)),
      text: group.map((cue) => cue.text).join(' '),
      translation,
    }
  })
}

function formatVttTime(milliseconds) {
  const safe = Math.max(0, Math.round(milliseconds))
  const hours = Math.floor(safe / 3_600_000)
  const minutes = Math.floor((safe % 3_600_000) / 60_000)
  const seconds = Math.floor((safe % 60_000) / 1_000)
  const millis = safe % 1_000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

function buildVtt(cues, durationSeconds) {
  const lines = ['WEBVTT', '']
  cues.forEach((cue, index) => {
    const end = cues[index + 1]?.time ?? durationSeconds * 1_000
    lines.push(`${formatVttTime(cue.time)} --> ${formatVttTime(end)}`, cue.text, '')
  })
  return lines.join('\n')
}

async function fetchTedTranscript(slug, language) {
  const sourceUrl = `https://www.ted.com/talks/${slug}/transcript?language=${language}`
  const html = await (await request(sourceUrl)).text()
  const $ = cheerio.load(html)
  const rawData = $('#__NEXT_DATA__').text()
  if (!rawData) throw new Error(`${slug}: TED page did not include __NEXT_DATA__`)
  const page = JSON.parse(rawData).props?.pageProps
  const translation = page?.transcriptData?.translation
  if (!translation?.paragraphs?.length) throw new Error(`${slug}: missing ${language} transcript`)
  return { sourceUrl, translation, video: page.videoData }
}

async function downloadAudio(material, audioPath, streamPath) {
  if (await exists(audioPath)) return
  const apiUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${material.cid}&qn=64&fnval=16&fourk=0`
  const payload = await requestJson(apiUrl, { headers: requestHeaders })
  const audioStreams = payload.data?.dash?.audio
  if (!audioStreams?.length) throw new Error(`P${material.page}: no Bilibili audio stream`)
  const audioStream = [...audioStreams].sort((a, b) => b.bandwidth - a.bandwidth)[0]
  await download([
    audioStream.baseUrl || audioStream.base_url,
    ...(audioStream.backupUrl || audioStream.backup_url || []),
  ], streamPath, requestHeaders)
  await runFfmpeg(streamPath, audioPath)
  await rm(streamPath, { force: true })
}

async function processMaterial(material, pageData) {
  const outputDirectory = new URL(`../content/ted/${material.directory}/`, import.meta.url)
  const audioPath = new URL('audio.mp3', outputDirectory)
  const streamPath = new URL('audio.m4s', outputDirectory)
  const coverPath = new URL('cover.jpg', outputDirectory)
  await mkdir(outputDirectory, { recursive: true })

  const [english, chinese] = await Promise.all([
    fetchTedTranscript(material.tedSlug, 'en'),
    fetchTedTranscript(material.tedSlug, 'zh-cn'),
    downloadAudio(material, audioPath, streamPath),
  ])
  const durationSeconds = await readMediaDuration(audioPath)
  if (Math.abs(durationSeconds - pageData.duration) > 1) {
    throw new Error(`P${material.page}: downloaded audio duration does not match Bilibili metadata`)
  }
  const englishCues = alignCues(flattenCues(english.translation), material.timelineOffsetSeconds, durationSeconds)
  const chineseCues = alignCues(flattenCues(chinese.translation), material.timelineOffsetSeconds, durationSeconds)
  const segments = buildSegments(englishCues, chineseCues, material.segmentIdStart, durationSeconds)
  if (segments.length < 10) throw new Error(`P${material.page}: incomplete transcript segmentation`)

  const coverSource = english.video.primaryImageSet?.find((image) => image.aspectRatioName === '16x9')?.url
    || english.video.primaryImageSet?.[0]?.url
  if (!coverSource) throw new Error(`P${material.page}: TED cover image not found`)
  const coverUrl = `${coverSource}${coverSource.includes('?') ? '&' : '?'}w=1200`
  await download(coverUrl, coverPath)

  const transcriptHeader = (language, sourceUrl) => [
    `# ${language === 'en' ? english.video.title : material.chineseTitle}`,
    '',
    `- Speaker: ${english.video.presenterDisplayName}`,
    `- TED transcript: ${sourceUrl}`,
    `- Bilibili source: ${bilibiliUrl}?p=${material.page}`,
    '',
  ]
  const englishParagraphs = english.translation.paragraphs.map((paragraph) => joinParagraph(paragraph, 'en'))
  const chineseParagraphs = chinese.translation.paragraphs.map((paragraph) => joinParagraph(paragraph, 'zh-cn'))
  await writeFile(new URL('transcript-en.md', outputDirectory), [
    ...transcriptHeader('en', english.sourceUrl),
    ...englishParagraphs.flatMap((paragraph) => [paragraph, '']),
  ].join('\n').trimEnd() + '\n', 'utf8')
  await writeFile(new URL('transcript-zh-CN.md', outputDirectory), [
    ...transcriptHeader('zh-cn', chinese.sourceUrl),
    ...chineseParagraphs.flatMap((paragraph) => [paragraph, '']),
  ].join('\n').trimEnd() + '\n', 'utf8')
  await writeFile(new URL('captions-en.vtt', outputDirectory), buildVtt(englishCues, durationSeconds), 'utf8')

  const translations = Object.fromEntries(segments.map((segment) => [String(segment.id), segment.translation]))
  await writeFile(new URL('translations-zh-CN.json', outputDirectory), `${JSON.stringify({
    locale: 'zh-CN',
    kind: 'official-ted-translation',
    sourceUrl: chinese.sourceUrl,
    translations,
  }, null, 2)}\n`, 'utf8')

  const publishedDate = english.video.publishedAt?.slice(0, 10) || english.video.recordedOn || 'unknown'
  const sourceUrl = `https://www.ted.com/talks/${material.tedSlug}`
  const lesson = {
    id: `ted-${material.directory}`,
    title: english.video.title,
    speaker: english.video.presenterDisplayName,
    category: 'TED Talk',
    level: 'B2-C1',
    minutes: Math.round(durationSeconds / 60),
    year: Number(publishedDate.slice(0, 4)),
    sourceUrl,
    segments: segments.map(({ translation, ...segment }) => ({ ...segment, translation: '' })),
  }
  await writeFile(new URL('lesson.json', outputDirectory), `${JSON.stringify(lesson, null, 2)}\n`, 'utf8')

  const audioBytes = (await stat(audioPath)).size
  const coverBytes = (await stat(coverPath)).size
  const metadata = {
    id: lesson.id,
    title: lesson.title,
    localizedTitle: material.chineseTitle,
    speaker: lesson.speaker,
    date: publishedDate,
    location: 'TED',
    language: 'en-US',
    durationSeconds,
    transcript: {
      file: 'transcript-en.md',
      translatedFile: 'transcript-zh-CN.md',
      sourceUrl: english.sourceUrl,
      translationSourceUrl: chinese.sourceUrl,
      sourcePublisher: 'TED',
      kind: 'official-transcript',
      paragraphCount: englishParagraphs.length,
    },
    captions: {
      file: 'captions-en.vtt',
      sourceUrl: english.sourceUrl,
      sourceVideoUrl: `${bilibiliUrl}?p=${material.page}`,
      cueCount: englishCues.length,
      segmentCount: segments.length,
      timelineAlignment: {
        offsetSeconds: material.timelineOffsetSeconds,
        sourceTimeline: 'TED transcript cues',
        targetTimeline: 'Bilibili audio',
        calibration: 'Opening, midpoint, and late-talk samples checked against Bilibili burned-in captions.',
      },
    },
    audio: {
      file: 'audio.mp3',
      bytes: audioBytes,
      sha256: await sha256(audioPath),
      mimeType: 'audio/mpeg',
      sourceUrl: `${bilibiliUrl}?p=${material.page}`,
      sourceCid: material.cid,
      rights: 'Source platform terms apply; collected for local educational use.',
    },
    cover: {
      file: 'cover.jpg',
      bytes: coverBytes,
      sha256: await sha256(coverPath),
      sourceUrl: coverUrl,
    },
  }
  await writeFile(new URL('metadata.json', outputDirectory), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  console.log(`P${material.page} ${lesson.title}: ${segments.length} segments, ${(audioBytes / 1_000_000).toFixed(1)} MB`)
}

const viewPayload = await requestJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, { headers: requestHeaders })
const pages = viewPayload.data?.pages
if (!Array.isArray(pages) || pages.length < materials.length) throw new Error('Bilibili page list is incomplete')

for (const material of materials) {
  const pageData = pages.find((page) => page.page === material.page)
  if (!pageData || pageData.cid !== material.cid) throw new Error(`Bilibili P${material.page} no longer matches the expected CID`)
  await processMaterial(material, pageData)
}
