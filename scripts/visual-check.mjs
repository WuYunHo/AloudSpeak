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
  const playlistScrollable = await page.locator('.playlist').evaluate((node) => node.scrollHeight > node.clientHeight)
  if (name === 'desktop' && !playlistScrollable) errors.push('desktop: collection playlist is not vertically scrollable')

  const collectionCount = name === 'desktop'
    ? await page.locator('.playlist-collection').count()
    : await page.locator('.mobile-lesson-select optgroup').count()
  if (collectionCount !== 4) errors.push(`${name}: expected four lesson collections, found ${collectionCount}`)

  const leonLessonCount = name === 'desktop'
    ? await page.locator('.playlist-collection').nth(2).locator('.playlist-item').count()
    : await page.locator('.mobile-lesson-select optgroup').nth(2).locator('option').count()
  if (leonLessonCount !== 4) errors.push(`${name}: expected four Leon Lai lessons, found ${leonLessonCount}`)

  if (name === 'desktop') {
    const leonCoverUrls = await page.locator('.playlist-collection').nth(2).locator('.playlist-item img').evaluateAll(
      (images) => images.map((image) => image.getAttribute('src')),
    )
    if (new Set(leonCoverUrls).size !== 4) errors.push('desktop: Leon Lai lessons do not have four distinct covers')
  }

  await page.screenshot({ path: `${outputDir}/${name}.png` })

  if (name === 'desktop') {
    await page.getByRole('button', { name: '收起特朗普演讲合集' }).click()
    if (await page.locator('#collection-donald-trump').count()) errors.push('desktop: collapsed collection still shows lessons')
    await page.getByRole('button', { name: '展开特朗普演讲合集' }).click()
    await page.locator('#collection-donald-trump').waitFor()
    await page.locator('.playlist-item').nth(1).click()
    await page.getByRole('heading', { name: 'Address to the Nation on Syria', level: 1 }).waitFor()
    await page.locator('.lyric-line').first().getByText(/不久前，我命令美国武装部队/).waitFor()
    await page.locator('.playlist-item').nth(2).click()
    await page.getByRole('heading', { name: 'Address to the Nation', level: 1, exact: true }).waitFor()
    await page.locator('.lyric-line').first().getByText(/新冠病毒疫情/).waitFor()
    await page.locator('.playlist-collection').nth(1).locator('.playlist-item').first().click()
    await page.getByRole('heading', { name: "There's more to life than being happy", level: 1 }).waitFor()
    await page.locator('.playlist-collection').nth(2).locator('.playlist-item').first().click()
    await page.getByRole('heading', { name: '黎明《一綫娛樂》專訪', level: 1 }).waitFor()
    await page.locator('.meta-tags').getByText('中粤双语').waitFor()
    await page.locator('.lyric-line').first().getByText(/我主持咗咁耐嘅/).waitFor()
    await page.screenshot({ path: `${outputDir}/desktop-leon.png` })
    await page.locator('.playlist-item').first().click()
    await page.getByRole('heading', { name: 'The Inaugural Address', level: 1 }).waitFor()
    await page.locator('.playlist-collection').nth(3).locator('.playlist-item').first().click()
    await page.getByRole('heading', { name: /流行都市/ }).waitFor()
    await page.locator('.video-button').click()
    await page.locator('.video-modal').waitFor()
    await page.locator('.video-modal-heading button').click()
    if (await page.locator('.video-modal').count()) errors.push('desktop: video modal did not close')
    await page.locator('.playlist-item').first().click()
    await page.getByRole('heading', { name: 'The Inaugural Address', level: 1 }).waitFor()
  } else {
    await page.getByLabel('选择演讲素材').selectOption('donald-trump-2018-syria-address')
    await page.getByRole('heading', { name: 'Address to the Nation on Syria', level: 1 }).waitFor()
    await page.getByLabel('选择演讲素材').selectOption('donald-trump-2020-address-to-the-nation')
    await page.getByRole('heading', { name: 'Address to the Nation', level: 1, exact: true }).waitFor()
    await page.getByLabel('选择演讲素材').selectOption('ted-emily-esfahani-smith-more-to-life-than-being-happy')
    await page.getByRole('heading', { name: "There's more to life than being happy", level: 1 }).waitFor()
    await page.getByLabel('选择演讲素材').selectOption('leon-lai-2017-viutv-interviu')
    await page.getByRole('heading', { name: '黎明 ViuTV《Interviu》專訪', level: 1 }).waitFor()
    await page.locator('.meta-tags').getByText('粤语逐字稿').waitFor()
    await page.locator('.lyric-line').first().locator('em').getByText(/知不知道为什么/).waitFor()
    await page.screenshot({ path: `${outputDir}/mobile-leon.png` })
    await page.getByLabel('选择演讲素材').selectOption('donald-trump-2017-inaugural-address')
  }

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
