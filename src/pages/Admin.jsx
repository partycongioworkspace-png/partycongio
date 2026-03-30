import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { auth, cloudinaryUrl, cloudinaryFetch, uploadImageFromUrl, db } from '../config/firebase'
import { useEvents, useMessages } from '../hooks/useEvents'
import './Admin.css'

const EMPTY_DATE = { date: '', time: '', referral: '', soldOut: false }

const EMPTY_EVENT = {
  title: '',
  dates: [{ ...EMPTY_DATE }],
  badge: 'HYPE',
  category: 'beach',
  description: '',
  imageId: '',
  imageUrl: '',
  soldOutRisk: false,
  drinkIncluso: false,
}

const MONTHS_EN_IT = {
  january: 'Gennaio', february: 'Febbraio', march: 'Marzo',
  april: 'Aprile', may: 'Maggio', june: 'Giugno',
  july: 'Luglio', august: 'Agosto', september: 'Settembre',
  october: 'Ottobre', november: 'Novembre', december: 'Dicembre',
}

// CORS proxy fallback chain — tries each until one works
const CORS_PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
]

async function fetchViaProxy(url, timeoutMs = 9000) {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(proxyFn(url), { signal: ctrl.signal })
      clearTimeout(tid)
      if (!res.ok) continue
      const text = await res.text()
      // Basic sanity check — real HTML pages are at least a few KB
      if (text && text.length > 300) return text
    } catch { /* try next proxy */ }
  }
  return null
}

/** Extract OG / meta tags from raw HTML as fallback for Microlink */
function extractMetaFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const get = (sel, attr = 'content') => doc.querySelector(sel)?.getAttribute(attr)?.trim() || ''
  return {
    title:       get('meta[property="og:title"]')       || get('meta[name="twitter:title"]')       || doc.title || '',
    description: get('meta[property="og:description"]') || get('meta[name="description"]')         || '',
    imageUrl:    get('meta[property="og:image"]')       || get('meta[name="twitter:image:src"]')   || '',
  }
}

/**
 * Extract event dates from raw HTML.
 * Strategy 1: JSON-LD schema.org (most precise)
 * Strategy 2: Regex on visible text (fallback for sites like getyourtickets.com)
 */
