import { useState, useEffect, useMemo } from 'react'

const TOPICS = ['technology', 'business', 'world', 'science']
const API_BASE = import.meta.env.VITE_API_URL || ''
const SENTIMENT_META = {
  positive: { color: '#7FCBA4', bg: '#E3F5EC', text: '#3F8464', label: 'Positive' },
  neutral: { color: '#F0B26B', bg: '#FBEFDF', text: '#B0742E', label: 'Neutral' },
  negative: { color: '#EF9AA6', bg: '#FCE9EC', text: '#C15A6B', label: 'Negative' },
}

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.round(diffHr / 24)}d ago`
}

// Moodwave: a soft, rounded wave whose height reflects how mixed
// (vs. uniform) the sentiment is across currently-loaded articles.
function Moodwave({ articles }) {
  const counts = useMemo(() => {
    const c = { positive: 0, neutral: 0, negative: 0 }
    articles.forEach(a => { if (c[a.sentiment] !== undefined) c[a.sentiment]++ })
    return c
  }, [articles])

  const total = articles.length || 1
  const posRatio = counts.positive / total
  const negRatio = counts.negative / total
  const amplitude = 10 + (posRatio + negRatio) * 14

  const path = `M0,30 C 150,${30 - amplitude} 250,${30 + amplitude} 400,30 C 550,${30 - amplitude} 650,${30 + amplitude} 800,30 C 900,${30 - amplitude * 0.6} 950,${30 + amplitude * 0.6} 1000,30`

  return (
    <svg className="pulseline" viewBox="0 0 1000 60" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#C9BFEE" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d={path} fill="none" stroke="#BBD8F2" strokeWidth="2" strokeLinecap="round" opacity="0.9" transform="translate(0,6)" />
    </svg>
  )
}

function SkeletonCard() {
  return (
    <div className="card skeleton">
      <div className="skel-bar" />
      <div className="skel-line w70" />
      <div className="skel-line w40" />
    </div>
  )
}

export default function App() {
  const [topic, setTopic] = useState('technology')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${API_BASE}/api/articles?topic=${topic}&limit=10`)
      .then(res => {
        if (!res.ok) throw new Error('Request failed')
        return res.json()
      })
      .then(data => {
        if (!cancelled) {
          setArticles(data)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError('Could not load the feed. Is the backend running on port 5000?')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [topic])

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-top">
          <span className="wordmark">Driftwire</span>
          <span className="tagline">a gentler way to read the news</span>
        </div>
        <Moodwave articles={articles} />
      </header>

      <nav className="topics">
        {TOPICS.map(t => (
          <button
            key={t}
            className={`topic-btn ${t === topic ? 'active' : ''}`}
            onClick={() => setTopic(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="feed">
        {error && <div className="error-banner">{error}</div>}

        {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}

        {!loading && !error && articles.length === 0 && (
          <div className="empty">No articles came back for this topic yet.</div>
        )}

        {!loading && articles.map(a => {
          const meta = SENTIMENT_META[a.sentiment] || SENTIMENT_META.neutral
          return (
            <article
              className="card"
              key={a.id}
              style={{ '--accent': meta.color, '--accent-bg': meta.bg, '--accent-text': meta.text }}
            >
              <div className="card-dot" />
              <div className="card-body">
                <div className="card-meta">
                  <span className="source">{a.source}</span>
                  <span className="dot">·</span>
                  <span className="time">{timeAgo(a.published)}</span>
                  <span className="sentiment-tag">{meta.label}</span>
                </div>
                <h2 className="headline">
                  <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
                </h2>
                <p className="summary">{a.ai_summary}</p>
              </div>
            </article>
          )
        })}
      </main>

      <footer className="footer">
        Headlines via public RSS · Sentiment analysis via VADER (NLP)
      </footer>
    </div>
  )
}
