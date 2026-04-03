import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { cloudinaryUrl, cloudinaryFetch } from '../config/firebase'
import './CategoryPage.css'

const MONTHS_IT = {
  gennaio:0,febbraio:1,marzo:2,aprile:3,
  maggio:4,giugno:5,luglio:6,agosto:7,
  settembre:8,ottobre:9,novembre:10,dicembre:11,
}
function parseFirstDate(str) {
  if (!str) return new Date(9999,0,1)
  const p = str.toLowerCase().trim().split(/\s+/)
  return new Date(parseInt(p[2])||2026, MONTHS_IT[p[1]]??0, parseInt(p[0])||1)
}
function chronoSort(arr) {
  return [...arr].sort((a,b) => {
    const da = Array.isArray(a.dates) ? a.dates[0]?.date : null
    const db = Array.isArray(b.dates) ? b.dates[0]?.date : null
    return parseFirstDate(da) - parseFirstDate(db)
  })
}

const CAT_META = {
  beach:          { title:'Beach Party',   icon:'🏖',  color:'#f59e0b', subtitle:'Spiaggia, sole e vibes estive',          filterType:'category', filterValue:'beach' },
  boat:           { title:'Boat Party',    icon:'⛵',  color:'#0ea5e9', subtitle:'Musica sul mare aperto',                 filterType:'category', filterValue:'boat' },
  night:          { title:'Night Club',    icon:'🌙',  color:'#8b5cf6', subtitle:'I club più hot di Laganas',              filterType:'category', filterValue:'night' },
  pool:           { title:'Pool Party',    icon:'💦',  color:'#06b6d4', subtitle:'Piscina, cocktail e DJ set',             filterType:'category', filterValue:'pool' },
  tendenza:       { title:'Trend',         icon:'💖',  color:'#d946ef', subtitle:'Gli eventi più in trend del momento',    filterType:'badge',    filterValue:'TENDENZA' },
  special:        { title:'Special Guest', icon:'🎤',  color:'#ffd700', subtitle:'Artisti ospiti e serate esclusive',      filterType:'badge',    filterValue:'SPECIAL GUEST' },
}

const BADGE_COLORS = {
  'HYPE':          { bg:'#7c3aed', text:'#fff' },
  'TENDENZA':      { bg:'#d946ef', text:'#fff' },
  'TOP PICK':      { bg:'#6d28d9', text:'#fff' },
  'CONSIGLIATO':   { bg:'#059669', text:'#fff' },
  'PROMO':         { bg:'#dc2626', text:'#fff' },
  'SPECIAL GUEST': { bg:'#b45309', text:'#fff' },
  'SOLD OUT':      { bg:'#374151', text:'#9ca3af' },
}

function EventCard({ ev }) {
  const primaryDate = Array.isArray(ev.dates) ? ev.dates[0] : null
  const badge = BADGE_COLORS[ev.badge]
  return (
    <Link to={`/eventi/${ev.id}`} className="cp-ev-card">
      <div className="cp-ev-thumb">
        {ev.imageId
          ? <img src={cloudinaryUrl(ev.imageId,'w_520,h_720,c_fill,g_auto,q_auto:good,f_auto')} alt={ev.title} loading="lazy" />
          : ev.imageUrl
          ? <img src={cloudinaryFetch(ev.imageUrl,'w_520,h_720,c_fill,g_auto,q_auto:good,f_auto')} alt={ev.title} loading="lazy" />
          : <div className="cp-ev-placeholder" />
        }
        {ev.badge && badge && (
          <span className="cp-ev-badge" style={{ background: badge.bg, color: badge.text }}>
            {ev.badge}
          </span>
        )}
        {ev.drinkIncluso && <span className="cp-ev-drink">🍹 drink incluso</span>}
        {primaryDate?.soldOut && <div className="cp-ev-soldout-overlay">SOLD OUT</div>}
      </div>
      <div className="cp-ev-info">
        <h3>{ev.title}</h3>
        {primaryDate && (
          <p className="cp-ev-date">
            {primaryDate.soldOut ? '🚫' : '📅'} {primaryDate.date}
            {primaryDate.time ? ` · ${primaryDate.time}` : ''}
            {Array.isArray(ev.dates) && ev.dates.length > 1 && (
              <span className="cp-ev-more-dates">+{ev.dates.length - 1} date</span>
            )}
          </p>
        )}
        {ev.soldOutRisk && <p className="cp-ev-risk">🚨 Quasi esaurito</p>}
        <span className="cp-ev-goto">Vedi evento →</span>
      </div>
    </Link>
  )
}

export default function CategoryPage() {
  const { id } = useParams()
  const { events } = useEvents()
  const meta = CAT_META[id]

  if (!meta) {
    return (
      <div className="cp-wrap cp-notfound">
        <Link to="/" className="cp-back">← Torna alla home</Link>
        <p>Categoria non trovata.</p>
      </div>
    )
  }

  const filtered = chronoSort(
    events.filter((e) =>
      meta.filterType === 'badge'
        ? e.badge === meta.filterValue
        : e.category === meta.filterValue
    )
  )

  return (
    <div className="cp-wrap">
      {/* Nav */}
      <nav className="cp-nav">
        <Link to="/" className="cp-nav-logo">
          <span className="cp-logo-text">
            <span className="logo-accent">PARTY</span>
            <span className="logo-mid">CON</span>
            <span className="logo-accent">GIO</span>
          </span>
        </Link>
        <Link to="/" className="cp-nav-back">← Tutti gli eventi</Link>
      </nav>

      {/* Hero categoria */}
      <div className="cp-hero" style={{ '--cat-color': meta.color }}>
        <div className="cp-hero-glow" style={{ background: meta.color }} />
        <div className="cp-hero-content">
          <span className="cp-hero-icon">{meta.icon}</span>
          <h1>{meta.title}</h1>
          <p>{meta.subtitle}</p>
          <span className="cp-hero-count">
            {filtered.length} event{filtered.length !== 1 ? 'i' : 'o'} disponibil{filtered.length !== 1 ? 'i' : 'e'}
          </span>
        </div>
      </div>

      {/* Griglia eventi */}
      <main className="cp-main">
        {filtered.length === 0 ? (
          <div className="cp-empty">
            <p className="cp-empty-icon">🎉</p>
            <h2>Nessun evento disponibile</h2>
            <p>Gio sta preparando qualcosa di grosso per questa categoria. Torna presto!</p>
            <Link to="/" className="cp-btn-home">← Torna alla home</Link>
          </div>
        ) : (
          <div className="cp-grid">
            {filtered.map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </div>
        )}
      </main>
    </div>
  )
}
