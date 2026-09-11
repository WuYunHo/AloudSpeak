import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import * as OpenCC from 'opencc-js'

const toHongKongTraditional = OpenCC.Converter({ from: 'cn', to: 'hk' })
const toSimplifiedChinese = OpenCC.Converter({ from: 'hk', to: 'cn' })

const transcriptCorrections = new Map([
  ['其實我一時而落這麼久', '其實我主持咗咁耐嘅《一綫娛樂》'],
  ['終於讓我等到這一天', '終於畀我等到呢一日喇'],
  ['就是和我的偶像黎明黎明來做訪問', '就係同我嘅偶像黎明做訪問'],
  ['知道為何我會接受你ViuTV的訪問嗎', '知唔知點解我會接受你 ViuTV 嘅訪問呀？'],
  ['不聞其長', '願聞其詳'],
  ['人事關係、人物關係', '人事關係、人脈關係'],
  ['因為這次整個抱著春天', '因為今次這個《抱著春天》'],
  ['是我很久的朋友', '是我很多年的朋友'],
  ['小爺傑 王二興 精於你', ''],
  ['口水多過黃瓜', '口水多過浪花'],
  ['因為我哋今日有跪客', '因為我哋今日有貴客'],
  ['大謊話都説了幾年了', '大話都講咗幾年喇'],
  ['又沒開始做節目', '又未開始做節目'],
  ['Leon終於盼到今日了', 'Leon 終於等到今日喇'],
  ['我頭先在問問Leon', '我頭先問問 Leon'],
  ['可能我不問那麼多了', '可能我唔問咁多喇'],
  ['真係很緊張', '真係好緊張'],
  ['我要儲了一些勇氣', '我要儲咗啲勇氣'],
  ['想在他面前', '想喺佢面前'],
  ['儲了呢個勇氣', '儲咗呢個勇氣'],
  ['緊張起來', '緊張起嚟'],
])

// Whisper often normalizes spoken Cantonese into written Mandarin. These are
// high-confidence lexical equivalents with distinct Cantonese pronunciation.
const spokenCantonese = [
  ['為甚麼', '點解'], ['為什麼', '點解'], ['怎麼樣', '點樣'], ['怎麼', '點'],
  ['甚麼', '乜嘢'], ['什麼', '乜嘢'], ['我們', '我哋'], ['你們', '你哋'], ['他們', '佢哋'],
  ['這個', '呢個'], ['這些', '呢啲'], ['這裡', '呢度'], ['那個', '嗰個'], ['那些', '嗰啲'],
  ['那裡', '嗰度'], ['哪裡', '邊度'], ['現在', '而家'], ['今天', '今日'], ['明天', '聽日'],
  ['剛才', '頭先'], ['一起', '一齊'], ['下班', '放工'], ['落班', '放工'], ['上班', '返工'],
  ['回家', '返屋企'], ['沒有', '冇'], ['不是', '唔係'], ['真的', '真係'], ['很多', '好多'],
  ['喜歡', '鍾意'], ['聊天', '傾偈'], ['吃飯', '食飯'], ['看見', '見到'], ['聽見', '聽到'],
  ['說話', '講嘢'], ['給我', '畀我'], ['給你', '畀你'], ['給他', '畀佢'], ['孩子', '細路'],
  ['一會兒', '一陣'], ['對著', '對住'], ['輕機', '傾偈'], ['不要緊', '唔緊要'], ['飛了', '飛咗'],
  ['這麼', '咁'], ['不同', '唔同'], ['有些', '有啲'], ['些新的', '啲新嘅'], ['每天', '日日'],
  ['看了', '睇咗'], ['看的', '睇嘅'], ['看', '睇'], ['說', '講'], ['是', '係'],
  ['不會', '唔會'], ['不能', '唔能夠'], ['不要', '唔好'], ['不想', '唔想'], ['不需要', '唔使'],
  ['不明白', '唔明'], ['接受你的', '接受你嘅'], ['籌備中的', '籌備緊嘅'], ['舊的', '舊嘅'],
  ['真的', '真係'], ['的確', '確實'],
  ['新的', '新嘅'], ['年的', '年嘅'], ['的對', '嘅對'], ['的朋友', '嘅朋友'],
  ['的訪問', '嘅訪問'], ['的電視', '嘅電視'], ['的時間', '嘅時間'], ['的老友記', '嘅老友記'],
  ['不知道', '唔知'], ['不接受', '唔接受'], ['不剪', '唔剪'], ['不會', '唔會'],
  ['來了', '嚟喇'], ['玩了', '玩咗'], ['忘記了', '唔記得咗'], ['多久沒', '幾耐冇'], ['沒上', '冇上'],
  ['給面', '畀面'], ['東西', '嘢'], ['對吧', '係咪'], ['對嗎', '係咪'],
  ['抱著', '抱住'], ['在', '喺'], ['很', '好'], ['比你', '畀你'], ['比我', '畀我'],
  ['剪掉', '剪咗'], ['些嘗試', '啲嘗試'], ['來説', '嚟講'], ['一點', '一啲'], ['好久', '好耐'],
  ['不問', '唔問'], ['那麼', '咁'], ['那一', '嗰一'], ['他面前', '佢面前'], ['他的', '佢嘅'],
  ['他叫', '佢叫'], ['他都', '佢都'], ['儲了一些', '儲咗啲'], ['儲了', '儲咗'], ['算了', '算喇'],
  ['起來', '起嚟'], ['很久', '好耐'], ['新的', '新嘅'], ['事情', '嘢'], ['東西', '嘢'],
  ['喺問問', '問問'], ['的時候', '嗰陣時'], ['時候', '嗰陣時'],
]

