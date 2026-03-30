import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cloudinaryUrl, cloudinaryFetch } from '../config/firebase'

// Parse Italian date string → Date for chronological sort
const MONTHS_IT = {
  gennaio:0, febbraio:1, marzo:2, aprile:3,
  maggio:4, giugno:5, luglio:6, agosto:7,
  settembre:8, ottobre:9, novembre:10, dicembre:11,
}
function parseItalianDate(str) {
  if (!str) return new Date(9999, 0, 1)
  const parts = str.toLowerCase().trim().split(/\s+/)
  return new Date(
    parseInt(parts[2]) || 2026,
    MONTHS_IT[parts[1]] ?? 0,
    parseInt(parts[0]) || 1,
  )
}

const FILTERS = [
  { key: 'tutti',          label: 'Tutti',           icon: '🎉' },
  { key: 'HYPE',           label: 'Hype',            icon: '🔥' },
  { key: 'TOP PICK',       label: 'Top Pick',        icon: '💎' },
  { key: 'CONSIGLIATO',    label: 'Consigliato',     icon: '⭐' },
  { key: 'PROMO',          label: 'Promo',           icon: '🎯' },
  { key: 'SPECIAL GUEST',  label: 'Special Guest',   icon: '🎤' },
  { key: 'SOLD OUT',       label: 'Sold Out',        icon: '🚫' },
  { key: 'soldout-risk',   label: 'Quasi Esaurito',  icon: '🚨' },
]

const BADGE_COLORS = {
  'HYPE':          'badge-hype',
  'TOP PICK':      'badge-top-pick',
  'CONSIGLIATO':   'badge-consigliato',
  'PROMO':         'badge-promo',
  'SPECIAL GUEST': 'badge-special-guest',
  'SOLD OUT':      'badge-sold-out',
}

function EventsModal({ open, onClose, events = [], initialFilter = 'tutti' }) {
  const [filter, setFilter] = useState(initialFilter)

  // Sync body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Sync filter when modal opens with a new initial filter
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setFilter(initialFilter), 0)
    return () => clearTimeout(timer)
  }, [open, initialFilter])

  if (!open) return null

  // Sort chronologically by first date
  const sorted = [...events].sort((a, b) => {
    const da = Array.isArray(a.dates) ? a.dates[0]?.date : null
    const db = Array.isArray(b.dates) ? b.dates[0]?.date : null
    return parseItalianDate(da) - parseItalianDate(db)
  })

  // Apply filter
  const filtered = filter === 'tutti'
    ? sorted
    : filter === 'soldout-risk'
    ? sorted.filter((e) => e.soldOutRisk)
    : sorted.filter((e) => e.badge === filter)

  // Only show filter tabs that actually have events
  const availableFilters = FILTERS.filter((f) => {
    if (f.key === 'tutti') return true
    if (f.key === 'soldout-risk') return events.some((e) => e.soldOutRisk)
    return events.some((e) => e.badge === f.key)
  })

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Calendario Eventi 2026"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="modal-head">
          <div>
            <p className="modal-season">🌴 Zante · Estate 2026</p>
            <h3>Calendario Eventi</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Chiudi">✕</button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="modal-filters">
          {availableFilters.map((f) => {
            const count = f.key === 'tutti'
              ? events.length
              : f.key === 'soldout-risk'
              ? events.filter((e) => e.soldOutRisk).length
              : events.filter((e) => e.badge === f.key).length
            return (
              <button
                key={f.key}
                type="button"
                className={`modal-filter-btn ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.icon} {f.label}
                <span className="modal-filter-count">{count}</span>
              </button>
            )
          })}
        </div>

        {/* ── Events list ── */}
        <div className="modal-body">
          {filtered.length === 0 ? (
            <div className="modal-empty">
              <p>Nessun evento in questa categoria.</p>
              <p>Torna presto — Gio sta preparando qualcosa di grosso 🔥</p>
            </div>
          ) : (
            <div className="modal-ev-list">
              {filtered.map((ev) => {
                const dates = Array.isArray(ev.dates) ? ev.dates : []
                const badgeClass = BADGE_COLORS[ev.badge] || 'badge-default'
                return (
                  <Link
                    to={`/eventi/${ev.id}`}
                    className="modal-ev-card"
                    key={ev.id}
                    onClick={onClose}
                  >
                    {/* Image */}
                    <div className="modal-ev-img">
                      {ev.imageId ? (
                        <img
                          src={cloudinaryUrl(ev.imageId, 'w_280,c_limit,q_auto:best,f_auto')}
                          alt={ev.title}
                          loading="lazy"
                        />
                      ) : ev.imageUrl ? (
                        <img
                          src={cloudinaryFetch(ev.imageUrl, 'w_280,c_limit,q_auto:best,f_auto')}
                          alt={ev.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className={`modal-ev-img-placeholder modal-ph-${(ev.category || 'beach')}`} />
                      )}
                      {ev.badge && (
                        <span className={`modal-ev-badge ${badgeClass}`}>{ev.badge}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="modal-ev-info">
                      <h4>{ev.title}</h4>
                      {ev.description && (
                        <p className="modal-ev-desc">{ev.description}</p>
                      )}
                      {ev.soldOutRisk && (
                        <p className="modal-ev-risk-label">🚨 Quasi esaurito</p>
                      )}

                      <div className="modal-ev-dates">
                        {dates.length > 0 ? dates.map((d, i) => (
                          <div key={i} className={`modal-ev-date-row${d.soldOut ? ' modal-ev-date-sold' : ''}`}>
                            <span className="modal-ev-date-text">
                              {d.soldOut ? '🚫' : '📅'} {d.date}{d.time ? ` · ${d.time}` : ''}
                            </span>
                            {d.soldOut && <span className="modal-date-sold-tag">SOLD OUT</span>}
                          </div>
                        )) : (
                          <div className="modal-ev-date-row">
                            <span className="modal-ev-date-text">📅 Date da confermare</span>
                          </div>
                        )}
                      </div>
                      <span className="modal-ev-goto">Vedi evento →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventsModal
