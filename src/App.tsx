import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AudioLines,
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
import trumpTranslations from '../content/donald-trump/2017-inaugural-address/translations-zh-CN.json'

type Segment = {
  id: number
  start: number
  end: number
  text: string
  translation: string
}

const lesson = {
  ...trumpLessonData,
  audioUrl: trumpAudioUrl,
  segments: trumpLessonData.segments.map((segment) => ({
    ...segment,
    translation: (trumpTranslations.translations as Record<string, string>)[String(segment.id)] || '',
  })) as Segment[],
  audioSourceUrl: "https://commons.wikimedia.org/wiki/File:President_Donald_Trump%27s_First_Inaugural_Address_-_January_20,_2017.wav",
  captionSourceUrl: "https://commons.wikimedia.org/wiki/File:President_Trump%27s_Inaugural_Address.webm",
}

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
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(0.85)
  const [volume, setVolume] = useState(0.82)
  const [isMuted, setIsMuted] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lyricsViewportRef = useRef<HTMLDivElement | null>(null)
  const lyricLineRefs = useRef<(HTMLButtonElement | null)[]>([])

  const activeIndex = useMemo(
    () => findActiveSegment(lesson.segments, currentTime),
    [currentTime],
  )

  useEffect(() => {
    const audio = new Audio(lesson.audioUrl)
    audio.preload = 'metadata'
    audio.playbackRate = speed
    audio.volume = volume

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const stopPlaying = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', stopPlaying)
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', stopPlaying)
    }
  }, [])

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
    audio.currentTime = Math.max(0, Math.min(time, duration || 1008.652))
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

  return (
    <div className="player-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><AudioLines size={19} /></span><span>ECHO</span></div>
        <div className="side-nav"><div className="active"><Headphones size={19} /><span>正在播放</span></div></div>
        <div className="playlist-heading"><span>当前素材</span></div>
        <div className="playlist-item active">
          <img src="/speaker-stage.jpg" alt="舞台麦克风" />
          <span><strong>The Inaugural Address</strong><small>Donald J. Trump</small></span>
          <i />
        </div>
        <div className="sidebar-space" />
        <div className="source-note"><ListMusic size={17} /><div><strong>1 套真实素材</strong><span>78 个时间段</span></div></div>
        <div className="profile"><span>Y</span><div><strong>Yuki</strong><small>Listener</small></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-track"><img src="/speaker-stage.jpg" alt="" /><span><strong>{lesson.title}</strong><small>{lesson.speaker}</small></span></div>
          <div className="breadcrumb"><span>素材库</span><i>/</i><strong>{lesson.title}</strong></div>
          <a className="source-button" href={lesson.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} />官方稿</a>
        </header>

        <div className="listening-stage">
          <section className="album-pane">
            <div className={`vinyl ${isPlaying ? 'playing' : ''}`}>
              <div className="vinyl-rings" />
              <img src="/speaker-stage.jpg" alt="The Inaugural Address 封面" />
              <i />
            </div>
            <div className="album-meta">
              <div className="meta-tags"><span>原声</span><span>中英双语</span><span>{lesson.level}</span><span>2017</span></div>
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
                  <span className="lyric-copy"><strong>{segment.text}</strong><em>{segment.translation}</em></span>
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
            <img src="/speaker-stage.jpg" alt="" />
            <span><strong>{lesson.title}</strong><small>{lesson.speaker}</small></span>
            <button className={isLiked ? 'liked' : ''} onClick={() => setIsLiked((value) => !value)} title="收藏"><Heart size={18} fill={isLiked ? 'currentColor' : 'none'} /></button>
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
              <input className="progress-range" type="range" min="0" max={duration || 1008.652} step="0.05" value={currentTime} onChange={(event) => seek(Number(event.target.value))} aria-label="播放进度" style={{ '--progress': `${duration ? (currentTime / duration) * 100 : 0}%` } as CSSProperties} />
              <span>{formatTime(duration)}</span>
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