function extractDatesFromHtml(html, referralUrl) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const results = []

  // ── Strategy 1: JSON-LD ──────────────────────────
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const raw = JSON.parse(script.textContent)
      const entries = Array.isArray(raw) ? raw.flat() : [raw]
      entries.forEach((item) => {
        // Handle nested @graph arrays (common in many CMS platforms)
        const items = item['@graph'] ? item['@graph'] : [item]
        items.forEach((entry) => {
          const start = entry.startDate || entry.eventDate
          if (!start) return
          const d = new Date(start)
          if (isNaN(d)) return
          results.push({
            date: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
            time: d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            referral: referralUrl,
          })
        })
      })
    } catch { /* ignore malformed JSON-LD */ }
  })
  if (results.length > 0) return results

  // ── Strategy 2: text regex ───────────────────────
  // Works well for getyourtickets.com and similar sites where dates are
  // rendered server-side as visible text
  const bodyText = doc.body?.innerText || doc.body?.textContent || ''
  const monthKeys = Object.keys(MONTHS_EN_IT)
  const monthPattern = monthKeys.map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join('|')

  // Pattern: day number + month name, then within 150 chars a HH:MM time
  const re = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthPattern})(?:\\s+\\d{4})?[\\s\\S]{0,150}?\\b(\\d{2}:\\d{2})`,
    'gi'
  )

  const seen = new Set()
  const yearGuess = new Date().getFullYear() + (new Date().getMonth() >= 10 ? 1 : 0)
  let match
  while ((match = re.exec(bodyText)) !== null && results.length < 20) {
    const day   = match[1]
    const month = match[2]
    const time  = match[3]
    // Skip obviously wrong times like 00:00 appearing in copyright / footer
    if (time === '00:00') continue
    const key = `${day}-${month.toLowerCase()}-${time}`
    if (seen.has(key)) continue
    seen.add(key)
    const monthIt = MONTHS_EN_IT[month.toLowerCase()] || month
    results.push({
      date:     `${day} ${monthIt} ${yearGuess}`,
      time,
      referral: referralUrl,
    })
  }
  return results
}

function formatTs(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Admin() {
  const navigate = useNavigate()
  const { events, loading: evLoading, error: evError } = useEvents()
  const { messages, loading: msgLoading } = useMessages()

  const formBoxRef = useRef(null)

  const [tab, setTab] = useState('events')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_EVENT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [imgPreview, setImgPreview] = useState(null)
  const [importUrl, setImportUrl] = useState('')
  const [importState, setImportState] = useState('idle') // idle | loading | success | partial | error
  const [importDatesCount, setImportDatesCount] = useState(0)

  useEffect(() => {
    if (form.imageId) {
      setImgPreview(cloudinaryUrl(form.imageId))
    } else if (form.imageUrl) {
      setImgPreview(form.imageUrl)
    } else {
      setImgPreview(null)
    }
  }, [form.imageId, form.imageUrl])

  // Scroll to the top of the form box when it opens so the import section is always visible
  useEffect(() => {
    if (showForm && formBoxRef.current) {
      setTimeout(() => {
        formBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [showForm])

  async function handleImport() {
    const url = importUrl.trim()
    if (!url) return
    setImportState('loading')
    try {
      // ── Step 1: fetch raw HTML via proxy chain + Microlink in parallel ──
      const [mlRes, rawHtml] = await Promise.all([
        fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
          .then((r) => r.json())
          .catch(() => null),
        fetchViaProxy(url),
      ])

      // ── Step 2: metadata — Microlink first, then OG tags from HTML ──────
      let meta = { title: '', description: '', imageUrl: '' }

      if (mlRes?.status === 'success') {
        const d = mlRes.data
        meta.title       = d.title       || ''
        meta.description = d.description || ''
        meta.imageUrl    = d.image?.url  || ''
      }

      // If Microlink didn't deliver, extract directly from HTML OG tags
      if (rawHtml && (!meta.title || !meta.imageUrl)) {
        const fromHtml = extractMetaFromHtml(rawHtml)
        if (!meta.title)    meta.title       = fromHtml.title
        if (!meta.description) meta.description = fromHtml.description
        if (!meta.imageUrl) meta.imageUrl    = fromHtml.imageUrl
      }

      // ── Step 3: dates from raw HTML ──────────────────────────────────────
      const parsedDates = rawHtml ? extractDatesFromHtml(rawHtml, url) : []

      // ── Step 4: upload image to Cloudinary (async, non-blocking) ─────────
      let cloudinaryPublicId = null
      if (meta.imageUrl) {
        setImportState('uploading')
        cloudinaryPublicId = await uploadImageFromUrl(meta.imageUrl)
      }

      setForm((prev) => ({
        ...prev,
        ...(meta.title       ? { title:       meta.title }       : {}),
        ...(meta.description ? { description: meta.description } : {}),
        // prefer Cloudinary public_id if upload succeeded, else fallback to external URL
        ...(cloudinaryPublicId
          ? { imageId: cloudinaryPublicId, imageUrl: '' }
          : meta.imageUrl
          ? { imageUrl: meta.imageUrl, imageId: '' }
          : {}),
        dates: parsedDates.length > 0
          ? parsedDates
          : prev.dates.map((d, i) => i === 0 ? { ...d, referral: url } : d),
      }))
      setImportDatesCount(parsedDates.length)

      const hasContent = meta.title || parsedDates.length > 0
      setImportState(hasContent ? 'success' : 'partial')
    } catch {
      setImportState('error')
    }
  }

  async function handleLogout() {
    await signOut(auth)
    navigate('/admin/login')
  }

  function openNew() {
    setForm(EMPTY_EVENT)
    setEditingId(null)
    setFormError('')
    setImportUrl('')
    setImportState('idle')
    setImportDatesCount(0)
    setShowForm(true)
  }

  function openEdit(ev) {
    setForm({
      title: ev.title || '',
      dates: Array.isArray(ev.dates) && ev.dates.length > 0
        ? ev.dates
        : [{ ...EMPTY_DATE }],
      badge: ev.badge || 'PROMO',
      category: ev.category || 'beach',
      description: ev.description || '',
      imageId: ev.imageId || '',
      imageUrl: ev.imageUrl || '',
      soldOutRisk: ev.soldOutRisk || false,
      drinkIncluso: ev.drinkIncluso || false,
    })
    setEditingId(ev.id)
    setFormError('')
    setImportUrl('')
    setImportState('idle')
    setImportDatesCount(0)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_EVENT)
    setFormError('')
    setImportUrl('')
    setImportState('idle')
    setImportDatesCount(0)
  }

  function updateDate(idx, field, value) {
    const updated = form.dates.map((d, i) => i === idx ? { ...d, [field]: value } : d)
    setForm({ ...form, dates: updated })
  }

  function addDate() {
    setForm({ ...form, dates: [...form.dates, { ...EMPTY_DATE }] })
  }

  function removeDate(idx) {
    if (form.dates.length === 1) return
    setForm({ ...form, dates: form.dates.filter((_, i) => i !== idx) })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim()) { setFormError('Il titolo è obbligatorio.'); return }
    if (!form.dates[0]?.date.trim()) { setFormError('Aggiungi almeno una data.'); return }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        dates: form.dates.filter((d) => d.date.trim()),
        badge: form.badge,
        category: form.category,
        description: form.description.trim(),
        imageId: form.imageId.trim(),
        imageUrl: form.imageUrl?.trim() || '',
        soldOutRisk: form.soldOutRisk,
        drinkIncluso: form.drinkIncluso || false,
        updatedAt: serverTimestamp(),
      }
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), payload)
      } else {
        await addDoc(collection(db, 'events'), { ...payload, createdAt: serverTimestamp() })
      }
      cancelForm()
    } catch (err) {
      const msg = err?.code === 'permission-denied'
        ? '⛔ Permesso negato. Aggiorna le regole Firestore (vedi nota in basso).'
        : `Errore: ${err?.message || 'Riprova.'}`
      setFormError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Eliminare questo evento?')) return
    try {
      await deleteDoc(doc(db, 'events', id))
    } catch (err) {
      alert(`Errore eliminazione: ${err?.message}`)
    }
  }

  const firestoreRulesError = evError?.code === 'permission-denied'

  return (
    <div className="adm-wrap">
      <header className="adm-header">
        <img
          src="https://res.cloudinary.com/djb2nkpez/image/upload/w_120,h_40,c_fit,f_auto,q_auto/1-removebg-preview_fddema"
          alt="Party con Gio"
          className="adm-logo"
        />
        <div className="adm-header-right">
          <span className="adm-admin-label">Admin Panel</span>
          <button type="button" className="adm-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="adm-tabs">
        <button type="button" className={`adm-tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
          🎉 Eventi ({events.length})
        </button>
        <button type="button" className={`adm-tab ${tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('messages')}>
          💬 Messaggi ({messages.length})
        </button>
      </div>

      <div className="adm-body">

        {/* Firestore rules warning */}
        {firestoreRulesError && (
          <div className="adm-rules-warning">
            <strong>⛔ Firestore Security Rules bloccano le letture.</strong>
            <p>Vai su <a href="https://console.firebase.google.com/project/partycongio/firestore/rules" target="_blank" rel="noreferrer">Firebase Console → Firestore → Rules</a> e incolla queste regole:</p>
            <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /contacts/{id} {
      allow create: if true;
      allow read: if request.auth != null;
    }
  }
}`}</pre>
          </div>
        )}

        {/* ── EVENTI ── */}
        {tab === 'events' && (
          <>
            <div className="adm-actions">
              <button type="button" className="adm-add-btn" onClick={showForm ? cancelForm : openNew}>
                {showForm ? '✕ Annulla' : '+ Aggiungi Evento'}
              </button>
            </div>

            {showForm && (
              <div className="adm-form-box" ref={formBoxRef}>
                <h2>{editingId ? '✏️ Modifica Evento' : '✨ Nuovo Evento'}</h2>
                {formError && <p className="adm-form-error">{formError}</p>}
                <form onSubmit={handleSubmit} className="adm-form">

                  {/* ── IMPORT FROM URL ── */}
                  <div className="adm-import-box">
                    <label className="adm-import-label">
                      ⚡ Importa automaticamente <span>— incolla il link della biglietteria e compilo io titolo, foto e date</span>
                    </label>
                    <div className="adm-import-row">
                      <input
                        type="url"
                        className="adm-import-input"
                        value={importUrl}
                        onChange={(e) => { setImportUrl(e.target.value); setImportState('idle') }}
                        placeholder="https://dice.fm/event/… oppure https://www.ticketone.it/…"
                      />
                      <button
                        type="button"
                        className="adm-import-btn"
                        onClick={handleImport}
                        disabled={importState === 'loading' || importState === 'uploading'}
                      >
                        {importState === 'loading'   ? '⏳ Leggo pagina…'
                         : importState === 'uploading' ? '☁️ Carico su Cloudinary…'
                         : '🔗 Importa'}
                      </button>
                    </div>
                    {importState === 'success' && (
                      <p className="adm-import-ok">
                        ✅ Importato!
                        {form.imageId ? ' 🖼️ Foto salvata su Cloudinary.' : form.imageUrl ? ' 🖼️ Foto da URL esterno (upload Cloudinary non riuscito).' : ''}
                        {importDatesCount > 0
                          ? ` ${importDatesCount} data${importDatesCount > 1 ? ' trovate' : ' trovata'} in automatico. Controlla e completa badge / categoria.`
                          : ' Aggiungi le date manualmente.'}
                      </p>
                    )}
                    {importState === 'partial' && (
                      <p className="adm-import-err">⚠️ Pagina letta ma pochi dati. Controlla e compila a mano.</p>
                    )}
                    {importState === 'error' && (
                      <p className="adm-import-err">⚠️ Non riesco a leggere questa pagina. Compila i campi a mano.</p>
                    )}
                  </div>

                  {/* Titolo + Badge */}
                  <div className="adm-form-row">
                    <div className="adm-field">
                      <label>Titolo *</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="es. Laganas Main Stage"
                        required
                      />
                    </div>
                    <div className="adm-field">
                      <label>Badge</label>
                      <select value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}>
                        <option value="HYPE">🔥 HYPE — Tendenza del momento</option>
                        <option value="TOP PICK">💎 TOP PICK — Il più scelto</option>
                        <option value="CONSIGLIATO">⭐ CONSIGLIATO — Consigliato da Gio</option>
                        <option value="PROMO">🎯 PROMO — Offerta speciale</option>
                        <option value="SPECIAL GUEST">🎤 SPECIAL GUEST — Artista ospite</option>
                        <option value="SOLD OUT">🚫 SOLD OUT — Esaurito</option>
                      </select>
                    </div>
                  </div>

                  {/* Categoria */}
                  <div className="adm-form-row">
                    <div className="adm-field">
                      <label>Categoria</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        <option value="beach">🏖️ Beach Party</option>
                        <option value="boat">⛵ Boat Party</option>
                        <option value="night">🌙 Night Club</option>
                        <option value="pool">💦 Pool Party</option>
                      </select>
                    </div>
                    <div className="adm-field">
                      <label>
                        Immagine
                        <span className="adm-field-hint"> — URL importata automaticamente, oppure Cloudinary Public ID</span>
                      </label>
                      {form.imageUrl && !form.imageId ? (
                        <div className="adm-img-url-wrap">
                          <input
                            type="text"
                            value={form.imageUrl}
                            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                            placeholder="URL immagine (auto-importata)"
                          />
                          <button
                            type="button"
                            className="adm-img-clear"
                            onClick={() => setForm({ ...form, imageUrl: '' })}
                            title="Rimuovi e usa Cloudinary ID"
                          >✕</button>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={form.imageId}
                          onChange={(e) => setForm({ ...form, imageId: e.target.value })}
                          placeholder="es. events/laganas-main-stage (Cloudinary Public ID)"
                        />
                      )}
                    </div>
                  </div>

                  {imgPreview && (
                    <img src={imgPreview} alt="preview" className="adm-img-preview" />
                  )}

                  {/* Descrizione */}
                  <div className="adm-field">
                    <label>Descrizione</label>
                    <textarea
                      rows="3"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Breve descrizione dell'evento..."
                    />
                  </div>

                  {/* ── DATE MULTIPLE ── */}
                  <div className="adm-dates-section">
                    <div className="adm-dates-header">
                      <label className="adm-dates-label">📅 Date evento *</label>
                      <button type="button" className="adm-add-date-btn" onClick={addDate}>
                        + Aggiungi data
                      </button>
                    </div>

                    {form.dates.map((d, i) => (
                      <div key={i} className="adm-date-row">
                        <span className="adm-date-num">{i + 1}</span>
                        <div className="adm-date-fields">
                          <input
                            type="text"
                            value={d.date}
                            onChange={(e) => updateDate(i, 'date', e.target.value)}
                            placeholder="es. 18 Giugno 2026"
                            required={i === 0}
                          />
                          <input
                            type="text"
                            value={d.time}
                            onChange={(e) => updateDate(i, 'time', e.target.value)}
                            placeholder="es. 23:00"
                            className="adm-date-time"
                          />
                          <input
                            type="text"
                            value={d.referral}
                            onChange={(e) => updateDate(i, 'referral', e.target.value)}
                            placeholder="https://biglietteria.it/evento"
                            className="adm-date-link"
                          />
                          <label className="adm-date-soldout">
                            <input
                              type="checkbox"
                              checked={!!d.soldOut}
                              onChange={(e) => updateDate(i, 'soldOut', e.target.checked)}
                            />
                            <span>Sold Out</span>
                          </label>
                        </div>
                        {form.dates.length > 1 && (
                          <button type="button" className="adm-remove-date" onClick={() => removeDate(i)} aria-label="Rimuovi data">
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Sold Out Risk */}
                  <div className="adm-field adm-checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.soldOutRisk}
                        onChange={(e) => setForm({ ...form, soldOutRisk: e.target.checked })}
                      />
                      🔥 Segnala come Sold Out Risk (appare nella sezione alert)
                    </label>
                  </div>

                  <div className="adm-field adm-checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.drinkIncluso || false}
                        onChange={(e) => setForm({ ...form, drinkIncluso: e.target.checked })}
                      />
                      🍹 Drink incluso (appare come badge sulla card)
                    </label>
                  </div>

                  <div className="adm-form-actions">
                    <button type="submit" className="adm-save-btn" disabled={saving}>
                      {saving ? 'Salvataggio…' : (editingId ? '✓ Salva modifiche' : '✨ Crea evento')}
                    </button>
                    <button type="button" className="adm-cancel-btn" onClick={cancelForm}>
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="adm-events-list">
              <h2>Tutti gli eventi ({events.length})</h2>
              {evLoading ? (
                <p className="adm-loading">Caricamento…</p>
              ) : events.length === 0 && !firestoreRulesError ? (
                <p className="adm-empty">Nessun evento. Crea il primo!</p>
              ) : (
                <div className="adm-events-grid">
                  {events.map((ev) => (
                      <div key={ev.id} className={`adm-ev-card ${ev.soldOutRisk ? 'risk' : ''}`}>
                        {ev.imageId && (
                          <div className="adm-ev-img">
                            <img src={cloudinaryUrl(ev.imageId)} alt={ev.title} />
                          </div>
                        )}
                        <div className="adm-ev-body">
                          <div className="adm-ev-badges">
                            <span className="adm-badge">{ev.badge}</span>
                            <span className="adm-badge adm-badge-cat">{ev.category}</span>
                            {ev.soldOutRisk && <span className="adm-badge adm-badge-risk">🔥 Sold Out Risk</span>}
                          </div>
                          <h3>{ev.title}</h3>

                          {/* Date multiple */}
                          {Array.isArray(ev.dates) && ev.dates.length > 0 && (
                            <div className="adm-ev-dates">
                              {ev.dates.map((d, i) => (
                                <div key={i} className="adm-ev-date-item">
                                  <span>📅 {d.date}{d.time ? ` · ${d.time}` : ''}</span>
                                  {d.referral && (
                                    <a href={d.referral} target="_blank" rel="noreferrer" className="adm-ev-link">
                                      Biglietti →
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {ev.description && <p className="adm-ev-desc">{ev.description}</p>}

                          <div className="adm-ev-actions">
                            <button type="button" className="adm-edit-btn" onClick={() => openEdit(ev)}>✏️ Modifica</button>
                            <button type="button" className="adm-delete-btn" onClick={() => handleDelete(ev.id)}>🗑 Elimina</button>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── MESSAGGI ── */}
        {tab === 'messages' && (
          <div className="adm-messages">
            <h2>Messaggi ricevuti ({messages.length})</h2>
            {msgLoading ? (
              <p className="adm-loading">Caricamento…</p>
            ) : messages.length === 0 ? (
              <p className="adm-empty">Nessun messaggio ancora.</p>
            ) : (
              <div className="adm-msg-list">
                {messages.map((msg) => (
                  <div key={msg.id} className="adm-msg-card">
                    <div className="adm-msg-meta">
                      <strong>{msg.name || '—'}</strong>
                      {msg.email && <span>✉️ {msg.email}</span>}
                      {msg.phone && <span>📱 {msg.phone}</span>}
                      <span className="adm-msg-date">{formatTs(msg.createdAt)}</span>
                    </div>
                    <p className="adm-msg-body">{msg.message || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin
