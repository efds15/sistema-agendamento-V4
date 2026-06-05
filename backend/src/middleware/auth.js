import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'agendamento_secret_2025'

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token não fornecido' })
  try {
    req.user = jwt.verify(auth.split(' ')[1], SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

// Admin + Coordenador
export function adminOnly(req, res, next) {
  if (!['admin','coordinator'].includes(req.user.role))
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  next()
}

// Apenas Admin (não coordenador)
export function superAdminOnly(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Acesso restrito ao administrador' })
  next()
}
