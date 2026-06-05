import { query, queryOne } from '../database/connection.js'

// GET /api/slots — todos ativos (professores) ou todos (admin)
export async function getSlots(req, res) {
  try {
    const isAdmin = ['admin','coordinator'].includes(req.user?.role)
    const rows = await query(
      `SELECT * FROM time_slots ${isAdmin ? '' : "WHERE active = 1"} ORDER BY sort_order, start_time`
    )
    res.json(rows.map(r => ({
      ...r,
      start_time: String(r.start_time).substring(0,5),
      end_time:   String(r.end_time).substring(0,5),
    })))
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// POST /api/slots
export async function createSlot(req, res) {
  try {
    const { label, start_time, end_time, sort_order } = req.body
    if (!label || !start_time || !end_time) return res.status(400).json({ error: 'label, start_time e end_time são obrigatórios' })
    if (start_time >= end_time) return res.status(400).json({ error: 'Horário de início deve ser antes do fim' })

    const existing = await queryOne('SELECT id FROM time_slots WHERE start_time = ? AND end_time = ?', [start_time, end_time])
    if (existing) return res.status(409).json({ error: 'Já existe uma aula com este horário' })

    const maxOrder = await queryOne('SELECT MAX(sort_order) AS m FROM time_slots')
    const order = sort_order ?? ((maxOrder?.m || 0) + 1)

    const result = await query(
      'INSERT INTO time_slots (label, start_time, end_time, sort_order, active) VALUES (?,?,?,?,1)',
      [label.trim(), start_time, end_time, order]
    )
    const slot = await queryOne('SELECT * FROM time_slots WHERE id = ?', [result.insertId])
    res.status(201).json({
      ...slot,
      start_time: String(slot.start_time).substring(0,5),
      end_time:   String(slot.end_time).substring(0,5),
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// PUT /api/slots/:id
export async function updateSlot(req, res) {
  try {
    const id = req.params.id
    const slot = await queryOne('SELECT * FROM time_slots WHERE id = ?', [id])
    if (!slot) return res.status(404).json({ error: 'Aula não encontrada' })

    const { label, start_time, end_time, sort_order, active } = req.body
    if (start_time && end_time && start_time >= end_time)
      return res.status(400).json({ error: 'Horário de início deve ser antes do fim' })

    await query(
      'UPDATE time_slots SET label=?, start_time=?, end_time=?, sort_order=?, active=? WHERE id=?',
      [
        label      ?? slot.label,
        start_time ?? String(slot.start_time).substring(0,5),
        end_time   ?? String(slot.end_time).substring(0,5),
        sort_order ?? slot.sort_order,
        active     != null ? active : slot.active,
        id
      ]
    )
    const updated = await queryOne('SELECT * FROM time_slots WHERE id = ?', [id])
    res.json({
      ...updated,
      start_time: String(updated.start_time).substring(0,5),
      end_time:   String(updated.end_time).substring(0,5),
    })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

// DELETE /api/slots/:id
export async function deleteSlot(req, res) {
  try {
    const slot = await queryOne('SELECT id FROM time_slots WHERE id = ?', [req.params.id])
    if (!slot) return res.status(404).json({ error: 'Aula não encontrada' })
    await query('DELETE FROM time_slots WHERE id = ?', [req.params.id])
    res.json({ message: 'Aula removida' })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}
