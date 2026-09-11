import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AudioLines,
  ChevronDown,
  Clock3,
  ExternalLink,
  Headphones,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import trumpAudioUrl from '../content/donald-trump/2017-inaugural-address/audio.mp3?url'
import trumpLessonData from '../content/donald-trump/2017-inaugural-address/lesson.json'
import trumpMetadata from '../content/donald-trump/2017-inaugural-address/metadata.json'
import trumpTranslations from '../content/donald-trump/2017-inaugural-address/translations-zh-CN.json'
import syriaAudioUrl from '../content/donald-trump/2018-syria-address/audio.mp3?url'
import syriaLessonData from '../content/donald-trump/2018-syria-address/lesson.json'
import syriaMetadata from '../content/donald-trump/2018-syria-address/metadata.json'
import syriaTranslations from '../content/donald-trump/2018-syria-address/translations-zh-CN.json'
import nationAudioUrl from '../content/donald-trump/2020-address-to-the-nation/audio.mp3?url'
import nationLessonData from '../content/donald-trump/2020-address-to-the-nation/lesson.json'
import nationMetadata from '../content/donald-trump/2020-address-to-the-nation/metadata.json'
import nationTranslations from '../content/donald-trump/2020-address-to-the-nation/translations-zh-CN.json'
import meaningAudioUrl from '../content/ted/emily-esfahani-smith-more-to-life-than-being-happy/audio.mp3?url'
import meaningCoverUrl from '../content/ted/emily-esfahani-smith-more-to-life-than-being-happy/cover.jpg?url'
import meaningLessonData from '../content/ted/emily-esfahani-smith-more-to-life-than-being-happy/lesson.json'
import meaningMetadata from '../content/ted/emily-esfahani-smith-more-to-life-than-being-happy/metadata.json'
import meaningTranslations from '../content/ted/emily-esfahani-smith-more-to-life-than-being-happy/translations-zh-CN.json'
import exerciseAudioUrl from '../content/ted/wendy-suzuki-brain-changing-benefits-of-exercise/audio.mp3?url'
import exerciseCoverUrl from '../content/ted/wendy-suzuki-brain-changing-benefits-of-exercise/cover.jpg?url'
import exerciseLessonData from '../content/ted/wendy-suzuki-brain-changing-benefits-of-exercise/lesson.json'
import exerciseMetadata from '../content/ted/wendy-suzuki-brain-changing-benefits-of-exercise/metadata.json'
import exerciseTranslations from '../content/ted/wendy-suzuki-brain-changing-benefits-of-exercise/translations-zh-CN.json'
import leadershipAudioUrl from '../content/ted/anjali-sud-how-great-leaders-take-on-uncertainty/audio.mp3?url'
import leadershipCoverUrl from '../content/ted/anjali-sud-how-great-leaders-take-on-uncertainty/cover.jpg?url'
import leadershipLessonData from '../content/ted/anjali-sud-how-great-leaders-take-on-uncertainty/lesson.json'
import leadershipMetadata from '../content/ted/anjali-sud-how-great-leaders-take-on-uncertainty/metadata.json'
import leadershipTranslations from '../content/ted/anjali-sud-how-great-leaders-take-on-uncertainty/translations-zh-CN.json'
import brokenAudioUrl from '../content/ted/daniel-alexander-jones-what-to-do-when-everything-feels-broken/audio.mp3?url'
import brokenCoverUrl from '../content/ted/daniel-alexander-jones-what-to-do-when-everything-feels-broken/cover.jpg?url'
import brokenLessonData from '../content/ted/daniel-alexander-jones-what-to-do-when-everything-feels-broken/lesson.json'
import brokenMetadata from '../content/ted/daniel-alexander-jones-what-to-do-when-everything-feels-broken/metadata.json'
import brokenTranslations from '../content/ted/daniel-alexander-jones-what-to-do-when-everything-feels-broken/translations-zh-CN.json'
import economyAudioUrl from '../content/ted/kate-raworth-healthy-economy-should-thrive-not-grow/audio.mp3?url'
import economyCoverUrl from '../content/ted/kate-raworth-healthy-economy-should-thrive-not-grow/cover.jpg?url'
import economyLessonData from '../content/ted/kate-raworth-healthy-economy-should-thrive-not-grow/lesson.json'
import economyMetadata from '../content/ted/kate-raworth-healthy-economy-should-thrive-not-grow/metadata.json'
import economyTranslations from '../content/ted/kate-raworth-healthy-economy-should-thrive-not-grow/translations-zh-CN.json'
import lineEntertainmentAudioUrl from '../content/cantonese/leon-lai/2016-line-entertainment-interview/audio.mp3?url'
import lineEntertainmentCoverUrl from '../content/cantonese/leon-lai/2016-line-entertainment-interview/cover.jpg?url'
import lineEntertainmentLessonData from '../content/cantonese/leon-lai/2016-line-entertainment-interview/lesson.json'
import lineEntertainmentMetadata from '../content/cantonese/leon-lai/2016-line-entertainment-interview/metadata.json'
import lineEntertainmentTranslations from '../content/cantonese/leon-lai/2016-line-entertainment-interview/translations-zh-CN.json'
import viutvAudioUrl from '../content/cantonese/leon-lai/2017-viutv-interviu/audio.mp3?url'
import viutvCoverUrl from '../content/cantonese/leon-lai/2017-viutv-interviu/cover.jpg?url'
import viutvLessonData from '../content/cantonese/leon-lai/2017-viutv-interviu/lesson.json'
import viutvMetadata from '../content/cantonese/leon-lai/2017-viutv-interviu/metadata.json'
import viutvTranslations from '../content/cantonese/leon-lai/2017-viutv-interviu/translations-zh-CN.json'
import crhkShortAudioUrl from '../content/cantonese/leon-lai/2016-crhk-903-short-interview/audio.mp3?url'
import crhkShortCoverUrl from '../content/cantonese/leon-lai/2016-crhk-903-short-interview/cover.jpg?url'
import crhkShortLessonData from '../content/cantonese/leon-lai/2016-crhk-903-short-interview/lesson.json'
import crhkShortMetadata from '../content/cantonese/leon-lai/2016-crhk-903-short-interview/metadata.json'
import crhkShortTranslations from '../content/cantonese/leon-lai/2016-crhk-903-short-interview/translations-zh-CN.json'
import crhkFullAudioUrl from '../content/cantonese/leon-lai/2016-crhk-903-full-interview/audio.mp3?url'
import crhkFullCoverUrl from '../content/cantonese/leon-lai/2016-crhk-903-full-interview/cover.jpg?url'
import crhkFullLessonData from '../content/cantonese/leon-lai/2016-crhk-903-full-interview/lesson.json'
import crhkFullMetadata from '../content/cantonese/leon-lai/2016-crhk-903-full-interview/metadata.json'
import crhkFullTranslations from '../content/cantonese/leon-lai/2016-crhk-903-full-interview/translations-zh-CN.json'

