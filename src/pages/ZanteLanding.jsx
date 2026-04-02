import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion'
import EventsModal from '../components/EventsModal'
import { IcoWA, IcoIG, IcoTT } from '../components/SocialIcons'
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
    filterType: 'category',
    filterValue: 'beach',
    title: 'Beach Party',
    subtitle: 'Spiaggia, sole e vibes estive',
    icon: '🏖',
    color: '#f59e0b',
    // spiaggia tropicale con onde e sabbia
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=85',
  },
  {
    id: 'boat',
    filterType: 'category',
    filterValue: 'boat',
    title: 'Boat Party',
    subtitle: 'Musica sul mare aperto',
    icon: '⛵',
    color: '#0ea5e9',
    // festa su barca con gente che balla sul ponte
    img: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=900&q=85',
  },
  {
    id: 'night',
    filterType: 'category',
    filterValue: 'night',
    title: 'Night Club',
    subtitle: 'I club più hot di Laganas',
    icon: '🌙',
    color: '#8b5cf6',
    // folla in discoteca con luci laser e strobo
    img: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=900&q=85',
  },
  {
    id: 'pool',
    filterType: 'category',
    filterValue: 'pool',
    title: 'Pool Party',
    subtitle: 'Piscina, cocktail e DJ set',
    icon: '💦',
    color: '#06b6d4',
    // pool party affollato con persone in piscina
    img: 'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=900&q=85',
  },
  {
    id: 'tendenza',
    filterType: 'badge',
    filterValue: 'TENDENZA',
    title: 'Trend',
    titleClass: 'cat-title-trend',
    subtitle: 'Gli eventi piu in trend',
    icon: '💖',
    color: '#d946ef',
    // folla euforica con confetti e luci fucsia
    img: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=900&q=85',
  },
  {
    id: 'special',
    filterType: 'badge',
    filterValue: 'SPECIAL GUEST',
    titleLines: ['Special', 'Guest'],
    titleClass: 'cat-title-special-guest',
    subtitle: 'Artisti ospiti e serate esclusive',
    icon: '🎤',
    color: '#ffd700',
    // dj in lontananza sul palco con folla e luci
    img: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=900&q=85',
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

/* ─── ScrollRow with arrow buttons ──────────── */
function ScrollRowArrows({ children, className = '', autoScroll = false }) {
  const ref = useRef(null)
  function scroll(dir) {
    ref.current?.scrollBy({ left: dir * 290, behavior: 'smooth' })
  }
  return (
    <div className={`sra-wrap ${className}${autoScroll ? ' sra-auto' : ''}`}>
      <button className="sra-btn sra-prev" onClick={() => scroll(-1)} aria-label="Precedente">‹</button>
      <div className="scroll-row sra-inner" ref={ref}>{children}</div>
      <button className="sra-btn sra-next" onClick={() => scroll(1)} aria-label="Successivo">›</button>
    </div>
  )
}

/* ─── LifePassWristband ──────────────────────── */
function LifePassWristband() {
  const cardRef   = useRef(null)
  const mouseX    = useMotionValue(0)
  const mouseY    = useMotionValue(0)
  const rotateX   = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), { stiffness: 180, damping: 26 })
  const rotateY   = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), { stiffness: 180, damping: 26 })
  const isTouch   = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

  function onMouseMove(e) {
    if (isTouch || !cardRef.current) return
    const r = cardRef.current.getBoundingClientRect()
    mouseX.set((e.clientX - r.left) / r.width  - 0.5)
    mouseY.set((e.clientY - r.top)  / r.height - 0.5)
  }
  function onMouseLeave() { mouseX.set(0); mouseY.set(0) }

  return (
    <div className="lp-ticket-outer">
      <div className="lp-ticket-glow" />
      <div className="lp-float-wrap">
        <motion.div
          ref={cardRef}
          className="lp-wristband-wrap"
          style={isTouch ? {} : { rotateX, rotateY }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          initial={{ opacity: 0, y: 60, rotate: -8 }}
          whileInView={{ opacity: 1, y: 0, rotate: -8 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          whileHover={isTouch ? {} : { scale: 1.06 }}
        >
          <img
            src="/life-pass-wristband.png"
            alt="Life Pass Wristband — Party con Gio Zante 2026"
            className="lp-wristband-img"
            draggable={false}
            loading="lazy"
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
          ? <img src={cloudinaryUrl(ev.imageId, 'w_520,h_720,c_fill,g_auto,q_auto:good,f_auto')} alt={ev.title} loading="lazy" decoding="async" />
          : ev.imageUrl
            ? <img src={cloudinaryFetch(ev.imageUrl, 'w_520,h_720,c_fill,g_auto,q_auto:good,f_auto')} alt={ev.title} loading="lazy" decoding="async" />
            : <div className="ev-thumb-gradient" />
        }
        {ev.badge && (
          <span className={`ev-badge-chip ev-badge-${(ev.badge || '').toLowerCase().replace(/\s+/g, '-')}`}>
            {ev.badge}
          </span>
        )}
        {ev.soldOutRisk && <span className="ev-risk-chip">🚨</span>}
        {ev.drinkIncluso && <span className="ev-drink-chip">🍹 drink incluso</span>}
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
  const [activeCat, setActiveCat]       = useState(null)

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
        {/* Hero video background — tuo video in priorità */}
        <div className="hero-bg-video-wrap">
          <video
            className="hero-bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            <source src="/hero.mp4" type="video/mp4" />
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
            <Fragment key={s.label}>
              <div className="hs-item">
                <span>{s.val}</span>
                <p>{s.label}</p>
              </div>
              {i < arr.length - 1 && <div className="hs-sep" />}
            </Fragment>
          ))}
        </motion.div>
      </section>

      {/* ══ CATEGORIE ════════════════════════════════ */}
      <Section className="sec-categories">
        <div className="cat-header">
          <p className="label dark">Scegli la tua esperienza</p>
          <h2>Ogni giorno un party diverso</h2>
          <p className="cat-header-sub">Beach · Boat · Night · Pool · Special Guest</p>
        </div>
        <div className="cat-grid">
          {CATEGORY_CARDS.map((cat) => {
            const isActive = activeCat === cat.id
            return (
              <motion.button
                key={cat.id}
                className={`cat-card${isActive ? ' cat-active' : ''}`}
                style={{
                  backgroundImage: `url('${cat.img}')`,
                  '--cat-color': cat.color,
                }}
                onClick={() => setActiveCat(isActive ? null : cat.id)}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <div className="cat-overlay" />
                <div className="cat-body">
                  <span className="cat-icon">{cat.icon}</span>
                  {cat.titleLines ? (
                    <h3 className={cat.titleClass || undefined}>
                      {cat.titleLines.map((line) => (
                        <span key={line} className="cat-title-stack-line">{line}</span>
                      ))}
                    </h3>
                  ) : (
                    <h3 className={cat.titleClass || undefined}>{cat.title}</h3>
                  )}
                  <p className="cat-subtitle">{cat.subtitle}</p>
                  <span className="cat-cta-pill" style={{ background: cat.color, color: '#07050f' }}>
                    {isActive ? 'Chiudi ✕' : 'Scopri eventi →'}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* ── Filtered events for selected category ── */}
        {activeCat && (() => {
          const activeCatData = CATEGORY_CARDS.find((c) => c.id === activeCat)
          const catEvs = chronoSort(events.filter((e) => {
            if (!activeCatData) return false
            return activeCatData.filterType === 'badge'
              ? e.badge === activeCatData.filterValue
              : e.category === activeCatData.filterValue
          }))
          return catEvs.length > 0 ? (
            <motion.div
              className="cat-ev-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="cat-ev-row-label" style={{ color: activeCatData?.color }}>
                {activeCatData?.icon} {activeCatData?.title} — {catEvs.length} event{catEvs.length > 1 ? 'i' : 'o'}
              </p>
              <ScrollRowArrows>
                {catEvs.map((ev) => <EventCard key={ev.id} ev={ev} />)}
              </ScrollRowArrows>
            </motion.div>
          ) : (
            <motion.p
              className="cat-ev-empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              Nessun evento disponibile per questa categoria al momento. Torna presto 🎉
            </motion.p>
          )
        })()}
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
            <li>✅ Ingresso Beach Party incluso</li>
            <li>✅ Sconti e Convenzioni</li>
            <li>✅ Assistenza h24</li>
          </ul>
          <motion.a
            href="https://wa.me/393289466213?text=Ciao Gio! Voglio il mio Life Pass omaggio 🎟"
            target="_blank"
            rel="noreferrer"
            className="btn-lime lp-cta btn-social"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <IcoWA size={19} /> VOGLIO IL MIO LIFE PASS
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
            <ScrollRowArrows>
              {allVisible.slice(0, 4).map((ev) => <EventCard key={ev.id} ev={ev} />)}
            </ScrollRowArrows>
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
            <div className="hype-marquee-wrap">
              <div className="hype-marquee-track">
                {[...badgeEvents, ...badgeEvents].map((ev, i) => (
                  <EventCard key={`${ev.id}-${i}`} ev={ev} />
                ))}
              </div>
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
          <ScrollRowArrows>
            {soldOutEvents.slice(0, 4).map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </ScrollRowArrows>
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
              className="btn-lime pp-cta btn-social"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <IcoWA size={19} /> VOGLIO IL PROMO PACK
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
          <h2>Scrivimi prima<br />di partire.</h2>
          <p>Rispondo personalmente su WhatsApp, Instagram e TikTok. Nessun bot, solo io — prima che tu parta e ogni sera sull&apos;isola.</p>
          <div className="contact-buttons">
            <motion.a className="btn-lime btn-social" href="https://wa.me/393289466213" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}><IcoWA size={19} /> SCRIVIMI SU WHATSAPP</motion.a>
            <motion.a className="btn-dark btn-social" href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}><IcoIG size={19} /> INSTAGRAM</motion.a>
            <motion.a className="btn-dark btn-social" href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}><IcoTT size={19} /> TIKTOK</motion.a>
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
            <motion.a className="btn-lime btn-social" href="https://wa.me/393289466213" target="_blank" rel="noreferrer" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}><IcoWA size={19} /> CONTATTAMI</motion.a>
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
          <a href="https://wa.me/393289466213" target="_blank" rel="noreferrer" className="fsoc-wa">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.526 5.855L.057 23.882l6.188-1.438A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.032-1.386l-.36-.214-3.733.867.936-3.424-.235-.373A9.818 9.818 0 012.182 12c0-5.413 4.405-9.818 9.818-9.818 5.413 0 9.818 4.405 9.818 9.818 0 5.413-4.405 9.818-9.818 9.818z"/></svg>
            WhatsApp
          </a>
          <a href="https://www.instagram.com/partycongio?igsh=MW9xdXJvYXNjYzlvNQ==" target="_blank" rel="noreferrer" className="fsoc-ig">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            Instagram
          </a>
          <a href="https://www.tiktok.com/@giorgiacozzoli_?_r=1&_t=ZN-94vo8BV3mFy" target="_blank" rel="noreferrer" className="fsoc-tt">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
            TikTok
          </a>
        </div>
        <p className="footer-copy">© 2026 Party con Gio · Zante Edition · Tutti i diritti riservati</p>
      </footer>

      {/* ══ MOBILE BAR ═══════════════════════════════ */}
      <div className="mobile-bar">
        <button type="button" onClick={() => openModal('tutti')}>🎉 EVENTI</button>
        <a href="#gio">CHI SONO</a>
        <a href="#contatti">CONTATTAMI</a>
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
