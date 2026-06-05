import { query, queryOne } from '../database/connection.js'
import { createNotification, notifyAdmins } from './notificationController.js'

// ── helpers ────────────────────────────────────────────────────
async function hasConflict(resourceId, date, start, end, excludeId = null) {
  const rows = await query(
    `SELECT id FROM bookings
     WHERE resource_id = ? AND date = ? AND status != 'cancelado'
       AND (? IS NULL OR id != ?)
       AND start_time < ? AND end_time > ?`,
    [resourceId, date, excludeId, excludeId, end, start]
  )
  return rows.length > 0
}

async function hasEquipmentConflict(equipId, date, start, end, excludeId = null) {
  const rows = await query(
    `SELECT id FROM bookings
     WHERE date = ? AND status != 'cancelado'
       AND (? IS NULL OR id != ?)
       AND start_time < ? AND end_time > ?
       AND JSON_CONTAINS(equipment_ids, CAST(? AS JSON))`,
    [date, excludeId, excludeId, end, start, String(equipId)]
  )
  return rows.length > 0
}

function safeParseJson(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return [] } }
  return []
}

function enrichBooking(b) {
  return {
    ...b,
    equipmentIds: safeParseJson(b.equipment_ids),
    teacher:  b.teacher_id  ? { id: b.teacher_id,  name: b.teacher_name,  email: b.teacher_email }                     : null,
    resource: b.resource_id ? { id: b.resource_id, name: b.resource_name, type: b.resource_type, location: b.resource_location } : null,
  }
}

