import bcrypt from 'bcryptjs'
import { query, queryOne } from '../database/connection.js'

// Lida com features como string JSON, array ou null
function parseFeatures(f) {
  if (!f) return []
  if (Array.isArray(f)) return f
  if (typeof f === 'string') {
    try { return JSON.parse(f) } catch { return [] }
  }
  return []
}

function safeJson(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return [] } }
  return []
}

// ── TEACHERS ──────────────────────────────────────────────────
export async function getTeachers(req, res) {
  try {
    const rows = await query('SELECT * FROM teachers ORDER BY name')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function getTeacherById(req, res) {
  try {
    const t = await queryOne('SELECT * FROM teachers WHERE id = ?', [req.params.id])
    if (!t) return res.status(404).json({ error: 'Professor não encontrado' })
    const rows = await query('SELECT COUNT(*) AS bookingCount FROM bookings WHERE teacher_id = ?', [t.id])
    const bookingCount = rows[0].bookingCount
    res.json({ ...t, bookingCount })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function createUser(req, res) {
  try {
    const { name, email, password, role, cpf, subjects, phone } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' })

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email])
    if (existing) return res.status(409).json({ error: 'Este e-mail já está cadastrado' })

    const userRole = role || 'teacher'
    const hash = await bcrypt.hash(password, 10)

    // Se for professor/coordenador, cria também na tabela teachers
    if (['teacher','coordinator'].includes(userRole)) {
      const tResult = await query(
        'INSERT INTO teachers (name,email,cpf,subjects,role,phone,active) VALUES (?,?,?,?,?,?,1)',
        [name, email, cpf||'', subjects||'', userRole, phone||'']
      )
      const teacherId = tResult.insertId
      await query(
        'INSERT INTO users (name,email,password,role,teacher_id,active) VALUES (?,?,?,?,?,1)',
        [name, email, hash, userRole, teacherId]
      )
      const teacher = await queryOne('SELECT * FROM teachers WHERE id = ?', [teacherId])
      return res.status(201).json({ ...teacher, type: 'teacher' })
    }

    // Admin puro — só na tabela users
    const uResult = await query(
      'INSERT INTO users (name,email,password,role,active) VALUES (?,?,?,?,1)',
      [name, email, hash, userRole]
    )
    const user = await queryOne('SELECT id,name,email,role,active,created_at FROM users WHERE id = ?', [uResult.insertId])
    res.status(201).json({ ...user, type: 'admin' })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}


export async function createTeacher(req, res) {
  try {
    const { name, email, cpf, subjects, role, phone, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email])
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' })

    const tResult = await query(
      'INSERT INTO teachers (name,email,cpf,subjects,role,phone,active) VALUES (?,?,?,?,?,?,1)',
      [name, email, cpf||'', subjects||'', role||'teacher', phone||'']
    )
    const teacherId = tResult.insertId
    const hash = await bcrypt.hash(password, 10)
    await query(
      'INSERT INTO users (name,email,password,role,teacher_id,active) VALUES (?,?,?,?,?,1)',
      [name, email, hash, role||'teacher', teacherId]
    )
    const teacher = await queryOne('SELECT * FROM teachers WHERE id = ?', [teacherId])
    res.status(201).json(teacher)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

export async function updateTeacher(req, res) {
  try {
    const id = req.params.id
    const t = await queryOne('SELECT * FROM teachers WHERE id = ?', [id])
    if (!t) return res.status(404).json({ error: 'Professor não encontrado' })
    const { name, email, cpf, subjects, role, phone, active } = req.body
    await query(
      'UPDATE teachers SET name=?,email=?,cpf=?,subjects=?,role=?,phone=?,active=? WHERE id=?',
      [name??t.name, email??t.email, cpf??t.cpf, subjects??t.subjects, role??t.role, phone??t.phone, active!=null?active:t.active, id]
    )
    const updated = await queryOne('SELECT * FROM teachers WHERE id = ?', [id])
    res.json(updated)
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function toggleTeacher(req, res) {
  try {
    const id = req.params.id
    const t = await queryOne('SELECT * FROM teachers WHERE id = ?', [id])
    if (!t) return res.status(404).json({ error: 'Professor não encontrado' })
    const newActive = t.active ? 0 : 1
    await query('UPDATE teachers SET active=? WHERE id=?', [newActive, id])
    await query('UPDATE users SET active=? WHERE teacher_id=?', [newActive, id])
    const updated = await queryOne('SELECT * FROM teachers WHERE id = ?', [id])
    res.json(updated)
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

// ── RESOURCES ─────────────────────────────────────────────────
export async function getResources(req, res) {
  try {
    const { type } = req.query
    let sql = 'SELECT * FROM resources'
    const params = []
    if (type) { sql += ' WHERE type = ?'; params.push(type) }
    sql += ' ORDER BY name'
    const rows = await query(sql, params)
    res.json(rows.map(r => ({ ...r, features: parseFeatures(r.features) })))
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function createResource(req, res) {
  try {
    const { name, type, capacity, location, floor, features } = req.body
    if (!name || !type) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' })
    const featuresJson = JSON.stringify(Array.isArray(features) ? features : (features||'').split(',').map(s=>s.trim()).filter(Boolean))
    const result = await query(
      'INSERT INTO resources (name,type,capacity,location,floor,features,active) VALUES (?,?,?,?,?,?,1)',
      [name, type, capacity||0, location||'', floor||'', featuresJson]
    )
    const r = await queryOne('SELECT * FROM resources WHERE id = ?', [result.insertId])
    res.status(201).json({ ...r, features: parseFeatures(r.features) })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function updateResource(req, res) {
  try {
    const id = req.params.id
    const r = await queryOne('SELECT * FROM resources WHERE id = ?', [id])
    if (!r) return res.status(404).json({ error: 'Ambiente não encontrado' })
    const features = req.body.features
    const featuresJson = features ? JSON.stringify(Array.isArray(features)?features:features.split(',').map(s=>s.trim()).filter(Boolean)) : JSON.stringify(parseFeatures(r.features))
    await query(
      'UPDATE resources SET name=?,type=?,capacity=?,location=?,floor=?,features=?,active=? WHERE id=?',
      [req.body.name??r.name, req.body.type??r.type, req.body.capacity??r.capacity, req.body.location??r.location, req.body.floor??r.floor, featuresJson, req.body.active!=null?req.body.active:r.active, id]
    )
    const updated = await queryOne('SELECT * FROM resources WHERE id = ?', [id])
    res.json({ ...updated, features: parseFeatures(updated.features) })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function deleteResource(req, res) {
  try {
    const id = req.params.id
    await query('UPDATE resources SET active = 0 WHERE id = ?', [id])
    res.json({ message: 'Ambiente desativado' })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

// ── EQUIPMENTS ────────────────────────────────────────────────
export async function getEquipments(req, res) {
  try {
    const { type, status } = req.query
    let sql = 'SELECT * FROM equipments WHERE 1=1'
    const params = []
    if (type)   { sql += ' AND type = ?';   params.push(type) }
    if (status) { sql += ' AND status = ?'; params.push(status) }
    sql += ' ORDER BY name'
    res.json(await query(sql, params))
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function createEquipment(req, res) {
  try {
    const { name, type, brand, model, patrimony } = req.body
    if (!name || !type) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' })
    const result = await query(
      'INSERT INTO equipments (name,type,brand,model,patrimony,status,active) VALUES (?,?,?,?,?,\'disponivel\',1)',
      [name, type, brand||'', model||'', patrimony||null]
    )
    const eq = await queryOne('SELECT * FROM equipments WHERE id = ?', [result.insertId])
    res.status(201).json(eq)
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function updateEquipment(req, res) {
  try {
    const id = req.params.id
    const e = await queryOne('SELECT * FROM equipments WHERE id = ?', [id])
    if (!e) return res.status(404).json({ error: 'Equipamento não encontrado' })
    await query(
      'UPDATE equipments SET name=?,type=?,brand=?,model=?,patrimony=?,status=?,active=? WHERE id=?',
      [req.body.name??e.name, req.body.type??e.type, req.body.brand??e.brand, req.body.model??e.model, req.body.patrimony??e.patrimony, req.body.status??e.status, req.body.active!=null?req.body.active:e.active, id]
    )
    res.json(await queryOne('SELECT * FROM equipments WHERE id = ?', [id]))
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function deleteEquipment(req, res) {
  try {
    await query('UPDATE equipments SET active = 0 WHERE id = ?', [req.params.id])
    res.json({ message: 'Equipamento desativado' })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

// ── USERS (admin) ─────────────────────────────────────────────────
export async function getUsers(req, res) {
  try {
    const rows = await query('SELECT id,name,email,role,teacher_id,active,created_at FROM users ORDER BY name')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function updateUser(req, res) {
  try {
    const id = req.params.id
    const u = await queryOne('SELECT * FROM users WHERE id = ?', [id])
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado' })
    const { name, email, role, active } = req.body
    await query('UPDATE users SET name=?,email=?,role=?,active=? WHERE id=?',
      [name??u.name, email??u.email, role??u.role, active!=null?active:u.active, id])
    // Sync teacher if linked
    if (u.teacher_id) {
      await query('UPDATE teachers SET name=?,email=?,role=?,active=? WHERE id=?',
        [name??u.name, email??u.email, role??u.role, active!=null?active:u.active, u.teacher_id])
    }
    res.json(await queryOne('SELECT id,name,email,role,teacher_id,active FROM users WHERE id=?',[id]))
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function resetUserPassword(req, res) {
  try {
    const hash = await bcrypt.hash('123456', 10)
    await query('UPDATE users SET password=? WHERE id=?', [hash, req.params.id])
    res.json({ message: 'Senha redefinida para: 123456' })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}
