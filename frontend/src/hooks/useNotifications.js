import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/notifications')
      setNotifications(r.data.notifications || [])
      setUnreadCount(r.data.unreadCount || 0)
    } catch {
      // silently fail — user might not be logged in yet
    }
  }, [])

  useEffect(() => {
    load()
    // Poll a cada 30 segundos
    intervalRef.current = setInterval(load, 30000)
    return () => clearInterval(intervalRef.current)
  }, [load])

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(p => p.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      setUnreadCount(p => Math.max(0, p - 1))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(p => p.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
      setUnreadCount(0)
    } catch {}
  }

  const remove = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      const notif = notifications.find(n => n.id === id)
      setNotifications(p => p.filter(n => n.id !== id))
      if (notif && !notif.read_at) setUnreadCount(p => Math.max(0, p - 1))
    } catch {}
  }

  return { notifications, unreadCount, loading, load, markRead, markAllRead, remove }
}
