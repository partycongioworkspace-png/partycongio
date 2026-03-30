import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyBEeZ40mW1nuYag4nNRhMTcPSHMNydFKbg',
  authDomain: 'partycongio.firebaseapp.com',
  projectId: 'partycongio',
  storageBucket: 'partycongio.firebasestorage.app',
  messagingSenderId: '206439685748',
  appId: '1:206439685748:web:c6283c447e42bce1d2bb21',
  measurementId: 'G-LWGPSZ3E3E',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

export const CLOUDINARY_CLOUD = 'djb2nkpez'
export const CLOUDINARY_UPLOAD_PRESET = 'partycongio_events'   // unsigned preset da creare su Cloudinary

export function cloudinaryUrl(publicId, opts = 'w_600,h_400,c_fill,q_auto,f_auto') {
  if (!publicId) return null
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/${opts}/${publicId}`
}

/** Optimise any external image URL through Cloudinary Fetch */
export function cloudinaryFetch(externalUrl, opts = 'w_600,h_400,c_fill,q_auto,f_auto') {
  if (!externalUrl) return null
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/${opts}/${encodeURIComponent(externalUrl)}`
}

/**
 * Upload an external image URL directly to Cloudinary.
 * Requires an unsigned upload preset named CLOUDINARY_UPLOAD_PRESET.
 * Returns the public_id string on success, or null on failure.
 */
export async function uploadImageFromUrl(imageUrl, folder = 'events') {
  if (!imageUrl) return null
  try {
    const body = new FormData()
    body.append('file', imageUrl)
    body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    body.append('folder', folder)
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      { method: 'POST', body },
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.public_id || null
  } catch {
    return null
  }
}
