// Badge config — usato in admin, landing e modal
export const BADGE_CONFIG = {
  'HYPE':        { icon: '🔥', label: 'Hype del Momento',   color: 'fuchsia' },
  'TOP PICK':    { icon: '💎', label: 'Top Selection',       color: 'violet'  },
  'CONSIGLIATO': { icon: '⭐', label: 'Consigliato da Gio',  color: 'lime'    },
  'PROMO':       { icon: '🎯', label: 'Promo',               color: 'default' },
  'SOLD OUT':    { icon: '🚫', label: 'Sold Out',            color: 'red'     },
}

export const BADGE_SECTIONS = [
  { badge: 'HYPE',        icon: '🔥', title: 'Hype del Momento',  dark: true  },
  { badge: 'TOP PICK',    icon: '💎', title: 'Top Selection',      dark: false },
  { badge: 'CONSIGLIATO', icon: '⭐', title: 'Consigliati da Gio', dark: false },
  { badge: 'PROMO',       icon: '🎯', title: 'In Promo',           dark: false },
]

export const siteConfig = {
  brand: 'PARTY con Gio',
  season: 'Zante Edition',
  claim: 'YES TICKET, ZERO STRESS!',
}

export const navLinks = [
  { key: 'events', label: 'Eventi 2026', action: 'events' },
  { key: 'soldout', label: 'Sold Out Alert', action: 'soldout' },
  { key: 'contact', label: 'Contattami', href: '#contatti' },
]

export const events = [
  {
    id: 'zante-beach-launch',
    title: 'Zante Beach Launch',
    date: '18 Giugno 2026',
    time: '15:00',
    badge: 'PROMO',
    left: 42,
    referral: 'https://getyourtickets.shop/event/zante-beach-launch',
  },
  {
    id: 'boat-party-sunset',
    title: 'Boat Party Sunset',
    date: '20 Giugno 2026',
    time: '17:30',
    badge: 'POSTI LIMITATI',
    left: 27,
    referral: 'https://getyourtickets.shop/event/boat-party-sunset',
  },
  {
    id: 'laganas-main-stage',
    title: 'Laganas Main Stage',
    date: '23 Giugno 2026',
    time: '23:30',
    badge: 'TOP PICK',
    left: 64,
    referral: 'https://getyourtickets.shop/event/laganas-main-stage',
  },
  {
    id: 'pool-vibe-session',
    title: 'Pool Vibe Session',
    date: '26 Giugno 2026',
    time: '14:00',
    badge: 'PROMO',
    left: 35,
    referral: 'https://getyourtickets.shop/event/pool-vibe-session',
  },
  {
    id: 'white-party-ocean',
    title: 'White Party Ocean',
    date: '29 Giugno 2026',
    time: '22:45',
    badge: 'POSTI LIMITATI',
    left: 19,
    referral: 'https://getyourtickets.shop/event/white-party-ocean',
  },
]

export const soldOutAlerts = [
  { title: 'Sunrise Boat Vibes', left: 11 },
  { title: 'Laganas Neon Night', left: 9 },
  { title: 'Pool Party Signature', left: 14 },
  { title: 'Night Temple Series', left: 8 },
  { title: 'Beach Ritual Closing', left: 12 },
]

export const benefits = [
  {
    title: 'Mai fuori dal party giusto',
    text: 'Ti faccio muovere in anticipo sulle date che esplodono prima, cosi non resti bloccato.',
  },
  {
    title: 'Ingresso lineare, zero caos',
    text: 'Hai il ticket giusto, le info chiare e arrivi pronto senza perdere tempo in coda o chat infinite.',
  },
  {
    title: 'Solo eventi che valgono davvero',
    text: 'Ti propongo una selezione curata, non una lista random: beach, boat e club con vibe reale.',
  },
  {
    title: 'Esperienza su misura per il tuo gruppo',
    text: 'Se siete tranquilli o super carichi, adatto il piano eventi al vostro stile e budget.',
  },
  {
    title: 'Contatto diretto con me',
    text: 'Ti seguo prima di partire e quando sei in isola: supporto vero, non assistenza impersonale.',
  },
  {
    title: 'Ticket ufficiali e prenotazione sicura',
    text: 'Ricevi tutto sul telefono con conferma immediata dai partner ufficiali, senza passaggi inutili.',
  },
]

export const faqs = [
  {
    question: 'Gli eventi sono sempre garantiti?',
    answer: 'Si, ma i posti sono limitati. Prenota in anticipo per assicurarti l accesso.',
  },
  {
    question: 'Posso prenotare per un gruppo?',
    answer: 'Certo. Puoi acquistare piu accessi in un unica soluzione e condividere i ticket.',
  },
  {
    question: 'Come ricevo i dettagli dell evento?',
    answer: 'Dopo l acquisto ricevi una mail con orari, location e indicazioni utili.',
  },
  {
    question: 'Come accedo all evento?',
    answer: 'Mostra il QR code del ticket e accedi subito senza attese.',
  },
]

export const partners = ['Lifeevents', 'Zante Partners', 'Travel Creator Hub', 'Laganas Club Network']

export function buildTrackedLink(url, campaign) {
  const tracked = new URL(url)
  tracked.searchParams.set('utm_source', 'partycongio')
  tracked.searchParams.set('utm_medium', 'referral')
  tracked.searchParams.set('utm_campaign', campaign)
  tracked.searchParams.set('utm_content', 'zante-edition')
  return tracked.toString()
}
