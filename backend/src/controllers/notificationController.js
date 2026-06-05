import { query, queryOne } from '../database/connection.js'

// ── Criar notificação (uso interno) ──────────────────────────────
export async function createNotification({ userId, type, title, message, bookingId = null }) {
  try {
    await query(
      'INSERT INTO notifications (user_id, type, title, message, booking_id) VALUES (?,?,?,?,?)',
      [userId, type, title, message, bookingId]
    )
  } catch (e) {
    console.error('Erro ao criar notificação:', e.message)
  }
}

// ── Notificar todos os admins/coordenadores ───────────────────────
export async function notifyAdmins({ type, title, message, bookingId = null }) {
  try {
    const admins = await query("SELECT id FROM users WHERE role IN ('admin','coordinator') AND active = 1")
    for (const a of admins) {
      await createNotification({ userId: a.id, type, title, message, bookingId })
    }
  } catch (e) {
    console.error('Erro ao notificar admins:', e.message)
  }
}

// ── GET /notifications ────────────────────────────────────────────
export async function getNotifications(req, res) {
  try {
    const userId = req.user.id
    const notifications = await query(
      `SELECT n.*, b.date AS booking_date, b.start_time, b.end_time,
              r.name AS resource_name, t.name AS teacher_name
       FROM notifications n
       LEFT JOIN bookings  b ON b.id = n.booking_id
       LEFT JOIN resources r ON r.id = b.resource_id
       LEFT JOIN teachers  t ON t.id = b.teacher_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [userId]
    )

    const unreadCount = notifications.filter(n => !n.read_at).length

    res.json({ notifications, unreadCount })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Erro interno' })
  }
}

// ── PATCH /notifications/:id/read ────────────────────────────────
export async function markRead(req, res) {
  try {
    await query(
      'UPDATE notifications SET read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    res.json({ message: 'Marcada como lida' })
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' })
  }
}

// ── PATCH /notifications/read-all ────────────────────────────────
export async function markAllRead(req, res) {
  try {
    await query(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    )
    res.json({ message: 'Todas marcadas como lidas' })
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' })
  }
}

// ── DELETE /notifications/:id ─────────────────────────────────────
export async function deleteNotification(req, res) {
  try {
    await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    res.json({ message: 'Removida' })
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' })
  }
}
