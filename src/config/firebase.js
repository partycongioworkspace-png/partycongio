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

export function cloudinaryUrl(publicId, opts = 'w_600,h_400,c_fill,q_auto,f_auto') {
  if (!publicId) return null
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/${opts}/${publicId}`
}
