import { useEffect, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import EventsModal from '../components/EventsModal'
import { db, cloudinaryUrl } from '../config/firebase'
import { useEvents } from '../hooks/useEvents'
import {
  BADGE_SECTIONS,
  benefits,
  buildTrackedLink,
  faqs,
  partners,
  siteConfig,
} from '../data/zanteData'
import './ZanteLanding.css'

const EMPTY_CONTACT = { name: '', email: '', phone: '', message: '' }

function EventCard({ ev, variant }) {
  const primaryDate = Array.isArray(ev.dates) ? ev.dates[0] : null
  const isDark = variant === 'dark'
  return (
    <article className={`ev-card ${isDark ? 'ev-card-dark' : ''}`}>
      <div className="ev-thumb">
        {ev.imageId
          ? <img src={cloudinaryUrl(ev.imageId, 'w_320,h_160,c_fill,q_auto,f_auto')} alt={ev.title} />
          : <div className={`ev-thumb-gradient ${isDark ? 'ev-thumb-gradient-dark' : ''}`} />
        }
        <span className={`ev-badge-chip ev-badge-${(ev.badge || '').toLowerCase().replace(/\s+/g, '-')}`}>
          {ev.badge}
        </span>
        {ev.soldOutRisk && <span className="ev-risk-chip">🚨 Quasi esaurito</span>}
      </div>
      <div className="ev-body">
        <strong>{ev.title}</strong>
        {primaryDate && (
          <p>📅 {primaryDate.date}{primaryDate.time ? ` · ${primaryDate.time}` : ''}</p>
        )}
        {Array.isArray(ev.dates) && ev.dates.length > 1 && (
          <p className="ev-more-dates">+{ev.dates.length - 1} altra{ev.dates.length > 2 ? 'e' : ''} data</p>
        )}
        {primaryDate?.referral ? (
          <a
            href={buildTrackedLink(primaryDate.referral, ev.id)}
            target="_blank"
            rel="noreferrer"
            className={`ev-link ${isDark ? 'ev-link-light' : ''}`}
          >
            Prenota ora →
          </a>
        ) : (
          <a href="#contatti" className={`ev-link ${isDark ? 'ev-link-light' : ''}`}>
            Contatta Gio →
          </a>
        )}
      </div>
    </article>
  )
}

function ZanteLanding() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalFilter, setModalFilter] = useState('tutti')
  const [contact, setContact] = useState(EMPTY_CONTACT)
  const [contactState, setContactState] = useState('idle')

  const { events, loading: evLoading } = useEvents()

  const soldOutEvents = events.filter((e) => e.soldOutRisk)
  const allVisible = events.slice(0, 8)

  function openModal(filter = 'tutti') {
    setModalFilter(filter)
    setModalOpen(true)
  }

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') setModalOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [])

  async function handleContact(e) {
    e.preventDefault()
    if (!contact.name.trim() || !contact.message.trim()) return
    setContactState('sending')
    try {
      await addDoc(collection(db, 'contacts'), { ...contact, createdAt: serverTimestamp() })
      setContactState('sent')
      setContact(EMPTY_CONTACT)
    } catch {
      setContactState('error')
    }
  }

  return (
    <>
      {/* ── NAV ── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          <img
            src="https://res.cloudinary.com/djb2nkpez/image/upload/w_280,h_90,c_fit,f_auto,q_auto/1-removebg-preview_fddema"
            alt="Party con Gio"
            className="navbar-logo-img"
          />
        </a>
        <div className="navbar-links">
          <button type="button" onClick={() => openModal('tutti')}>🎉 Eventi 2026</button>
          {soldOutEvents.length > 0 && (
            <button type="button" onClick={() => openModal('soldout-risk')}>🚨 Sold Out</button>
          )}
          <a href="#contatti" className="navbar-cta">Contattami</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-inner">
          <p className="label">Zante Edition · Estate 2026</p>
          <h1>PARTY A ZANTE.<br />NON RESTARE FUORI.</h1>
          <p className="hero-sub">Ho selezionato per te i migliori beach, boat e night party dell&apos;isola. Zero stress, zero sold out.</p>
          <div className="hero-actions">
            <button type="button" className="btn-lime" onClick={() => openModal('tutti')}>
              Scopri gli eventi
            </button>
            <a href="#gio" className="btn-outline-white">Chi è Gio</a>
          </div>
        </div>

        <div className="hcs-outer" aria-hidden="true">
          <div className="hcs-frame" />
          <div className="hcs-person">
            <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=700&q=85" alt="Gio referente Zante" />
          </div>
          <div className="hcs-glow" />
          <div className="hcs-badge">PCG</div>
          <div className="hcs-pill hcs-pill-top">✨ Party Experience Garantita</div>
          <div className="hcs-chip hcs-chip-live">
            <span className="hcs-dot" />
            Online ora
          </div>
          <div className="hcs-chip hcs-chip-crew">
            <span className="hcs-avatars"><i /><i /><i /></span>
            +184 partiti con Gio
          </div>
        </div>
      </section>

      {/* ── GIO ── */}
      <section id="gio" className="sec sec-gio">
        <div className="gio-text">
          <p className="label dark">Chi è Gio</p>
          <h2>Il volto degli eventi a Zante da anni</h2>
          <p>Sono Gio. Seleziono solo il top, ti seguo prima che tu parta e ti trovi direttamente a Laganas. Un riferimento reale, non un bot.</p>
          <p className="claim">{siteConfig.claim}</p>
        </div>
        <div className="gio-benefits">
          {benefits.map((item, i) => (
            <div className="ben-item" key={item.title}>
              <span className="ben-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TUTTI GLI EVENTI ── */}
      <section className="sec sec-events">
        <div className="sec-header">
          <div>
            <p className="label dark">Estate 2026</p>
            <h2>Tutti gli Eventi di Zante</h2>
          </div>
          <button type="button" className="btn-dark" onClick={() => openModal('tutti')}>
            Apri calendario →
          </button>
        </div>
        {evLoading ? (
          <p className="ev-loading">Caricamento eventi…</p>
        ) : allVisible.length === 0 ? (
          <p className="ev-loading">Presto disponibili. Stay tuned! 🎉</p>
        ) : (
          <div className="scroll-row">
            {allVisible.map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </div>
        )}
      </section>

      {/* ── SEZIONI DINAMICHE PER BADGE ── */}
      {BADGE_SECTIONS.map(({ badge, icon, title, dark }) => {
        const badgeEvents = events.filter((e) => e.badge === badge)
        if (badgeEvents.length === 0) return null
        return (
          <section key={badge} className={`sec sec-badge-row ${dark ? 'sec-dark' : ''}`}>
            <div className="sec-header">
              <div>
                <p className={`label ${dark ? '' : 'dark'}`}>{icon} Categoria</p>
                <h2>{icon} {title}</h2>
              </div>
              <button
                type="button"
                className={dark ? 'btn-white' : 'btn-dark'}
                onClick={() => openModal(badge)}
              >
                Vedi tutti →
              </button>
            </div>
            <div className="scroll-row">
              {badgeEvents.map((ev) => <EventCard key={ev.id} ev={ev} variant={dark ? 'dark' : 'light'} />)}
            </div>
          </section>
        )
      })}

      {/* ── SOLD OUT ALERT ── */}
      {soldOutEvents.length > 0 && (
        <section className="sec sec-soldout">
          <div className="sec-header">
            <div>
              <p className="label">🚨 Attenzione</p>
              <h2>Sold Out Alert</h2>
            </div>
            <button type="button" className="btn-white" onClick={() => openModal('soldout-risk')}>
              Vedi tutti →
            </button>
          </div>
          <div className="scroll-row">
            {soldOutEvents.map((ev) => <EventCard key={ev.id} ev={ev} variant="dark" />)}
          </div>
        </section>
      )}

      {/* ── CONTATTI ── */}
      <section id="contatti" className="sec sec-contact">
        <div className="contact-card">
          <div className="contact-avatar">GIO</div>
          <div className="contact-bubbles">
            <span>Scrivimi prima di partire</span>
            <span>Ci vediamo a Laganas</span>
          </div>
        </div>
        <div className="contact-text">
          <p className="label">Contatti diretti</p>
          <h2>Parla con Gio in prima persona</h2>
          <p>Supporto reale su WhatsApp, Instagram e TikTok. Prima, durante e dopo Zante.</p>
          <div className="contact-buttons">
            <a className="btn-lime" href="https://wa.me/393289466213" target="_blank" rel="noreferrer">💬 WhatsApp</a>
            <a className="btn-dark" href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer">📸 Instagram</a>
            <a className="btn-dark" href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer">🎵 TikTok</a>
          </div>
          <form className="contact-form" onSubmit={handleContact}>
            <h3>O scrivimi direttamente</h3>
            {contactState === 'sent' && <p className="cf-success">✅ Messaggio inviato! Gio ti risponde al più presto.</p>}
            {contactState === 'error' && <p className="cf-error">❌ Errore nell&apos;invio. Riprova o scrivimi su WhatsApp.</p>}
            {contactState !== 'sent' && (
              <>
                <div className="cf-row">
                  <input type="text" placeholder="Il tuo nome *" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} required />
                  <input type="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                </div>
                <input type="tel" placeholder="Numero di telefono (opzionale)" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="cf-full" />
                <textarea rows="4" placeholder="Di cosa hai bisogno? Scrivi qui… *" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} required />
                <button type="submit" className="btn-lime cf-submit" disabled={contactState === 'sending'}>
                  {contactState === 'sending' ? 'Invio in corso…' : 'Invia messaggio'}
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* ── PARTNER ── */}
      <section className="sec-partner-full">
        <div className="partner-header">
          <p className="label">Collaborazioni 2026</p>
          <h2>Diventa Partner<br />o Sponsor</h2>
          <p>Raggiungi un pubblico 18–25 anni ad alta intenzione di acquisto. Beach, boat e night party a Zante 2026.</p>
          <div className="partner-btns">
            <a className="btn-lime" href="mailto:partnership@partycongio.com">✉ Richiedi media kit</a>
            <a className="btn-outline-white" href="#contatti">Parla con Gio</a>
          </div>
        </div>
        <div className="partner-stats">
          {[
            { val: '2K+', label: 'Follower attivi' },
            { val: '10+', label: 'Eventi stagione' },
            { val: '500+', label: 'Partecipanti 2025' },
            { val: '18–25', label: 'Target età' },
          ].map((s) => (
            <div className="partner-stat" key={s.label}>
              <span className="partner-stat-val">{s.val}</span>
              <span className="partner-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="partner-perks">
          {[
            { icon: '👁', t: 'Visibilità reale', d: 'Sito, reels, stories e community attiva per tutta la stagione.' },
            { icon: '🎯', t: 'Lead qualificati', d: 'Pubblico giovane con intenzione diretta di acquisto biglietti.' },
            { icon: '⚡', t: 'Attivazioni custom', d: 'Promo, codici sconto, contenuti branded e brand takeover.' },
            { icon: '📍', t: 'Presenza in loco', d: 'Branding agli eventi fisici direttamente a Laganas, Zante.' },
            { icon: '📊', t: 'Report finale', d: 'Statistiche impression, click e conversioni della campagna.' },
            { icon: '💬', t: 'Contatto diretto', d: 'Interlocutore unico: Gio ti segue dalla firma al risultato.' },
          ].map((p) => (
            <div className="partner-perk" key={p.t}>
              <span className="partner-perk-icon">{p.icon}</span>
              <div><strong>{p.t}</strong><p>{p.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="sec sec-faq">
        <p className="label">Hai dubbi?</p>
        <h2>Domande Frequenti su Zante</h2>
        <p className="sec-sub">Tutto quello che vuoi sapere prima di prenotare. Zero dubbi. Party adesso.</p>
        <div className="faq-list">
          {faqs.map((item) => (
            <details key={item.question} className="faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <img
          src="https://res.cloudinary.com/djb2nkpez/image/upload/w_220,h_80,c_fit,f_auto,q_auto/1-removebg-preview_fddema"
          alt="Party con Gio"
          className="footer-logo"
        />
        <p className="footer-claim">{siteConfig.claim}</p>
        <div className="footer-socials">
          <a href="https://wa.me/393289466213" target="_blank" rel="noreferrer">💬 WhatsApp</a>
          <a href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer">📸 Instagram</a>
          <a href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer">🎵 TikTok</a>
        </div>
        <div className="footer-partners">
          {partners.map((p) => <span key={p}>{p}</span>)}
        </div>
      </footer>

      {/* ── MOBILE BAR ── */}
      <div className="mobile-bar">
        <button type="button" onClick={() => openModal('tutti')}>🎉 Eventi</button>
        {soldOutEvents.length > 0 && (
          <button type="button" onClick={() => openModal('soldout-risk')}>🚨 Alert</button>
        )}
        <a href="#contatti">Contatti</a>
      </div>

      <EventsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        events={events}
        initialFilter={modalFilter}
      />
    </>
  )
}

export default ZanteLanding
