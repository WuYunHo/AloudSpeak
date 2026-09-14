import { access, appendFile, mkdir, readFile, rm, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const source = await (await import('node:fs/promises')).readFile(new URL('../src/tvbLessons.ts', import.meta.url), 'utf8')
const ids = [...source.matchAll(/'([A-Za-z0-9_-]{11})'/g)].map((match) => match[1])
const uniqueIds = [...new Set(ids.filter((id) => id !== 'yue-Hant-HK'))]
const outputRoot = new URL('../public/tvb/audio/', import.meta.url)
await mkdir(outputRoot, { recursive: true })

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' })
    let stdout = ''
    let stderr = ''
    if (options.capture) {
      child.stdout.on('data', (chunk) => { stdout += chunk })
      child.stderr.on('data', (chunk) => { stderr += chunk })
    }
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} exited with ${code}: ${stderr}`)))
  })
}

async function fetchAudio(videoId) {
  const output = new URL(`${videoId}.mp3`, outputRoot)
  if (await exists(output)) return
  // The iOS client consistently returns a CDN host reachable in the build environment.
  const body = JSON.stringify({ context: { client: { clientName: 'IOS', clientVersion: '20.10.4', hl: 'zh-CN' } }, videoId })
  const escapedBody = body.replace(/'/g, "''")
  const playerCommand = `$response = Invoke-WebRequest -UseBasicParsing -Uri 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false' -Method Post -ContentType 'application/json' -Body '${escapedBody}' -Headers @{'User-Agent'='com.google.ios.youtube/20.10.4'} -TimeoutSec 60; $response.Content`
  const playerJson = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', playerCommand], { capture: true })
  const data = JSON.parse(playerJson)
  const audio = (data.streamingData?.adaptiveFormats || [])
    .filter((format) => format.mimeType?.startsWith('audio/') && format.url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]
  if (!audio) throw new Error(`${videoId}: no playable audio stream`)
  const raw = new URL(`${videoId}.m4a`, outputRoot)
  await rm(raw, { force: true })
  const totalBytes = Number(audio.contentLength || new URL(audio.url).searchParams.get('clen'))
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) throw new Error(`${videoId}: audio stream has no content length`)
  const chunkSize = 200_000
  const chunkPath = fileURLToPath(new URL(`${videoId}.part`, outputRoot))
  let complete = true
  for (let start = 0; start < totalBytes; start += chunkSize) {
    const end = Math.min(totalBytes - 1, start + chunkSize - 1)
    let received = false
    for (let attempt = 1; attempt <= 4 && !received; attempt += 1) {
      await rm(chunkPath, { force: true })
      const escapedUrl = audio.url.replace(/'/g, "''")
      const escapedPath = chunkPath.replace(/'/g, "''")
      const command = `$req=[System.Net.HttpWebRequest]::Create('${escapedUrl}'); $req.UserAgent='com.google.ios.youtube/20.10.4'; $req.AddRange(${start},${end}); $resp=$req.GetResponse(); $stream=$resp.GetResponseStream(); $out=[System.IO.File]::Create('${escapedPath}'); $stream.CopyTo($out); $out.Close(); $stream.Close(); $resp.Close()`
      try {
        await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command])
        received = (await stat(chunkPath)).size === end - start + 1
      } catch {
        received = false
      }
      if (!received && attempt < 4) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
    if (!received) {
      if (start === 0) throw new Error(`${videoId}: failed downloading initial audio bytes`)
      complete = false
      break
    }
    await appendFile(fileURLToPath(raw), await readFile(chunkPath))
    await rm(chunkPath, { force: true })
  }
  await run(ffmpegPath, ['-y', '-i', fileURLToPath(raw), '-vn', '-codec:a', 'libmp3lame', '-b:a', '96k', fileURLToPath(output)])
  await rm(raw, { force: true })
  console.log(`TVB ${videoId}: audio ready${complete ? '' : ' (first playable segment)'}`)
}

for (const videoId of uniqueIds) await fetchAudio(videoId)
