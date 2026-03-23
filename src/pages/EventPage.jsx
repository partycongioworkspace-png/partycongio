import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { Link, useParams } from 'react-router-dom'
import { cloudinaryUrl, db } from '../config/firebase'
import { buildTrackedLink } from '../data/zanteData'
import './EventPage.css'

const BADGE_COLORS = {
  'HYPE':        { bg: '#d946ef', text: '#fff',      label: '🔥 Hype' },
  'TOP PICK':    { bg: '#8b5cf6', text: '#fff',      label: '💎 Top Pick' },
  'CONSIGLIATO': { bg: '#a3e635', text: '#0f1014',   label: '⭐ Consigliato da Gio' },
  'PROMO':       { bg: '#0f1014', text: '#a3e635',   label: '🎯 Promo' },
  'SOLD OUT':    { bg: '#ef4444', text: '#fff',       label: '🚫 Sold Out' },
}

const CAT_GRADIENT = {
  beach: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
  boat:  'linear-gradient(135deg, #0ea5e9, #0369a1)',
  night: 'linear-gradient(135deg, #1e0d36, #8b5cf6)',
  pool:  'linear-gradient(135deg, #06b6d4, #0891b2)',
}

function EventPage() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchEvent() {
      try {
        const snap = await getDoc(doc(db, 'events', id))
        if (snap.exists()) {
          setEvent({ id: snap.id, ...snap.data() })
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  if (loading) {
    return (
      <div className="ep-loading">
        <div className="ep-spinner" />
        <p>Caricamento evento…</p>
      </div>
    )
  }

  if (notFound || !event) {
    return (
      <div className="ep-notfound">
        <p className="ep-notfound-emoji">🎉</p>
        <h1>Evento non trovato</h1>
        <p>Questo evento non esiste o è stato rimosso.</p>
        <Link to="/" className="ep-back-btn">← Torna alla home</Link>
      </div>
    )
  }

  // Support both new (dates array) and legacy (top-level date/referral) structure
  const dates = Array.isArray(event.dates) && event.dates.length > 0
    ? event.dates
    : event.date
      ? [{ date: event.date, time: event.time || '', referral: event.referral || '' }]
      : []
  const badge = BADGE_COLORS[event.badge]
  const bgGradient = CAT_GRADIENT[event.category] || CAT_GRADIENT.beach

  return (
    <div className="ep-wrap">
      {/* ── Nav ── */}
      <nav className="ep-nav">
        <Link to="/" className="ep-nav-logo">
          <img
            src="https://res.cloudinary.com/djb2nkpez/image/upload/w_200,h_64,c_fit,f_auto,q_auto/1-removebg-preview_fddema"
            alt="Party con Gio"
          />
        </Link>
        <Link to="/" className="ep-nav-back">← Tutti gli eventi</Link>
      </nav>

      {/* ── Hero ── */}
      <div className="ep-hero">
        {event.imageId ? (
          <img
            src={cloudinaryUrl(event.imageId, 'w_1200,h_500,c_fill,q_auto,f_auto,g_center')}
            alt={event.title}
            className="ep-hero-img"
          />
        ) : (
          <div className="ep-hero-placeholder" style={{ background: bgGradient }} />
        )}
        <div className="ep-hero-overlay" />

        {badge && (
          <span
            className="ep-badge"
            style={{ background: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        )}

        {event.soldOutRisk && (
          <span className="ep-risk-badge">🚨 Quasi esaurito</span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="ep-content">
        <div className="ep-main">
          <h1 className="ep-title">{event.title}</h1>

          {event.description && (
            <p className="ep-desc">{event.description}</p>
          )}

          {event.category && (
            <p className="ep-category">
              Categoria:&nbsp;
              <span>
                {{beach:'🏖 Beach Party',boat:'⛵ Boat Party',night:'🌙 Night Club',pool:'💦 Pool Party'}[event.category] || event.category}
              </span>
            </p>
          )}

          {/* ── Date e biglietteria ── */}
          <div className="ep-dates">
            <h2 className="ep-dates-title">📅 Date disponibili</h2>

            {dates.length === 0 ? (
              <div className="ep-date-card ep-date-nodate">
                <p>Date da confermare — contatta Gio per info</p>
                <a href="https://wa.me/393289466213" target="_blank" rel="noreferrer" className="ep-cta ep-cta-wa">
                  💬 Contatta Gio su WhatsApp →
                </a>
              </div>
            ) : dates.map((d, i) => (
              <div key={i} className="ep-date-card">
                <div className="ep-date-info">
                  <span className="ep-date-num">{i + 1}</span>
                  <div>
                    <strong>{d.date}</strong>
                    {d.time && <p className="ep-date-time">{d.time}</p>}
                  </div>
                </div>

                <div className="ep-date-actions">
                  {d.referral && (
                    <a
                      href={buildTrackedLink(d.referral, `${event.id}-${i}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="ep-cta ep-cta-ticket"
                    >
                      🎟 Acquista biglietto →
                    </a>
                  )}
                  <a
                    href={`https://wa.me/393289466213?text=Ciao Gio, mi interessa l'evento: ${encodeURIComponent(event.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`ep-cta ep-cta-wa${d.referral ? ' ep-cta-secondary' : ''}`}
                  >
                    💬 {d.referral ? 'Chiedi info' : 'Contatta Gio →'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="ep-aside">
          <div className="ep-aside-card">
            <img
              src="https://res.cloudinary.com/djb2nkpez/image/upload/w_200,h_64,c_fit,f_auto,q_auto/1-removebg-preview_fddema"
              alt="Party con Gio"
              className="ep-aside-logo"
            />
            <h3>Hai domande su questo evento?</h3>
            <p>Scrivi a Gio direttamente. Risponde sempre.</p>
            <a
              href="https://wa.me/393289466213"
              target="_blank"
              rel="noreferrer"
              className="ep-cta ep-cta-wa ep-cta-full"
            >
              💬 WhatsApp Business
            </a>
            <a
              href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ=="
              target="_blank"
              rel="noreferrer"
              className="ep-cta ep-cta-ig ep-cta-full"
            >
              📸 Instagram
            </a>
            <a
              href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy"
              target="_blank"
              rel="noreferrer"
              className="ep-cta ep-cta-tt ep-cta-full"
            >
              🎵 TikTok
            </a>
          </div>

          <div className="ep-aside-back">
            <Link to="/" className="ep-back-btn">← Torna a tutti gli eventi</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default EventPage
