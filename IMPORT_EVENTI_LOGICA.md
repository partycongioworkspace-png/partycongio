# Logica Import Automatico Eventi da URL — Admin Panel

Questo documento spiega tutta la logica implementata per importare automaticamente
le informazioni di un evento (titolo, descrizione, immagine, date) da un link di
biglietteria, senza dipendenze a pagamento o backend dedicato.

---

## Panoramica del flusso

```
Utente incolla URL (es. getyourtickets.com/event/...)
        │
        ▼
  ┌─────────────────────────────────────────┐
  │  Microlink API          fetchViaProxy   │
  │  (metadati OG)          (HTML grezzo)   │
  │        │                    │           │
  │        ▼                    ▼           │
  │  title, desc,         extractMeta +    │
  │  imageUrl             extractDates     │
  └─────────────────────────────────────────┘
        │
        ▼
  Popola il form: titolo, descrizione, immagine, date
```

---

## 1. Cloudinary Fetch helper (`firebase.js` o config)

Permette di ottimizzare qualsiasi URL esterno tramite Cloudinary senza upload manuale.

```js
export const CLOUDINARY_CLOUD = 'TUO_CLOUD_NAME'

/** Immagine da Cloudinary Public ID (upload manuale) */
export function cloudinaryUrl(publicId, opts = 'w_600,h_400,c_fill,q_auto,f_auto') {
  if (!publicId) return null
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/${opts}/${publicId}`
}

