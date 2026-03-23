import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../config/firebase'

export function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setEvents(data)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Firestore events error:', err)
        setError(err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return { events, loading, error }
}

export function useMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setMessages(data)
        setLoading(false)
      },
      (err) => {
        console.error('Firestore contacts error:', err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  return { messages, loading }
}
