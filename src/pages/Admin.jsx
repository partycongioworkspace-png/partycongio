import { useEffect, useState } from 'react'
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
import { auth, cloudinaryUrl, db } from '../config/firebase'
import { useEvents, useMessages } from '../hooks/useEvents'
import './Admin.css'

const EMPTY_DATE = { date: '', time: '', referral: '' }

const EMPTY_EVENT = {
  title: '',
  dates: [{ ...EMPTY_DATE }],
  badge: 'HYPE',
  category: 'beach',
  description: '',
  imageId: '',
  soldOutRisk: false,
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

  const [tab, setTab] = useState('events')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_EVENT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [imgPreview, setImgPreview] = useState(null)

  useEffect(() => {
    setImgPreview(form.imageId ? cloudinaryUrl(form.imageId) : null)
  }, [form.imageId])

  async function handleLogout() {
    await signOut(auth)
    navigate('/admin/login')
  }

  function openNew() {
    setForm(EMPTY_EVENT)
    setEditingId(null)
    setFormError('')
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
      soldOutRisk: ev.soldOutRisk || false,
    })
    setEditingId(ev.id)
    setFormError('')
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_EVENT)
    setFormError('')
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
        soldOutRisk: form.soldOutRisk,
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
              <div className="adm-form-box">
                <h2>{editingId ? '✏️ Modifica Evento' : '✨ Nuovo Evento'}</h2>
                {formError && <p className="adm-form-error">{formError}</p>}
                <form onSubmit={handleSubmit} className="adm-form">

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
                      <label>Immagine (Cloudinary Public ID)</label>
                      <input
                        type="text"
                        value={form.imageId}
                        onChange={(e) => setForm({ ...form, imageId: e.target.value })}
                        placeholder="es. events/laganas-main-stage"
                      />
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
                            type="url"
                            value={d.referral}
                            onChange={(e) => updateDate(i, 'referral', e.target.value)}
                            placeholder="https://biglietteria.it/evento"
                            className="adm-date-link"
                          />
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