/** Immagine da URL esterno ottimizzata tramite Cloudinary Fetch */
export function cloudinaryFetch(externalUrl, opts = 'w_600,h_400,c_fill,q_auto,f_auto') {
  if (!externalUrl) return null
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/${opts}/${encodeURIComponent(externalUrl)}`
}
```

### Come usare nelle card/pagine evento

```jsx
import { cloudinaryUrl, cloudinaryFetch } from '../config/firebase'

// Nelle card evento e nelle pagine dettaglio:
{ev.imageId
  ? <img src={cloudinaryUrl(ev.imageId, 'w_460,h_320,c_fill,q_auto,f_auto')} alt={ev.title} />
  : ev.imageUrl
    ? <img src={cloudinaryFetch(ev.imageUrl, 'w_460,h_320,c_fill,q_auto,f_auto')} alt={ev.title} />
    : <div className="placeholder" />
}
```

---

## 2. Struttura dati evento

L'evento in Firestore deve supportare sia `imageId` (Cloudinary pubblico) che `imageUrl`
(URL esterno). Le date sono un array con data, ora e link biglietti per ogni occorrenza.

```js
// Struttura vuota (usata per il form)
const EMPTY_DATE = { date: '', time: '', referral: '' }

const EMPTY_EVENT = {
  title: '',
  dates: [{ ...EMPTY_DATE }],   // array di date
  badge: 'HYPE',                 // es. HYPE | TOP PICK | CONSIGLIATO | PROMO | SOLD OUT
  category: 'beach',             // es. beach | boat | night | pool
  description: '',
  imageId: '',                   // Cloudinary Public ID (upload manuale)
  imageUrl: '',                  // URL esterno (auto-importato)
  soldOutRisk: false,
}
```

---

## 3. Proxy CORS con fallback automatico

Il browser non può fare fetch diretti su siti esterni (CORS). Questa funzione
prova 3 proxy pubblici gratuiti in sequenza con timeout per ciascuno.

```js
// Lista proxy in ordine di tentativo
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
      // Sanity check: HTML reale è almeno qualche centinaio di byte
      if (text && text.length > 300) return text
    } catch { /* prova il prossimo */ }
  }
  return null  // tutti i proxy hanno fallito
}
```

---

## 4. Estrazione metadati dall'HTML (fallback a Microlink)

Se Microlink non risponde o non ha i dati, si legge direttamente dall'HTML
tramite OG tags e meta tag standard.

```js
function extractMetaFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const get = (sel, attr = 'content') =>
    doc.querySelector(sel)?.getAttribute(attr)?.trim() || ''

  return {
    title:
      get('meta[property="og:title"]') ||
      get('meta[name="twitter:title"]') ||
      doc.title || '',
    description:
      get('meta[property="og:description"]') ||
      get('meta[name="description"]') || '',
    imageUrl:
      get('meta[property="og:image"]') ||
      get('meta[name="twitter:image:src"]') || '',
  }
}
```

---

## 5. Estrazione date dall'HTML

Usa due strategie in sequenza. Se la prima trova risultati, non esegue la seconda.

### Strategia 1 — JSON-LD schema.org (più precisa)

Molti siti di biglietteria moderni inseriscono dati strutturati come script JSON-LD.
Questa strategia è la più affidabile quando presente.

```js
// Mappa mesi inglesi → italiano (adatta alla tua lingua)
const MONTHS_EN_IT = {
  january: 'Gennaio', february: 'Febbraio', march: 'Marzo',
  april: 'Aprile', may: 'Maggio', june: 'Giugno',
  july: 'Luglio', august: 'Agosto', september: 'Settembre',
  october: 'Ottobre', november: 'Novembre', december: 'Dicembre',
}

function extractDatesFromHtml(html, referralUrl) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const results = []

  // ── Strategia 1: JSON-LD ──────────────────────────────────────────────────
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const raw = JSON.parse(script.textContent)
      const entries = Array.isArray(raw) ? raw.flat() : [raw]
      entries.forEach((item) => {
        // Alcuni CMS usano @graph (array annidato)
        const items = item['@graph'] ? item['@graph'] : [item]
        items.forEach((entry) => {
          const start = entry.startDate || entry.eventDate
          if (!start) return
          const d = new Date(start)
          if (isNaN(d)) return
          results.push({
            date: d.toLocaleDateString('it-IT', {
              day: 'numeric', month: 'long', year: 'numeric',
            }),
            time: d.toLocaleTimeString('it-IT', {
              hour: '2-digit', minute: '2-digit',
            }),
            referral: referralUrl,
          })
        })
      })
    } catch { /* JSON-LD malformato, ignora */ }
  })

  // Se trovate date con JSON-LD, restituisci subito
  if (results.length > 0) return results

  // ── Strategia 2: regex sul testo visibile ────────────────────────────────
  // Funziona bene con getyourtickets.com e siti simili con rendering server-side
  const bodyText = doc.body?.innerText || doc.body?.textContent || ''
  const monthPattern = Object.keys(MONTHS_EN_IT)
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join('|')

  // Cerca: numero giorno + nome mese, poi entro 150 caratteri un orario HH:MM
  const re = new RegExp(
    `\\b(\\d{1,2})\\s+(${monthPattern})(?:\\s+\\d{4})?[\\s\\S]{0,150}?\\b(\\d{2}:\\d{2})`,
    'gi'
  )

  const seen = new Set()
  // Anno: anno corrente, o prossimo se siamo a novembre/dicembre
  const yearGuess =
    new Date().getFullYear() + (new Date().getMonth() >= 10 ? 1 : 0)

  let match
  while ((match = re.exec(bodyText)) !== null && results.length < 20) {
    const day   = match[1]
    const month = match[2]
    const time  = match[3]
    // Salta "00:00" che spesso compare in footer/copyright
    if (time === '00:00') continue
    const key = `${day}-${month.toLowerCase()}-${time}`
    if (seen.has(key)) continue
    seen.add(key)
    const monthIt = MONTHS_EN_IT[month.toLowerCase()] || month
    results.push({
      date: `${day} ${monthIt} ${yearGuess}`,
      time,
      referral: referralUrl,
    })
  }

  return results
}
```

---

## 6. Funzione principale `handleImport` (dentro il componente Admin)

```js
// State necessario nel componente
const [importUrl, setImportUrl] = useState('')
const [importState, setImportState] = useState('idle') // idle | loading | success | partial | error
const [importDatesCount, setImportDatesCount] = useState(0)

async function handleImport() {
  const url = importUrl.trim()
  if (!url) return
  setImportState('loading')
  try {
    // Step 1: Microlink per i metadati + proxy per l'HTML, in parallelo
    const [mlRes, rawHtml] = await Promise.all([
      fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
        .then((r) => r.json())
        .catch(() => null),
      fetchViaProxy(url),
    ])

    // Step 2: metadati — Microlink prima, poi OG tags dall'HTML come fallback
    let meta = { title: '', description: '', imageUrl: '' }

    if (mlRes?.status === 'success') {
      const d = mlRes.data
      meta.title       = d.title       || ''
      meta.description = d.description || ''
      meta.imageUrl    = d.image?.url  || ''
    }

    // Se Microlink non ha restituito tutto, integra dall'HTML
    if (rawHtml && (!meta.title || !meta.imageUrl)) {
      const fromHtml = extractMetaFromHtml(rawHtml)
      if (!meta.title)       meta.title       = fromHtml.title
      if (!meta.description) meta.description = fromHtml.description
      if (!meta.imageUrl)    meta.imageUrl    = fromHtml.imageUrl
    }

    // Step 3: date dall'HTML
    const parsedDates = rawHtml ? extractDatesFromHtml(rawHtml, url) : []

    // Step 4: aggiorna il form
    setForm((prev) => ({
      ...prev,
      ...(meta.title       ? { title:       meta.title }       : {}),
      ...(meta.description ? { description: meta.description } : {}),
      ...(meta.imageUrl    ? { imageUrl:    meta.imageUrl }    : {}),
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
```

---

## 7. UI del box import (JSX)

Va inserito come **prima cosa** dentro il `<form>` del pannello admin,
prima di tutti gli altri campi.

```jsx
{/* ── IMPORT FROM URL ── */}
<div className="adm-import-box">
  <label className="adm-import-label">
    ⚡ Importa automaticamente{' '}
    <span>— incolla il link della biglietteria e compilo io titolo, foto e date</span>
  </label>
  <div className="adm-import-row">
    <input
      type="url"
      className="adm-import-input"
      value={importUrl}
      onChange={(e) => { setImportUrl(e.target.value); setImportState('idle') }}
      placeholder="https://www.getyourtickets.com/event/... oppure altro link"
    />
    <button
      type="button"
      className="adm-import-btn"
      onClick={handleImport}
      disabled={importState === 'loading'}
    >
      {importState === 'loading' ? '⏳ Importo…' : '🔗 Importa'}
    </button>
  </div>

  {importState === 'success' && (
    <p className="adm-import-ok">
      ✅ Importato!
      {importDatesCount > 0
        ? ` ${importDatesCount} data${importDatesCount > 1 ? ' trovate' : ' trovata'} in automatico. Controlla e completa badge / categoria.`
        : ' Titolo, descrizione e immagine pronti. Aggiungi tu le date.'}
    </p>
  )}
  {importState === 'partial' && (
    <p className="adm-import-err">⚠️ Pagina letta ma pochi dati. Controlla e compila a mano.</p>
  )}
  {importState === 'error' && (
    <p className="adm-import-err">⚠️ Non riesco a leggere questa pagina. Compila i campi a mano.</p>
  )}
</div>
```

---

## 8. Stili CSS del box import

```css
@keyframes adm-import-appear {
  0%   { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 1; transform: translateY(0); }
}

.adm-import-box {
  background: rgba(163, 230, 53, 0.07);
  border: 1.5px solid rgba(163, 230, 53, 0.38);
  border-radius: 14px;
  padding: 1.25rem 1.4rem;
  margin-bottom: 1.5rem;
  animation: adm-import-appear 0.35s ease both;
  scroll-margin-top: 1rem;
}
.adm-import-label {
  display: block;
  font-size: 0.88rem;
  font-weight: 700;
  color: #a3e635; /* lime / accent color */
  margin-bottom: 0.75rem;
  letter-spacing: 0.01em;
}
.adm-import-label span {
  font-weight: 400;
  color: #6b638f; /* muted */
  font-size: 0.82rem;
}
.adm-import-row {
  display: flex;
  gap: 0.65rem;
}
.adm-import-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(163, 230, 53, 0.28);
  border-radius: 10px;
  color: #f0ecff;
  font-size: 0.88rem;
  padding: 0.65rem 1rem;
  outline: none;
  transition: border-color 0.2s;
}
.adm-import-input:focus { border-color: #a3e635; }
.adm-import-input::placeholder { color: #6b638f; font-size: 0.82rem; }
.adm-import-btn {
  background: #a3e635;
  color: #07050f;
  border: none;
  border-radius: 10px;
  font-weight: 800;
  font-size: 0.85rem;
  padding: 0.65rem 1.3rem;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.15s;
}
.adm-import-btn:hover  { opacity: 0.88; }
.adm-import-btn:active { transform: scale(0.96); }
.adm-import-btn:disabled { opacity: 0.5; cursor: wait; }
.adm-import-ok  { margin: 0.65rem 0 0; font-size: 0.82rem; color: #a3e635; font-weight: 600; }
.adm-import-err { margin: 0.65rem 0 0; font-size: 0.82rem; color: #fb923c; font-weight: 600; }

/* mobile */
@media (max-width: 700px) {
  .adm-import-row { flex-direction: column; }
  .adm-import-btn { width: 100%; }
}
```

---

## 9. Scroll automatico all'apertura del form

Aggiunge un ref al form box e scrolla automaticamente quando si apre,
così l'utente vede sempre il box di import in cima senza doversi scorrere.

```js
// Nel componente Admin:
const formBoxRef = useRef(null)

// useEffect che scrolla quando showForm diventa true
useEffect(() => {
  if (showForm && formBoxRef.current) {
    setTimeout(() => {
      formBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }
}, [showForm])

// Nel JSX, aggiungi ref al div del form:
// <div className="adm-form-box" ref={formBoxRef}>
```

---

## 10. Gestione `imageUrl` nel salvataggio Firestore

Nel payload di salvataggio (sia create che update) includere `imageUrl`:

```js
const payload = {
  title:       form.title.trim(),
  dates:       form.dates.filter((d) => d.date.trim()),
  badge:       form.badge,
  category:    form.category,
  description: form.description.trim(),
  imageId:     form.imageId.trim(),    // Cloudinary Public ID (manuale)
  imageUrl:    form.imageUrl?.trim() || '', // URL esterno (auto-importato)
  soldOutRisk: form.soldOutRisk,
  updatedAt:   serverTimestamp(),
}
```

---

## 11. Campo immagine nel form — mostra URL o ID

```jsx
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
      placeholder="es. events/nome-evento (Cloudinary Public ID)"
    />
  )}
</div>
```

---

## 12. Fix 404 su `/admin` dopo il deploy (SPA routing)

### Netlify → `public/_redirects`
```
/* /index.html 200
```

### Vercel → `vercel.json` (nella root del progetto)
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Riassunto: cosa viene importato automaticamente

| Campo | Fonte | Affidabilità |
|---|---|---|
| Titolo | Microlink → OG tag HTML | ✅ Alta |
| Descrizione | Microlink → meta description | ✅ Alta |
| Immagine copertina | Microlink → OG image | ✅ Alta |
| Date singola | JSON-LD schema.org | ✅ Alta (se presente) |
| Date multiple | Regex testo visibile | ✅ Buona (per getyourtickets.com e simili) |
| Link biglietti | URL incollato dall'utente | ✅ Sempre |

## Cosa aggiunge l'utente manualmente

- Badge (HYPE / TOP PICK / CONSIGLIATO / PROMO / SOLD OUT)
- Categoria (beach / boat / night / pool)
- Orario se non trovato automaticamente
- Spunta "Sold Out Risk"