// ── LIST ───────────────────────────────────────────────────────
export async function getBookings(req, res) {
  try {
    const { date, status, teacherId } = req.query
    let sql = `
      SELECT b.*,
             t.name  AS teacher_name, t.email AS teacher_email,
             r.name  AS resource_name, r.type  AS resource_type, r.location AS resource_location
      FROM bookings b
      LEFT JOIN teachers  t ON t.id = b.teacher_id
      LEFT JOIN resources r ON r.id = b.resource_id
      WHERE 1=1`
    const params = []
    if (date)      { sql += ' AND b.date = ?';          params.push(date) }
    if (status)    { sql += ' AND b.status = ?';        params.push(status) }
    if (teacherId) { sql += ' AND b.teacher_id = ?';    params.push(teacherId) }
    if (req.user.role === 'teacher') {
      sql += ' AND b.teacher_id = ?'; params.push(req.user.teacherId)
    }
    sql += ' ORDER BY b.date, b.start_time'
    const rows = await query(sql, params)
    res.json(rows.map(enrichBooking))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// ── GET ONE ────────────────────────────────────────────────────
export async function getBookingById(req, res) {
  try {
    const rows = await query(
      `SELECT b.*,
              t.name AS teacher_name, t.email AS teacher_email,
              r.name AS resource_name, r.type AS resource_type, r.location AS resource_location
       FROM bookings b
       LEFT JOIN teachers  t ON t.id = b.teacher_id
       LEFT JOIN resources r ON r.id = b.resource_id
       WHERE b.id = ?`, [req.params.id])
    if (!rows.length) return res.status(404).json({ error: 'Agendamento não encontrado' })
    const b = enrichBooking(rows[0])
    // Fetch equipment details
    if (b.equipmentIds?.length) {
      b.equipments = await query(`SELECT * FROM equipments WHERE id IN (${b.equipmentIds.map(()=>'?').join(',')})`, b.equipmentIds)
    } else { b.equipments = [] }
    res.json(b)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// ── CREATE ─────────────────────────────────────────────────────
export async function createBooking(req, res) {
  try {
    const { teacherId: bodyTeacherId, resourceId, equipmentIds = [], date, startTime, endTime, purpose } = req.body

    // Professor usa o próprio ID do token; admin/coordinator pode escolher qualquer professor
    const teacherId = ['admin','coordinator'].includes(req.user.role)
      ? parseInt(bodyTeacherId)
      : req.user.teacherId

    const missing = []
    if (!teacherId)  missing.push('professor')
    if (!resourceId) missing.push('ambiente')
    if (!date)       missing.push('data')
    if (!startTime)  missing.push('horário de início')
    if (!endTime)    missing.push('horário de término')
    if (missing.length)
      return res.status(400).json({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` })
    if (startTime >= endTime)
      return res.status(400).json({ error: 'Horário de início deve ser anterior ao término' })

    const resource = await queryOne('SELECT * FROM resources WHERE id = ? AND active = 1', [resourceId])
    if (!resource) return res.status(404).json({ error: 'Ambiente não encontrado' })

    if (await hasConflict(resourceId, date, startTime, endTime))
      return res.status(409).json({ error: `Conflito: ${resource.name} já está reservado neste horário` })

    for (const eid of equipmentIds) {
      const eq = await queryOne('SELECT * FROM equipments WHERE id = ? AND active = 1', [eid])
      if (!eq) return res.status(404).json({ error: `Equipamento ${eid} não encontrado` })
      if (eq.status === 'manutencao') return res.status(400).json({ error: `${eq.name} está em manutenção` })
      if (await hasEquipmentConflict(eid, date, startTime, endTime))
        return res.status(409).json({ error: `Conflito: ${eq.name} já está reservado neste horário` })
    }

    const status = ['admin','coordinator'].includes(req.user.role) ? 'confirmado' : 'pendente'
    const result = await query(
      'INSERT INTO bookings (teacher_id,resource_id,equipment_ids,date,start_time,end_time,purpose,status,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [teacherId, resourceId, JSON.stringify(equipmentIds), date, startTime, endTime, purpose||'', status, req.user.id]
    )
    const newId = result.insertId
    for (const eid of equipmentIds) {
      await query('INSERT IGNORE INTO booking_equipment (booking_id,equipment_id) VALUES (?,?)', [newId, eid])
    }
    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [newId])

    // ── Notificações ──────────────────────────────────────────────
    const teacher = await queryOne('SELECT * FROM teachers WHERE id = ?', [teacherId])
    const userForTeacher = await queryOne('SELECT id FROM users WHERE teacher_id = ?', [teacherId])
    const dateStr = new Date(date+'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })

    if (status === 'confirmado') {
      // Notifica o próprio professor
      if (userForTeacher) {
        await createNotification({
          userId: userForTeacher.id, type: 'confirmado', bookingId: newId,
          title: 'Agendamento confirmado',
          message: `${resource.name} — ${dateStr} das ${startTime} às ${endTime}`
        })
      }
      // Notifica admins
      await notifyAdmins({
        type: 'confirmado', bookingId: newId,
        title: 'Novo agendamento confirmado',
        message: `${teacher?.name || 'Professor'} reservou ${resource.name} em ${dateStr} das ${startTime} às ${endTime}`
      })
    } else {
      // Pendente: avisa admins para aprovar
      await notifyAdmins({
        type: 'pendente', bookingId: newId,
        title: 'Agendamento aguardando aprovação',
        message: `${teacher?.name || 'Professor'} solicitou ${resource.name} em ${dateStr} das ${startTime} às ${endTime}`
      })
      // Notifica o professor que está pendente
      if (userForTeacher) {
        await createNotification({
          userId: userForTeacher.id, type: 'pendente', bookingId: newId,
          title: 'Agendamento em análise',
          message: `Sua reserva de ${resource.name} em ${dateStr} está aguardando aprovação`
        })
      }
    }

    res.status(201).json(booking)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// ── UPDATE ─────────────────────────────────────────────────────
export async function updateBooking(req, res) {
  try {
    const id = parseInt(req.params.id)
    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [id])
    if (!booking) return res.status(404).json({ error: 'Agendamento não encontrado' })
    if (req.user.role === 'teacher' && booking.teacher_id !== req.user.teacherId)
      return res.status(403).json({ error: 'Sem permissão' })

    const resourceId = req.body.resourceId || booking.resource_id
    const date       = req.body.date       || booking.date
    const startTime  = req.body.startTime  || booking.start_time
    const endTime    = req.body.endTime    || booking.end_time

    if (await hasConflict(resourceId, date, startTime, endTime, id)) {
      const r = await queryOne('SELECT name FROM resources WHERE id = ?', [resourceId])
      return res.status(409).json({ error: `Conflito: ${r?.name} já está reservado neste horário` })
    }

    const fields = {
      teacher_id:    req.body.teacherId  ?? booking.teacher_id,
      resource_id:   resourceId,
      date,
      start_time:    startTime,
      end_time:      endTime,
      purpose:       req.body.purpose    ?? booking.purpose,
      status:        (['admin','coordinator'].includes(req.user.role) && req.body.status) ? req.body.status : booking.status,
      equipment_ids: req.body.equipmentIds ? JSON.stringify(req.body.equipmentIds) : booking.equipment_ids,
    }
    await query(
      `UPDATE bookings SET teacher_id=?,resource_id=?,date=?,start_time=?,end_time=?,purpose=?,status=?,equipment_ids=? WHERE id=?`,
      [fields.teacher_id,fields.resource_id,fields.date,fields.start_time,fields.end_time,fields.purpose,fields.status,fields.equipment_ids,id]
    )
    if (req.body.equipmentIds) {
      await query('DELETE FROM booking_equipment WHERE booking_id = ?', [id])
      for (const eid of req.body.equipmentIds) {
        await query('INSERT IGNORE INTO booking_equipment (booking_id,equipment_id) VALUES (?,?)', [id, eid])
      }
    }
    const updated = await queryOne('SELECT * FROM bookings WHERE id = ?', [id])

    // ── Notificações ao confirmar ─────────────────────────────────
    const prevStatus = booking.status
    const newStatus  = fields.status
    if (prevStatus !== newStatus && newStatus === 'confirmado') {
      const userForTeacher = await queryOne('SELECT id FROM users WHERE teacher_id = ?', [fields.teacher_id])
      const res2 = await queryOne('SELECT name FROM resources WHERE id = ?', [resourceId])
      const dateStr = new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
      if (userForTeacher) {
        await createNotification({
          userId: userForTeacher.id, type: 'confirmado', bookingId: id,
          title: 'Agendamento confirmado! ✅',
          message: `Sua reserva de ${res2?.name} em ${dateStr} das ${startTime} às ${endTime} foi aprovada`
        })
      }
    }

    res.json(updated)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// ── CANCEL ─────────────────────────────────────────────────────
export async function cancelBooking(req, res) {
  try {
    const id = parseInt(req.params.id)
    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [id])
    if (!booking) return res.status(404).json({ error: 'Agendamento não encontrado' })
    if (req.user.role === 'teacher' && booking.teacher_id !== req.user.teacherId)
      return res.status(403).json({ error: 'Sem permissão' })
    await query("UPDATE bookings SET status = 'cancelado' WHERE id = ?", [id])

    // ── Notificação de cancelamento ───────────────────────────────
    const resource = await queryOne('SELECT name FROM resources WHERE id = ?', [booking.resource_id])
    const dateStr  = new Date(String(booking.date).split('T')[0]+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})
    const userForTeacher = await queryOne('SELECT id FROM users WHERE teacher_id = ?', [booking.teacher_id])
    if (userForTeacher && userForTeacher.id !== req.user.id) {
      await createNotification({
        userId: userForTeacher.id, type: 'cancelado', bookingId: id,
        title: 'Agendamento cancelado',
        message: `Sua reserva de ${resource?.name} em ${dateStr} das ${String(booking.start_time).substring(0,5)} às ${String(booking.end_time).substring(0,5)} foi cancelada`
      })
    }
    // Avisa admins se foi o próprio professor que cancelou
    if (req.user.role === 'teacher') {
      const teacher = await queryOne('SELECT name FROM teachers WHERE id = ?', [booking.teacher_id])
      await notifyAdmins({
        type: 'cancelado', bookingId: id,
        title: 'Agendamento cancelado pelo professor',
        message: `${teacher?.name} cancelou a reserva de ${resource?.name} em ${dateStr}`
      })
    }

    res.json({ message: 'Agendamento cancelado' })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

// ── AVAILABILITY ───────────────────────────────────────────────
export async function getAvailability(req, res) {
  try {
    const { date, startTime, endTime } = req.query
    if (!date || !startTime || !endTime)
      return res.status(400).json({ error: 'date, startTime e endTime são obrigatórios' })

    const resources = await query('SELECT * FROM resources WHERE active = 1')
    const equipments = await query("SELECT * FROM equipments WHERE active = 1 AND status != 'manutencao'")

    const enrichedRes = await Promise.all(resources.map(async r => {
      let features = r.features
      if (typeof features === 'string') { try { features = JSON.parse(features) } catch { features = [] } }
      if (!Array.isArray(features)) features = []
      return { ...r, features, available: !(await hasConflict(r.id, date, startTime, endTime)) }
    }))
    const enrichedEq = await Promise.all(equipments.map(async e => ({
      ...e, available: !(await hasEquipmentConflict(e.id, date, startTime, endTime))
    })))

    res.json({ resources: enrichedRes, equipments: enrichedEq })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// ── DASHBOARD ──────────────────────────────────────────────────
export async function getDashboard(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.substring(0,7) + '-01'

    const rows1 = await query("SELECT COUNT(*) AS totalTeachers FROM teachers WHERE active=1")
    const rows2 = await query("SELECT COUNT(*) AS totalResources FROM resources WHERE active=1")
    const rows3 = await query("SELECT COUNT(*) AS totalEquipments FROM equipments WHERE active=1")
    const rows4 = await query("SELECT COUNT(*) AS todayBookings FROM bookings WHERE date=? AND status!='cancelado'",[today])
    const rows5 = await query("SELECT COUNT(*) AS pendingBookings FROM bookings WHERE status='pendente'")
    const rows6 = await query("SELECT COUNT(*) AS monthBookings FROM bookings WHERE date>=? AND status!='cancelado'",[monthStart])

    const totalTeachers   = rows1[0].totalTeachers
    const totalResources  = rows2[0].totalResources
    const totalEquipments = rows3[0].totalEquipments
    const todayBookings   = rows4[0].todayBookings
    const pendingBookings = rows5[0].pendingBookings
    const monthBookings   = rows6[0].monthBookings

    const todayList = await query(
      `SELECT b.*, t.name AS teacher_name, r.name AS resource_name, r.type AS resource_type
       FROM bookings b
       LEFT JOIN teachers  t ON t.id = b.teacher_id
       LEFT JOIN resources r ON r.id = b.resource_id
       WHERE b.date = ? AND b.status != 'cancelado'
       ORDER BY b.start_time`, [today]
    )

    res.json({
      totalTeachers, totalResources, totalEquipments,
      todayBookings, pendingBookings, monthBookings,
      todayList: todayList.map(b => ({
        ...b,
        teacher:  { id: b.teacher_id,  name: b.teacher_name },
        resource: { id: b.resource_id, name: b.resource_name, type: b.resource_type },
      }))
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}