type Segment = {
  id: number
  start: number
  end: number
  text: string
  translation: string
}

type Lesson = {
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
  segments: Segment[]
}

type LessonCollection = {
  id: string
  title: string
  shortTitle: string
  lessons: Lesson[]
}

function createLesson(
  lessonData: Omit<Lesson, 'year' | 'sourceKind' | 'language' | 'coverUrl' | 'audioUrl' | 'audioSourceUrl' | 'captionSourceUrl' | 'durationSeconds' | 'segments'> & { segments: Segment[] },
  metadata: { date: string; language?: string; durationSeconds: number; transcript: { kind: string }; audio: { sourceUrl: string }; captions: { sourceVideoUrl: string } },
  translations: { translations: Record<string, string> },
  audioUrl: string,
  coverUrl: string,
): Lesson {
  return {
    ...lessonData,
    year: Number(metadata.date.slice(0, 4)),
    sourceKind: metadata.transcript.kind,
    language: metadata.language || 'en-US',
    coverUrl,
    audioUrl,
    audioSourceUrl: metadata.audio.sourceUrl,
    captionSourceUrl: metadata.captions.sourceVideoUrl,
    durationSeconds: metadata.durationSeconds,
    segments: lessonData.segments.map((segment) => ({
      ...segment,
      translation: (translations.translations as Record<string, string>)[String(segment.id)] || '',
    })) as Segment[],
  }
}

