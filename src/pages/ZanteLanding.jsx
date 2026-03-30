import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion'
import EventsModal from '../components/EventsModal'
import { db, cloudinaryUrl, cloudinaryFetch } from '../config/firebase'
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

/* ─── LifePassWristband ──────────────────────── */
function LifePassWristband() {
  const cardRef = useRef(null)
  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [18, -18]), { stiffness: 200, damping: 22 })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-18, 18]), { stiffness: 200, damping: 22 })

  function onMouseMove(e) {
    const r = cardRef.current.getBoundingClientRect()
    mouseX.set((e.clientX - r.left) / r.width  - 0.5)
    mouseY.set((e.clientY - r.top)  / r.height - 0.5)
  }
  function onMouseLeave() { mouseX.set(0); mouseY.set(0) }

  return (
    <div className="lp-ticket-outer">
      <div className="lp-ticket-glow" />
      {/* floating wrapper — CSS keyframe handles levitate, Framer handles 3D tilt */}
      <div className="lp-float-wrap">
        <motion.div
          ref={cardRef}
          className="lp-wristband-wrap"
          style={{ rotateX, rotateY }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          initial={{ opacity: 0, y: 80, rotate: -8 }}
          whileInView={{ opacity: 1, y: 0, rotate: -8 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.07 }}
        >
          <img
            src="/life-pass-wristband.png"
            alt="Life Pass Wristband — Party con Gio Zante 2026"
            className="lp-wristband-img"
            draggable={false}
          />
        </motion.div>
      </div>
    </div>
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
          ? <img src={cloudinaryUrl(ev.imageId, 'w_600,h_800,c_fill,g_auto,q_auto:best,f_auto')} alt={ev.title} />
          : ev.imageUrl
            ? <img src={cloudinaryFetch(ev.imageUrl, 'w_600,h_800,c_fill,g_auto,q_auto:best,f_auto')} alt={ev.title} />
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

/* ─── Date helpers for chronological sort ────── */
const MONTHS_IT = {
  gennaio:0, febbraio:1, marzo:2, aprile:3, maggio:4, giugno:5,
  luglio:6, agosto:7, settembre:8, ottobre:9, novembre:10, dicembre:11,
}
function parseFirstDate(ev) {
  const str = Array.isArray(ev.dates) ? ev.dates[0]?.date : null
  if (!str) return new Date(9999, 0, 1)
  const p = str.toLowerCase().trim().split(/\s+/)
  return new Date(parseInt(p[2]) || 2026, MONTHS_IT[p[1]] ?? 0, parseInt(p[0]) || 1)
}
function chronoSort(arr) {
  return [...arr].sort((a, b) => parseFirstDate(a) - parseFirstDate(b))
}

function ZanteLanding() {
  const [modalOpen, setModalOpen]       = useState(false)
  const [modalFilter, setModalFilter]   = useState('tutti')
  const [contact, setContact]           = useState(EMPTY_CONTACT)
  const [contactState, setContactState] = useState('idle')
  const [scrolled, setScrolled]         = useState(false)

  const { events, loading: evLoading } = useEvents()
  const soldOutEvents = chronoSort(events.filter((e) => e.soldOutRisk))
  const allVisible    = chronoSort(events)

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
          <span className="logo-text">
            <span className="logo-accent">PARTY</span><span className="logo-mid">CON</span><span className="logo-accent">GIO</span>
          </span>
        </a>
        <div className="navbar-links">
          <button type="button" onClick={() => openModal('tutti')}>🎉 EVENTI</button>
          <a href="#gio">CHI SONO</a>
          <a href="#contatti" className="navbar-cta">PRENOTA ORA</a>
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
            PARTY A ZANTE<br />CON GIO'
          </motion.h1>
          <motion.p className="hero-tagline" variants={FADE_UP}>
            NON RESTARE FUORI.
          </motion.p>
          <motion.p className="hero-sub" variants={FADE_UP}>
            Ho selezionato per te i migliori beach, boat e night party dell&apos;isola.
            Zero stress, zero sold out — ci penso io.
          </motion.p>
          <motion.div className="hero-actions" variants={FADE_UP}>
            <motion.button
              type="button"
              className="btn-lime"
              onClick={() => openModal('tutti')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              🎉 SCOPRI GLI EVENTI
            </motion.button>
            <motion.a
              href="#gio"
              className="btn-outline-white"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              CHI SONO
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
            +9.000 partiti con Gio
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
            { val: '+50K',  label: 'Partecipanti 2025' },
            { val: '110',   label: 'Serate Estate 2026' },
            { val: '5',     label: 'Tipi di Party' },
            { val: '0',     label: 'Sold Out Sorpresa' },
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
          <p>Beach, boat, night, pool party e special guest. Gio seleziona solo il top per te.</p>
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
            <span>+9.000 partiti con Gio</span>
          </div>
          <div className="gio-photo-glow" />
        </div>

        {/* Text col */}
        <div className="gio-col">
          <div className="gio-text">
            <p className="label dark">Chi sono</p>
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

      {/* ══ LIFE PASS ════════════════════════════════ */}
      <section className="sec-lifepass">
        <motion.div
          className="lp-text"
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="label">🎁 SOLO PER CHI ACQUISTA ALMENO UN EVENTO</p>
          <h2>LIFE PASS<br />IN OMAGGIO</h2>
          <ul className="lp-perks">
            <li>✅ 1 ingresso incluso Beach Party</li>
            <li>✅ Sconti e Convenzioni</li>
            <li>✅ Assistenza h24</li>
          </ul>
          <motion.a
            href="https://wa.me/393289466213?text=Ciao Gio! Voglio il mio Life Pass omaggio 🎟"
            target="_blank"
            rel="noreferrer"
            className="btn-lime lp-cta"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            🎟 VOGLIO IL MIO LIFE PASS
          </motion.a>
          <p className="lp-note">+9.000 persone lo hanno già ricevuto nel 2025</p>
        </motion.div>

        <LifePassWristband />
      </section>

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
          <>
            <div className="scroll-row">
              {allVisible.slice(0, 4).map((ev) => <EventCard key={ev.id} ev={ev} />)}
            </div>
            {allVisible.length > 4 && (
              <div className="sec-more-cta">
                <motion.button type="button" className="btn-lime" onClick={() => openModal('tutti')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  🎉 SCOPRI TUTTI GLI EVENTI ({allVisible.length})
                </motion.button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* ══ SEZIONI BADGE ════════════════════════════ */}
      {BADGE_SECTIONS.map(({ badge, icon, title, dark }) => {
        const badgeEvents = chronoSort(events.filter((e) => e.badge === badge))
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
              {badgeEvents.slice(0, 4).map((ev) => <EventCard key={ev.id} ev={ev} />)}
            </div>
            {badgeEvents.length > 4 && (
              <div className="sec-more-cta">
                <motion.button type="button" className={dark ? 'btn-white' : 'btn-lime'} onClick={() => openModal(badge)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  🎉 SCOPRI TUTTI ({badgeEvents.length})
                </motion.button>
              </div>
            )}
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
            {soldOutEvents.slice(0, 4).map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </div>
          {soldOutEvents.length > 4 && (
            <div className="sec-more-cta">
              <motion.button type="button" className="btn-white" onClick={() => openModal('soldout-risk')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                🚨 VEDI TUTTI ({soldOutEvents.length})
              </motion.button>
            </div>
          )}
        </Section>
      )}

      {/* ══ PROMO PACK ═══════════════════════════════ */}
      <Section className="sec-promo-pack">
        <div className="pp-inner">
          <div className="pp-text">
            <span className="pp-badge">🎯 SUMMER PROMO</span>
            <h2>4 FESTE.<br />UN SOLO PREZZO.</h2>
            <div className="pp-price-row">
              <span className="pp-amount-big">€65</span>
              <span className="pp-old-price">€105</span>
            </div>
            <p>Pirate Ship con <strong>Open Bar</strong>, Paradiso Sunset, La Dolce Vita e Beach Party — drink inclusi + Life Pass braccialetto sconti. Solo su WhatsApp.</p>
            <motion.a
              href="https://wa.me/393289466213?text=Ciao Gio! Voglio il Summer Promo Pack da 65€ 🎉"
              target="_blank"
              rel="noreferrer"
              className="btn-lime pp-cta"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              💬 VOGLIO IL PROMO PACK
            </motion.a>
          </div>
          <div className="pp-flyer">
            <img
              src="https://res.cloudinary.com/djb2nkpez/image/upload/w_560,c_limit,q_auto:best,f_auto/PHOTO-2026-03-30-17-55-35_rqajxv"
              alt="Summer Promo Pack — 4 feste €65"
              className="pp-flyer-img"
            />
          </div>
        </div>
      </Section>

      {/* ══ CONTATTI ═════════════════════════════════ */}
      <Section id="contatti" className="sec sec-contact">
        <div className="contact-photo-wrap">
          {/* slot foto — sostituisci /gio-contact.jpg con la tua foto */}
          <img src="/gio-contact.jpg" alt="Gio" className="contact-photo" onError={(e) => { e.currentTarget.style.display='none' }} />
          <div className="contact-photo-placeholder">GIO</div>
        </div>
        <div className="contact-text">
          <p className="label">Scrivimi direttamente</p>
          <h2>Scrivimi prima<br />di partire.<br />Ti aspetto a Laganas 🌊</h2>
          <p>Rispondo personalmente su WhatsApp, Instagram e TikTok. Nessun bot, solo io — prima che tu parta e ogni sera sull&apos;isola.</p>
          <div className="contact-buttons">
            <motion.a className="btn-lime" href="https://wa.me/393289466213" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>💬 SCRIVIMI SU WHATSAPP</motion.a>
            <motion.a className="btn-dark" href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>📸 INSTAGRAM</motion.a>
            <motion.a className="btn-dark" href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>🎵 TIKTOK</motion.a>
          </div>
        </div>
      </Section>

      {/* ══ PARTNER STRIP ════════════════════════════ */}
      <Section className="sec-partner-strip">
        <div className="ps-inner">
          <div className="ps-text">
            <p className="label">Collaborazioni 2026</p>
            <h2>Vuoi portare il tuo brand a Zante?</h2>
            <p>Target 18–25 anni. 50.000+ partecipanti, 110 serate, 5 tipi di party. Visibilità diretta sul pubblico giusto.</p>
          </div>
          <div className="ps-actions">
            <motion.a className="btn-lime" href="https://wa.me/393289466213" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>💬 CONTATTAMI</motion.a>
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
        <span className="logo-text footer-logo-text">
          <span className="logo-accent">PARTY</span><span className="logo-mid">CON</span><span className="logo-accent">GIO</span>
        </span>
        <p className="footer-claim">{siteConfig.claim}</p>
        <div className="footer-socials">
          <a href="https://wa.me/393289466213"               target="_blank" rel="noreferrer">💬 WhatsApp</a>
          <a href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer">📸 Instagram</a>
          <a href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer">🎵 TikTok</a>
        </div>
        <a
          href="https://wa.me/393289466213"
          className="footer-wa-cta"
          target="_blank"
          rel="noreferrer"
        >
          💬 SCRIVIMI SU WHATSAPP
        </a>
        <div className="footer-partners">
          {partners.map((p) => <span key={p}>{p}</span>)}
        </div>
        <p className="footer-copy">© 2026 Party con Gio · Zante Edition · Tutti i diritti riservati</p>
      </footer>

      {/* ══ MOBILE BAR ═══════════════════════════════ */}
      <div className="mobile-bar">
        <button type="button" onClick={() => openModal('tutti')}>🎉 EVENTI</button>
        <a href="#gio">CHI SONO</a>
        <a href="#contatti">CONTATTI</a>
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
