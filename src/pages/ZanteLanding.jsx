import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import EventsModal from '../components/EventsModal'
import { db, cloudinaryUrl } from '../config/firebase'
import { useEvents } from '../hooks/useEvents'
import {
  BADGE_SECTIONS,
  benefits,
  faqs,
  partners,
  siteConfig,
} from '../data/zanteData'
import './ZanteLanding.css'

/* ─── Animation variants ──────────────────────── */
const FADE_UP = {
  hidden:  { opacity: 0, y: 44 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}
const STAGGER = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}

/* ─── Category cards data ────────────────────── */
const CATEGORY_CARDS = [
  {
    id: 'beach',
    title: 'Beach Party',
    subtitle: 'Spiaggia, sole e vibes estive',
    icon: '🏖',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=85',
  },
  {
    id: 'boat',
    title: 'Boat Party',
    subtitle: 'Musica sul mare aperto',
    icon: '⛵',
    img: 'https://images.unsplash.com/photo-1559049977-56e0e22a4a48?w=900&q=85',
  },
  {
    id: 'night',
    title: 'Night Club',
    subtitle: 'I club più hot di Laganas',
    icon: '🌙',
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&q=85',
  },
  {
    id: 'pool',
    title: 'Pool Party',
    subtitle: 'Piscina, cocktail e DJ set',
    icon: '💦',
    img: 'https://images.unsplash.com/photo-1622313762347-3c09fe5f2719?w=900&q=85',
  },
]

/* ─── Section scroll-reveal wrapper ─────────── */
function Section({ children, className = '', id, style }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      style={style}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={FADE_UP}
    >
      {children}
    </motion.section>
  )
}

/* ─── EventCard ──────────────────────────────── */
const MotionLink = motion(Link)

function EventCard({ ev }) {
  const primaryDate = Array.isArray(ev.dates) ? ev.dates[0] : null
  return (
    <MotionLink
      to={`/eventi/${ev.id}`}
      className="ev-card"
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
    >
      <div className="ev-thumb">
        {ev.imageId
          ? <img src={cloudinaryUrl(ev.imageId, 'w_460,h_320,c_fill,q_auto,f_auto')} alt={ev.title} />
          : <div className="ev-thumb-gradient" />
        }
        {ev.badge && (
          <span className={`ev-badge-chip ev-badge-${(ev.badge || '').toLowerCase().replace(/\s+/g, '-')}`}>
            {ev.badge}
          </span>
        )}
        {ev.soldOutRisk && <span className="ev-risk-chip">🚨</span>}
      </div>
      <div className="ev-body">
        <strong>{ev.title}</strong>
        {primaryDate && (
          <p>📅 {primaryDate.date}{primaryDate.time ? ` · ${primaryDate.time}` : ''}</p>
        )}
        {Array.isArray(ev.dates) && ev.dates.length > 1 && (
          <p className="ev-more-dates">+{ev.dates.length - 1} data</p>
        )}
        <span className="ev-link">Scopri →</span>
      </div>
    </MotionLink>
  )
}

/* ─── MAIN ───────────────────────────────────── */
const EMPTY_CONTACT = { name: '', email: '', phone: '', message: '' }