const trumpLessons: Lesson[] = [
  createLesson(trumpLessonData, trumpMetadata, trumpTranslations, trumpAudioUrl, '/cover-inaugural.jpg'),
  createLesson(syriaLessonData, syriaMetadata, syriaTranslations, syriaAudioUrl, '/cover-syria.jpg'),
  createLesson(nationLessonData, nationMetadata, nationTranslations, nationAudioUrl, '/cover-nation.jpg'),
]

const tedLessons: Lesson[] = [
  createLesson(meaningLessonData, meaningMetadata, meaningTranslations, meaningAudioUrl, meaningCoverUrl),
  createLesson(exerciseLessonData, exerciseMetadata, exerciseTranslations, exerciseAudioUrl, exerciseCoverUrl),
  createLesson(leadershipLessonData, leadershipMetadata, leadershipTranslations, leadershipAudioUrl, leadershipCoverUrl),
  createLesson(brokenLessonData, brokenMetadata, brokenTranslations, brokenAudioUrl, brokenCoverUrl),
  createLesson(economyLessonData, economyMetadata, economyTranslations, economyAudioUrl, economyCoverUrl),
]

const leonLessons: Lesson[] = [
  createLesson(lineEntertainmentLessonData, lineEntertainmentMetadata, lineEntertainmentTranslations, lineEntertainmentAudioUrl, lineEntertainmentCoverUrl),
  createLesson(viutvLessonData, viutvMetadata, viutvTranslations, viutvAudioUrl, viutvCoverUrl),
  createLesson(crhkShortLessonData, crhkShortMetadata, crhkShortTranslations, crhkShortAudioUrl, crhkShortCoverUrl),
  createLesson(crhkFullLessonData, crhkFullMetadata, crhkFullTranslations, crhkFullAudioUrl, crhkFullCoverUrl),
]

const collections: LessonCollection[] = [
  { id: 'donald-trump', title: '特朗普演讲', shortTitle: '特朗普', lessons: trumpLessons },
  { id: 'ted-talks', title: 'TED 演讲', shortTitle: 'TED', lessons: tedLessons },
  { id: 'leon-lai-cantonese', title: '黎明粤语访谈', shortTitle: '黎明', lessons: leonLessons },
]

const lessons = collections.flatMap((collection) => collection.lessons)
const totalSegments = lessons.reduce((total, lesson) => total + lesson.segments.length, 0)

const speeds = [0.75, 0.85, 1, 1.25]

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = Math.floor(safeSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function findActiveSegment(segments: Segment[], currentTime: number) {
  if (currentTime < segments[0].start) return 0
  let low = 0
  let high = segments.length - 1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (segments[middle].start <= currentTime) low = middle + 1
    else high = middle - 1
  }
  return Math.max(0, high)
}

