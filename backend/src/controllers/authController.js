import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, queryOne } from '../database/connection.js'

const SECRET = process.env.JWT_SECRET || 'agendamento_secret_2025'

export async function login(req, res) {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    const user = await queryOne('SELECT * FROM users WHERE email = ? AND active = 1', [email])
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, teacherId: user.teacher_id },
      SECRET, { expiresIn: '8h' }
    )
    const { password: _, ...userData } = user
    res.json({ token, user: userData })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno' }) }
}

export async function me(req, res) {
  try {
    const user = await queryOne('SELECT id,name,email,role,teacher_id,active,created_at FROM users WHERE id = ?', [req.user.id])
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Campos obrigatórios' })
    if (newPassword.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' })
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id])
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(400).json({ error: 'Senha atual incorreta' })
    const hash = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id])
    res.json({ message: 'Senha alterada com sucesso' })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}