function normalizeSpokenCantonese(value) {
  const normalized = spokenCantonese.reduce((text, [written, spoken]) => text.replaceAll(written, spoken), value)
  return normalized
    .replace(/Leon[，,\s]*終於盼到(?:今日|今天)(?:了|咗)?/u, 'Leon 終於等到今日喇')
    .replace(/可能我唔問咁多(?:了|咗)?/u, '可能我唔問咁多喇')
    .replace(/因為我哋今日有跪客/u, '因為我哋今日有貴客')
    .replace(/了(?=[\s，。！？、]|$)/gu, '咗')
}

const cantoneseToMandarin = [
  ['有時我會傾偈嘅對住偶像', '有时我会对着偶像聊天'], ['傾偈嘅對住', '对着聊天'], ['就係', '就是'], ['呢一日', '这一天'],
  ['畀我等到', '让我等到'], ['更輕', '更轻松'], ['細量', '商量'],
  ['我哋', '我们'], ['你哋', '你们'], ['佢哋', '他们'], ['佢', '他'], ['呢個', '这个'], ['呢啲', '这些'],
  ['呢度', '这里'], ['嗰個', '那个'], ['嗰啲', '那些'], ['嗰度', '那里'], ['邊度', '哪里'], ['點解', '为什么'],
  ['乜嘢', '什么'], ['而家', '现在'], ['今日', '今天'], ['聽日', '明天'], ['頭先', '刚才'], ['一齊', '一起'],
  ['放工', '下班'], ['返工', '上班'], ['返屋企', '回家'], ['冇', '没有'], ['唔係', '不是'], ['真係', '真的'],
  ['好多', '很多'], ['鍾意', '喜欢'], ['傾偈', '聊天'], ['食飯', '吃饭'], ['見到', '看见'], ['聽到', '听到'],
  ['講嘢', '说话'], ['畀', '给'], ['一陣', '一会儿'], ['對住', '对着'], ['唔緊要', '不要紧'], ['咁耐', '这么久'],
  ['咁好', '这么好'], ['咁多', '这么多'], ['咁樣', '这样'], ['咁', '这么'], ['唔同', '不同'], ['有啲', '有些'],
  ['日日', '每天'], ['睇', '看'], ['講', '说'], ['係咪', '对吗'], ['係我', '是我'], ['係你', '是你'], ['係佢', '是他'],
  ['係一個', '是一个'], ['係好', '是好'], ['唔會', '不会'], ['唔能夠', '不能'],
  ['唔好', '不要'], ['唔想', '不想'], ['唔使', '不需要'], ['唔明', '不明白'], ['唔知', '不知道'], ['唔問', '不问'],
  ['嘅', '的'], ['喇', '了'], ['咗', '了'], ['嚟喇', '来了'], ['嚟', '来'], ['喺', '在'], ['抱住', '抱着'],
  ['嚟講', '来说'], ['嗰陣時', '那时候'], ['嗰一', '那一'], ['今次', '这次'], ['啲', '些'], ['嘢', '东西'], ['細路', '孩子'],
]

function translateToMandarin(value) {
  const converted = cantoneseToMandarin.reduce((text, [spoken, mandarin]) => text.replaceAll(spoken, mandarin), value)
  return toSimplifiedChinese(converted).replace(/(^|[，。！？、\s])係(?=$|[，。！？、\s])/gu, '$1是').trim()
}

const materials = [
  { directory: '2016-line-entertainment-interview', segmentIdStart: 9001 },
  { directory: '2017-viutv-interviu', segmentIdStart: 12001 },
  { directory: '2016-crhk-903-short-interview', segmentIdStart: 15001 },
  { directory: '2016-crhk-903-full-interview', segmentIdStart: 18001 },
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
  return normalizeSpokenCantonese(transcriptCorrections.get(normalized) ?? normalized)
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
    translation: translateToMandarin(segment.text),
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
    `- 說明：由本地語音模型逐句轉寫，並進行香港粵語詞彙規範、中文翻譯、重複句與異常片段清理。`,
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
      qualityControl: 'Context isolation, spoken Cantonese lexical normalization, duplicate removal, invalid-duration filtering, and sampled checks against burned-in captions.',
    },
    translation: {
      file: 'translations-zh-CN.json',
      locale: 'zh-CN',
      kind: 'machine-translation',
      segmentCount: segments.length,
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
    writeFile(new URL('translations-zh-CN.json', root), `${JSON.stringify({ locale: 'zh-CN', kind: 'machine-translation', translations: Object.fromEntries(segments.map((segment) => [String(segment.id), segment.translation])) }, null, 2)}\n`, 'utf8'),
    writeFile(new URL('metadata.json', root), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8'),
  ])
  console.log(`${source.title}: ${segments.length} segments`)
}