function ZanteLanding() {
  const [modalOpen, setModalOpen]       = useState(false)
  const [modalFilter, setModalFilter]   = useState('tutti')
  const [contact, setContact]           = useState(EMPTY_CONTACT)
  const [contactState, setContactState] = useState('idle')
  const [scrolled, setScrolled]         = useState(false)

  const { events, loading: evLoading } = useEvents()
  const soldOutEvents = events.filter((e) => e.soldOutRisk)
  const allVisible    = events.slice(0, 8)

  /* Navbar transparency on scroll */
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  function openModal(filter = 'tutti') {
    setModalFilter(filter)
    setModalOpen(true)
  }

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setModalOpen(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
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
      {/* ══ NAV ══════════════════════════════════════ */}
      <nav className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
        <a href="/" className="navbar-logo">
          <img
            src="https://res.cloudinary.com/djb2nkpez/image/upload/w_280,h_90,c_fit,f_auto,q_auto/1-removebg-preview_fddema"
            alt="Party con Gio"
            className="navbar-logo-img"
          />
        </a>
        <div className="navbar-links">
          <button type="button" onClick={() => openModal('tutti')}>🎉 Eventi</button>
          <a href="#gio">Chi è Gio</a>
          <a href="#contatti" className="navbar-cta">Prenota ora</a>
        </div>
      </nav>

      {/* ══ HERO ═════════════════════════════════════ */}
      <section className="hero">
        {/* Festival video background */}
        <div className="hero-bg-video-wrap">
          <video
            className="hero-bg-video"
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&q=80"
          >
            <source src="https://assets.mixkit.co/videos/4269/4269-720.mp4" type="video/mp4" />
          </video>
        </div>

        {/* gradient overlay */}
        <div className="hero-overlay" />

        {/* floating orbs */}
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />

        {/* Content */}
        <motion.div
          className="hero-inner"
          initial="hidden"
          animate="visible"
          variants={STAGGER}
        >
          <motion.p className="label" variants={FADE_UP}>
            Zante Edition · Estate 2026
          </motion.p>
          <motion.h1 variants={FADE_UP}>
            PARTY A ZANTE.<br />NON RESTARE FUORI.
          </motion.h1>
          <motion.p className="hero-sub" variants={FADE_UP}>
            Ho selezionato per te i migliori beach, boat e night party dell&apos;isola.
            Zero stress, zero sold out.
          </motion.p>
          <motion.div className="hero-actions" variants={FADE_UP}>
            <motion.button
              type="button"
              className="btn-lime"
              onClick={() => openModal('tutti')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              🎉 Scopri gli eventi
            </motion.button>
            <motion.a
              href="#gio"
              className="btn-outline-white"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              Chi è Gio
            </motion.a>
          </motion.div>
        </motion.div>

        {/* Breaking-frame card */}
        <motion.div
          className="hcs-outer"
          aria-hidden="true"
          initial={{ opacity: 0, x: 60, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          <div className="hcs-frame" />
          <div className="hcs-person">
            <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=700&q=85" alt="Gio" />
          </div>
          <div className="hcs-glow" />
          <div className="hcs-badge">PCG</div>
          <div className="hcs-pill hcs-pill-top">✨ Party Experience Garantita</div>
          <div className="hcs-chip hcs-chip-live">
            <span className="hcs-dot" />Online ora
          </div>
          <div className="hcs-chip hcs-chip-crew">
            <span className="hcs-avatars"><i /><i /><i /></span>
            +184 partiti con Gio
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          className="hero-stats"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          {[
            { val: '200+', label: 'Partecipanti 2025' },
            { val: '15+',  label: 'Serate Estate 2026' },
            { val: '4',    label: 'Tipi di Party' },
            { val: '0',    label: 'Sold Out Sorpresa' },
          ].map((s, i, arr) => (
            <>
              <div className="hs-item" key={s.label}>
                <span>{s.val}</span>
                <p>{s.label}</p>
              </div>
              {i < arr.length - 1 && <div className="hs-sep" key={`sep-${i}`} />}
            </>
          ))}
        </motion.div>
      </section>

      {/* ══ CATEGORIE ════════════════════════════════ */}
      <Section className="sec-categories">
        <div className="cat-header">
          <p className="label dark">Scegli la tua esperienza</p>
          <h2>Ogni giorno un party diverso</h2>
          <p>Beach, boat, night e pool party. Gio seleziona solo il top per te.</p>
        </div>
        <div className="cat-grid">
          {CATEGORY_CARDS.map((cat) => (
            <motion.button
              key={cat.id}
              className="cat-card"
              style={{ backgroundImage: `url('${cat.img}')` }}
              onClick={() => openModal('tutti')}
              whileHover={{ scale: 1.025 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <div className="cat-overlay" />
              <div className="cat-body">
                <span className="cat-icon">{cat.icon}</span>
                <h3>{cat.title}</h3>
                <p className="cat-subtitle">{cat.subtitle}</p>
                <span className="cat-cta-pill">Scopri eventi →</span>
              </div>
            </motion.button>
          ))}
        </div>
      </Section>

      {/* ══ GIO ══════════════════════════════════════ */}
      <Section id="gio" className="sec sec-gio">
        {/* Photo col */}
        <div className="gio-photo-wrap">
          <img
            src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=700&q=85"
            alt="Gio — Party con Gio"
            className="gio-photo"
          />
          <div className="gio-photo-badge">
            <span>🌟</span>
            <span>+184 partiti con Gio</span>
          </div>
          <div className="gio-photo-glow" />
        </div>

        {/* Text col */}
        <div className="gio-col">
          <div className="gio-text">
            <p className="label dark">Chi è Gio</p>
            <h2>Il volto degli eventi<br />a Zante da anni</h2>
            <p>Sono Gio. Seleziono solo il top, ti seguo prima che tu parta e ti trovi direttamente a Laganas. Un riferimento reale, non un bot.</p>
            <p className="claim">{siteConfig.claim}</p>
          </div>
          <motion.div
            className="gio-benefits"
            variants={STAGGER}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {benefits.map((item, i) => (
              <motion.div className="ben-item" key={item.title} variants={FADE_UP}>
                <span className="ben-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ══ TUTTI GLI EVENTI ═════════════════════════ */}
      <Section className="sec sec-events">
        <div className="sec-header">
          <div>
            <p className="label dark">Estate 2026</p>
            <h2>Tutti gli Eventi di Zante</h2>
          </div>
          <motion.button
            type="button"
            className="btn-dark"
            onClick={() => openModal('tutti')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Apri calendario →
          </motion.button>
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
      </Section>

      {/* ══ SEZIONI BADGE ════════════════════════════ */}
      {BADGE_SECTIONS.map(({ badge, icon, title, dark }) => {
        const badgeEvents = events.filter((e) => e.badge === badge)
        if (badgeEvents.length === 0) return null
        return (
          <Section key={badge} className={`sec sec-badge-row${dark ? ' sec-dark' : ''}`}>
            <div className="sec-header">
              <div>
                <p className={`label${dark ? '' : ' dark'}`}>{icon} Categoria</p>
                <h2>{icon} {title}</h2>
              </div>
              <motion.button
                type="button"
                className={dark ? 'btn-white' : 'btn-dark'}
                onClick={() => openModal(badge)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                Vedi tutti →
              </motion.button>
            </div>
            <div className="scroll-row">
              {badgeEvents.map((ev) => <EventCard key={ev.id} ev={ev} />)}
            </div>
          </Section>
        )
      })}

      {/* ══ SOLD OUT ALERT ═══════════════════════════ */}
      {soldOutEvents.length > 0 && (
        <Section className="sec sec-soldout">
          <div className="sec-header">
            <div>
              <p className="label">🚨 Attenzione</p>
              <h2>Sold Out Alert</h2>
            </div>
            <motion.button
              type="button"
              className="btn-white"
              onClick={() => openModal('soldout-risk')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              Vedi tutti →
            </motion.button>
          </div>
          <div className="scroll-row">
            {soldOutEvents.map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </div>
        </Section>
      )}

      {/* ══ CONTATTI ═════════════════════════════════ */}
      <Section id="contatti" className="sec sec-contact">
        <div className="contact-card">
          <div className="contact-avatar">GIO</div>
          <div className="contact-bubbles">
            <span>Scrivimi prima di partire</span>
            <span>Ci vediamo a Laganas</span>
          </div>
        </div>
        <div className="contact-text">
          <p className="label">Contatti diretti</p>
          <h2>Parla con Gio<br />in prima persona</h2>
          <p>Supporto reale su WhatsApp, Instagram e TikTok. Prima, durante e dopo Zante.</p>
          <div className="contact-buttons">
            <motion.a className="btn-lime" href="https://wa.me/393289466213" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>💬 WhatsApp</motion.a>
            <motion.a className="btn-dark" href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>📸 Instagram</motion.a>
            <motion.a className="btn-dark" href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>🎵 TikTok</motion.a>
          </div>
          <form className="contact-form" onSubmit={handleContact}>
            <h3>O scrivimi direttamente</h3>
            {contactState === 'sent'  && <p className="cf-success">✅ Messaggio inviato! Gio ti risponde al più presto.</p>}
            {contactState === 'error' && <p className="cf-error">❌ Errore. Riprova o scrivimi su WhatsApp.</p>}
            {contactState !== 'sent' && (
              <>
                <div className="cf-row">
                  <input type="text"  placeholder="Il tuo nome *" value={contact.name}    onChange={(e) => setContact({ ...contact, name: e.target.value })} required />
                  <input type="email" placeholder="Email"          value={contact.email}   onChange={(e) => setContact({ ...contact, email: e.target.value })} />
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
      </Section>

      {/* ══ PARTNER STRIP ════════════════════════════ */}
      <Section className="sec-partner-strip">
        <div className="ps-inner">
          <div className="ps-text">
            <p className="label">Collaborazioni 2026</p>
            <h2>Vuoi portare il tuo brand a Zante?</h2>
            <p>Target 18–25 anni. Visibilità su beach, boat e night party. 2K+ follower, 500+ partecipanti.</p>
          </div>
          <div className="ps-actions">
            <motion.a className="btn-lime" href="mailto:partnership@partycongio.com" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>✉ Media kit</motion.a>
            <motion.a className="btn-outline-white" href="#contatti" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>Parla con Gio</motion.a>
          </div>
        </div>
      </Section>

      {/* ══ FAQ ══════════════════════════════════════ */}
      <Section className="sec sec-faq">
        <p className="label">Hai dubbi?</p>
        <h2>Domande Frequenti su Zante</h2>
        <p className="sec-sub">Tutto quello che vuoi sapere prima di prenotare.</p>
        <div className="faq-list">
          {faqs.map((item) => (
            <details key={item.question} className="faq-item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ══ FOOTER ═══════════════════════════════════ */}
      <footer className="footer">
        <img
          src="https://res.cloudinary.com/djb2nkpez/image/upload/w_220,h_80,c_fit,f_auto,q_auto/1-removebg-preview_fddema"
          alt="Party con Gio"
          className="footer-logo"
        />
        <p className="footer-claim">{siteConfig.claim}</p>
        <div className="footer-socials">
          <a href="https://wa.me/393289466213"               target="_blank" rel="noreferrer">💬 WhatsApp</a>
          <a href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer">📸 Instagram</a>
          <a href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer">🎵 TikTok</a>
        </div>
        <div className="footer-partners">
          {partners.map((p) => <span key={p}>{p}</span>)}
        </div>
      </footer>

      {/* ══ MOBILE BAR ═══════════════════════════════ */}
      <div className="mobile-bar">
        <button type="button" onClick={() => openModal('tutti')}>🎉 Eventi</button>
        <a href="#gio">Gio</a>
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