function App() {
  const [lessonIndex, setLessonIndex] = useState(0)
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(collections.map(({ id }) => [id, true])),
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(0.85)
  const [volume, setVolume] = useState(0.82)
  const [isMuted, setIsMuted] = useState(false)
  const [likedLessons, setLikedLessons] = useState<Record<string, boolean>>({})
  const [isRepeat, setIsRepeat] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lyricsViewportRef = useRef<HTMLDivElement | null>(null)
  const lyricLineRefs = useRef<(HTMLButtonElement | null)[]>([])
  const lesson = lessons[lessonIndex]
  const collection = collections.find((item) => item.lessons.some(({ id }) => id === lesson.id)) ?? collections[0]
  const isLiked = Boolean(likedLessons[lesson.id])

  const activeIndex = useMemo(
    () => findActiveSegment(lesson.segments, currentTime),
    [currentTime, lesson.segments],
  )

  useEffect(() => {
    const audio = new Audio(lesson.audioUrl)
    audio.preload = 'metadata'
    audio.playbackRate = speed
    audio.volume = volume
    audio.muted = isMuted
    audio.loop = isRepeat

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const stopPlaying = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', stopPlaying)
    audioRef.current = audio
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    lyricLineRefs.current = []
    lyricsViewportRef.current?.scrollTo({ top: 0 })

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', stopPlaying)
    }
  }, [lesson.audioUrl])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.muted = isMuted
    }
  }, [isMuted, volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = isRepeat
  }, [isRepeat])

  useEffect(() => {
    const viewport = lyricsViewportRef.current
    const activeLine = lyricLineRefs.current[activeIndex]
    if (!viewport || !activeLine) return
    const top = activeLine.offsetTop - viewport.clientHeight / 2 + activeLine.offsetHeight / 2
    viewport.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [activeIndex])

  const play = async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      void play()
    }
  }

  const seek = (time: number, autoplay = false) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(time, duration || lesson.durationSeconds))
    setCurrentTime(audio.currentTime)
    if (autoplay) void play()
  }

  const seekSegment = (index: number) => {
    const segment = lesson.segments[Math.max(0, Math.min(index, lesson.segments.length - 1))]
    seek(segment.start, true)
  }

  const cycleSpeed = () => {
    const currentIndex = speeds.indexOf(speed)
    setSpeed(speeds[(currentIndex + 1) % speeds.length])
  }

  const selectLesson = (index: number) => {
    if (index === lessonIndex) return
    setLessonIndex(index)
  }

  const toggleCollection = (collectionId: string) => {
    setExpandedCollections((value) => ({ ...value, [collectionId]: !value[collectionId] }))
  }

  return (
    <div className="player-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><AudioLines size={19} /></span><span>ECHO</span></div>
        <div className="side-nav"><div className="active"><Headphones size={19} /><span>正在播放</span></div></div>
        <div className="playlist-heading"><span>演讲合集</span><small>{collections.length}</small></div>
        <div className="playlist">
          {collections.map((itemCollection) => (
            <section className="playlist-collection" key={itemCollection.id} aria-label={itemCollection.title}>
              <button
                type="button"
                className={`collection-heading ${expandedCollections[itemCollection.id] ? '' : 'collapsed'}`}
                onClick={() => toggleCollection(itemCollection.id)}
                aria-expanded={expandedCollections[itemCollection.id]}
                aria-controls={`collection-${itemCollection.id}`}
                aria-label={`${expandedCollections[itemCollection.id] ? '收起' : '展开'}${itemCollection.title}合集`}
                title={`${expandedCollections[itemCollection.id] ? '收起' : '展开'}${itemCollection.title}`}
              >
                <span><ChevronDown size={13} /><strong>{itemCollection.title}</strong></span>
                <small>{itemCollection.lessons.length} 篇</small>
              </button>
              {expandedCollections[itemCollection.id] && (
                <div className="collection-lessons" id={`collection-${itemCollection.id}`}>
                  {itemCollection.lessons.map((item) => {
                    const index = lessons.findIndex(({ id }) => id === item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`playlist-item ${index === lessonIndex ? 'active' : ''}`}
                        onClick={() => selectLesson(index)}
                        title={`${item.title} (${item.year})`}
                        aria-pressed={index === lessonIndex}
                      >
                        <img src={item.coverUrl} alt="" />
                        <span><strong>{item.title}</strong><small>{item.year} · {item.minutes} 分钟</small></span>
                        {index === lessonIndex && <i />}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
        <div className="sidebar-space" />
        <div className="source-note"><ListMusic size={17} /><div><strong>{collections.length} 个演讲合集</strong><span>{lessons.length} 篇 · {totalSegments} 个时间段</span></div></div>
        <div className="profile"><span>Y</span><div><strong>Yuki</strong><small>Listener</small></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-track">
            <img src={lesson.coverUrl} alt="" />
            <select
              className="mobile-lesson-select"
              value={lesson.id}
              onChange={(event) => selectLesson(lessons.findIndex((item) => item.id === event.target.value))}
              aria-label="选择演讲素材"
            >
              {collections.map((itemCollection) => (
                <optgroup key={itemCollection.id} label={`${itemCollection.title} · ${itemCollection.lessons.length} 篇`}>
                  {itemCollection.lessons.map((item) => <option key={item.id} value={item.id}>{item.year} · {item.title}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="breadcrumb"><span>素材库</span><i>/</i><span>{collection.title}</span><i>/</i><strong>{lesson.title}</strong></div>
          <a className="source-button" href={lesson.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} />{lesson.sourceKind === 'caption-transcript' || lesson.sourceKind === 'machine-transcript' ? '字幕稿' : '官方稿'}</a>
        </header>

        <div className="listening-stage">
          <section className="album-pane">
            <div className={`vinyl ${isPlaying ? 'playing' : ''}`}>
              <div className="vinyl-rings" />
              <img src={lesson.coverUrl} alt={`${lesson.title} 封面`} />
              <i />
            </div>
            <div className="album-meta">
              <div className="meta-tags"><span>{collection.shortTitle}</span><span>{lesson.language === 'yue-Hant-HK' ? '中粤双语' : '中英双语'}</span><span>{lesson.language === 'yue-Hant-HK' ? '粤语逐字稿' : lesson.level}</span><span>{lesson.year}</span></div>
              <h1>{lesson.title}</h1>
              <p>{lesson.speaker}</p>
              <div className="album-facts"><span><Clock3 size={15} />{lesson.minutes} 分钟</span><span><ListMusic size={15} />{lesson.segments.length} 句</span></div>
              <div className="source-links">
                <a href={lesson.audioSourceUrl} target="_blank" rel="noreferrer">原声音频 <ExternalLink size={13} /></a>
                <a href={lesson.captionSourceUrl} target="_blank" rel="noreferrer">字幕来源 <ExternalLink size={13} /></a>
              </div>
            </div>
          </section>

          <section className="lyrics-pane">
            <div className="lyrics-heading"><div><p>TRANSCRIPT</p><h2>逐句字幕</h2></div><span>{activeIndex + 1} / {lesson.segments.length}</span></div>
            <div className="lyrics-fade top" />
            <div className="lyrics-viewport" ref={lyricsViewportRef}>
              <div className="lyrics-spacer" />
              {lesson.segments.map((segment, index) => (
                <button
                  key={segment.id}
                  ref={(node) => { lyricLineRefs.current[index] = node }}
                  className={`lyric-line ${index === activeIndex ? 'active' : ''} ${index < activeIndex ? 'past' : ''}`}
                  onClick={() => seekSegment(index)}
                >
                  <small>{formatTime(segment.start)}</small>
                  <span className="lyric-copy"><strong>{segment.text}</strong>{segment.translation && <em>{segment.translation}</em>}</span>
                  {index === activeIndex && <i />}
                </button>
              ))}
              <div className="lyrics-spacer" />
            </div>
            <div className="lyrics-fade bottom" />
          </section>
        </div>

        <footer className="player-bar">
          <div className="now-playing">
            <img src={lesson.coverUrl} alt="" />
            <span><strong>{lesson.title}</strong><small>{lesson.speaker}</small></span>
            <button className={isLiked ? 'liked' : ''} onClick={() => setLikedLessons((value) => ({ ...value, [lesson.id]: !value[lesson.id] }))} title="收藏"><Heart size={18} fill={isLiked ? 'currentColor' : 'none'} /></button>
          </div>
          <div className="transport">
            <div className="transport-buttons">
              <button className={isRepeat ? 'enabled' : ''} onClick={() => setIsRepeat((value) => !value)} title="循环播放"><Repeat2 size={17} /></button>
              <button onClick={() => seekSegment(activeIndex - 1)} title="上一句"><SkipBack size={20} fill="currentColor" /></button>
              <button className="main-play" onClick={togglePlayback} aria-label={isPlaying ? '暂停' : '播放'}>{isPlaying ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}</button>
              <button onClick={() => seekSegment(activeIndex + 1)} title="下一句"><SkipForward size={20} fill="currentColor" /></button>
              <button className="speed-control" onClick={cycleSpeed} title="播放速度">{speed}x</button>
            </div>
            <div className="progress-row">
              <span className="time-current">{formatTime(currentTime)}</span>
              <input className="progress-range" type="range" min="0" max={duration || lesson.durationSeconds} step="0.05" value={currentTime} onChange={(event) => seek(Number(event.target.value))} aria-label="播放进度" style={{ '--progress': `${duration ? (currentTime / duration) * 100 : 0}%` } as CSSProperties} />
              <span>{formatTime(duration || lesson.durationSeconds)}</span>
            </div>
          </div>
          <div className="volume-control">
            <button onClick={() => setIsMuted((value) => !value)} title={isMuted ? '取消静音' : '静音'}>{isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="音量" />
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
