export type TvbLesson = {
  id: string
  title: string
  speaker: string
  category: string
  level: string
  minutes: number
  year: number
  sourceUrl: string
  sourceKind: string
  language: string
  coverUrl: string
  audioUrl: string
  audioSourceUrl: string
  captionSourceUrl: string
  durationSeconds: number
  videoUrl: string
  segments: Array<{ id: number; start: number; end: number; text: string; translation: string }>
}

const sources: Record<string, string[]> = {
  '流行都市': ['XxbdgvD5X-g', 'CviB5N8Qcvc', 'Q62cT72hwJ4', '457yC5T19pI', 'grdILKO_MY8'],
  '愛．回家之開心速遞': ['Up5kkVXLw_s', 'unXw6a_7Gz4', '8E5Cg9RfS48', 'Eb4S_OW-ykw', 'M2vce__O2HY'],
  '東張西望': ['50NEcqU6TGQ', 'TNVIN4ZJ00k', 'j9Mmk90tZQw', 'u2IiZrdxkIU', 'azFOBao-Meo'],
  '香港原味道': ['eBpxxSyVozI', 'pPikhLZCZyA', 'bx_58vWaKvI', 'Z6e2a4TFHWY', 'xW3rW_-3N3c'],
  '新聞透視': ['-wYEbasZUgA', 'PZ9cPEdt0Dw', 'RfVAhvKhlHM', '1mK3tFaNjGQ', '9wK-bG8hMlc'],
}

export const tvbLessons: TvbLesson[] = Object.entries(sources).flatMap(([program, ids]) => ids.map((videoId, index) => ({
  id: `tvb-${index + 1}-${videoId}`,
  title: `${program} · 片段 ${index + 1}`,
  speaker: 'TVB 主持／嘉賓',
  category: 'TVB 粵語節目',
  level: program === '新聞透視' ? '中級' : '初級至中級',
  minutes: 1,
  year: 2024,
  sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
  sourceKind: 'official-video',
  language: 'yue-Hant-HK',
  coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  audioUrl: '',
  audioSourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
  captionSourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
  durationSeconds: 0,
  videoUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
  segments: [{
    id: 1,
    start: 0,
    end: 0,
    text: '點擊觀看原聲視頻片段',
    translation: '点击观看原声视频片段',
  }],
})))
