import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const outputDir = '.artifacts'
const baseUrl = 'http://127.0.0.1:5173/'

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ executablePath: edgePath, headless: true })
const errors = []

async function checkViewport(name, viewport) {
  const page = await browser.newPage({ viewport })
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`))

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'The Inaugural Address', level: 1 }).waitFor()
  await page.locator('.album-meta').getByText('Donald J. Trump').waitFor()
  await page.locator('.lyric-line').first().getByText(/首席大法官罗伯茨/).waitFor()

  const layout = await page.evaluate(() => {
    const stage = document.querySelector('.listening-stage')
    const player = document.querySelector('.player-bar')
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      playerOverlapsStage: Boolean(stage && player && stage.getBoundingClientRect().bottom > player.getBoundingClientRect().top + 1),
      lyricsScrollable: Boolean(document.querySelector('.lyrics-viewport')?.scrollHeight > document.querySelector('.lyrics-viewport')?.clientHeight),
    }
  })
  if (layout.horizontalOverflow) errors.push(`${name}: horizontal overflow detected`)
  if (layout.playerOverlapsStage) errors.push(`${name}: player overlaps the listening stage`)
  if (!layout.lyricsScrollable) errors.push(`${name}: lyrics viewport is not scrollable`)

  await page.screenshot({ path: `${outputDir}/${name}.png` })

  if (name === 'desktop') {
    await page.getByRole('button', { name: '播放', exact: true }).click()
    await page.getByRole('button', { name: '暂停' }).waitFor()
    await page.locator('.lyric-line').nth(2).click()
    await page.waitForFunction(() => document.querySelector('.time-current')?.textContent === '00:47')
    if (!await page.locator('.lyric-line').nth(2).evaluate((node) => node.classList.contains('active'))) {
      errors.push('desktop: clicked lyric did not become active')
    }
    await page.getByTitle('播放速度').click()
    await page.getByTitle('播放速度').filter({ hasText: '1x' }).waitFor()
    await page.getByRole('button', { name: '暂停' }).click()
  }

  await page.close()
}

await checkViewport('desktop', { width: 1440, height: 900 })
await checkViewport('mobile', { width: 390, height: 844 })
await browser.close()

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Visual checks passed: desktop 1440x900, mobile 390x844')
