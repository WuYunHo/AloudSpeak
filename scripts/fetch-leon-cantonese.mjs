import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import ffmpegPath from 'ffmpeg-static'

const materials = [
  {
    bvid: 'BV1Qs411z7hp',
    cid: 7136793,
    directory: '2016-line-entertainment-interview',
    title: '黎明《一綫娛樂》專訪',
    date: '2016-04-18',
  },
  {
    bvid: 'BV1hx411L7zM',
    cid: 26778647,
    directory: '2017-viutv-interviu',
    title: '黎明 ViuTV《Interviu》專訪',
    date: '2017-11-17',
  },
  {
    bvid: 'BV11T4y1A7Su',
    cid: 238265648,
    directory: '2016-crhk-903-short-interview',
    title: '黎明叱咤 903 電台訪問（短版）',
    date: '2016-03-02',
  },
  {
    bvid: 'BV1Hi4y1C7C8',
    cid: 547965699,
    directory: '2016-crhk-903-full-interview',
    title: '黎明《口水多過浪花》完整訪問',
    date: '2016-03-02',
  },
  {
    bvid: 'BV1cS4y1S7AS',
    cid: 556965250,
    directory: '1993-radio-interview',
    title: '黎明 1993《海角天涯》電台訪問',
    date: '1993-06-04',
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

async function requestJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', ...headers },
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.json()
}

async function download(urlOrUrls, destination, headers = {}) {
  if (await exists(destination)) return
  const partial = new URL(`${destination.pathname.split('/').at(-1)}.part`, destination)
  const curlCommand = process.platform === 'win32' ? 'curl.exe' : 'curl'
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls]
  let lastError

  for (const url of urls.filter(Boolean)) {
    await rm(partial, { force: true })
    const args = [
      '--fail', '--location', '--retry', '3', '--retry-all-errors',
      '--connect-timeout', '20', '--max-time', '900', '--output', fileURLToPath(partial),
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
      '-b:a', '96k', fileURLToPath(outputPath),
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

for (const material of materials) {
  const sourceUrl = `https://www.bilibili.com/video/${material.bvid}/`
  const headers = { 'User-Agent': 'Mozilla/5.0', Referer: sourceUrl }
  const outputDirectory = new URL(`../content/cantonese/leon-lai/${material.directory}/`, import.meta.url)
  const streamPath = new URL('audio.m4s', outputDirectory)
  const audioPath = new URL('audio.mp3', outputDirectory)
  const coverPath = new URL('cover.jpg', outputDirectory)
  await mkdir(outputDirectory, { recursive: true })

  const view = (await requestJson(`https://api.bilibili.com/x/web-interface/view?bvid=${material.bvid}`, headers)).data
  if (!view || view.cid !== material.cid) throw new Error(`${material.bvid}: video CID no longer matches`)
  const play = (await requestJson(
    `https://api.bilibili.com/x/player/playurl?bvid=${material.bvid}&cid=${material.cid}&qn=64&fnval=16&fourk=0`,
    headers,
  )).data
  const audioStreams = play?.dash?.audio
  if (!audioStreams?.length) throw new Error(`${material.bvid}: no DASH audio stream`)
  const audioStream = [...audioStreams].sort((a, b) => b.bandwidth - a.bandwidth)[0]

  if (!await exists(audioPath)) {
    await download([
      audioStream.baseUrl || audioStream.base_url,
      ...(audioStream.backupUrl || audioStream.backup_url || []),
    ], streamPath, headers)
    await runFfmpeg(streamPath, audioPath)
    await rm(streamPath, { force: true })
  }
  await download(view.pic, coverPath, headers)

  const [audioBytes, coverBytes, durationSeconds] = await Promise.all([
    stat(audioPath).then(({ size }) => size),
    stat(coverPath).then(({ size }) => size),
    readMediaDuration(audioPath),
  ])
  const source = {
    id: `leon-lai-${material.directory}`,
    title: material.title,
    speaker: '黎明（Leon Lai）',
    date: material.date,
    language: 'zh-HK',
    durationSeconds,
    source: {
      platform: 'Bilibili',
      url: sourceUrl,
      bvid: material.bvid,
      cid: material.cid,
      uploadedTitle: view.title,
      uploader: view.owner?.name,
      rights: 'Source platform terms apply; collected for local educational use.',
    },
    audio: {
      file: 'audio.mp3',
      bytes: audioBytes,
      sha256: await sha256(audioPath),
      mimeType: 'audio/mpeg',
    },
    cover: {
      file: 'cover.jpg',
      bytes: coverBytes,
      sha256: await sha256(coverPath),
      sourceUrl: view.pic,
    },
  }
  await writeFile(new URL('source.json', outputDirectory), `${JSON.stringify(source, null, 2)}\n`, 'utf8')
  console.log(`${material.title}: ${(durationSeconds / 60).toFixed(1)} min, ${(audioBytes / 1_000_000).toFixed(1)} MB`)
}
