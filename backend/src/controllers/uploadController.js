import { query, queryOne } from '../database/connection.js'
import { uploadToCloudinary, removeCloudinaryImage } from '../middleware/upload.js'

// POST /api/teachers/:id/image
export async function uploadTeacherImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' })
    const id = req.params.id
    const record = await queryOne('SELECT image_url FROM teachers WHERE id = ?', [id])
    if (!record) return res.status(404).json({ error: 'Professor não encontrado' })
    await removeCloudinaryImage(record.image_url)
    const result = await uploadToCloudinary(req.file.buffer, 'avatars')
    const imageUrl = result.secure_url
    await query('UPDATE teachers SET image_url = ? WHERE id = ?', [imageUrl, id])
    await query('UPDATE users SET image_url = ? WHERE teacher_id = ?', [imageUrl, id])
    res.json({ image_url: imageUrl })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao salvar imagem' }) }
}

// POST /api/users/:id/image
export async function uploadUserImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' })
    const id = req.params.id
    const record = await queryOne('SELECT image_url, teacher_id FROM users WHERE id = ?', [id])
    if (!record) return res.status(404).json({ error: 'Usuário não encontrado' })
    await removeCloudinaryImage(record.image_url)
    const result = await uploadToCloudinary(req.file.buffer, 'avatars')
    const imageUrl = result.secure_url
    await query('UPDATE users SET image_url = ? WHERE id = ?', [imageUrl, id])
    if (record.teacher_id) {
      await query('UPDATE teachers SET image_url = ? WHERE id = ?', [imageUrl, record.teacher_id])
    }
    res.json({ image_url: imageUrl })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao salvar imagem' }) }
}

// POST /api/equipments/:id/image
export async function uploadEquipmentImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' })
    const id = req.params.id
    const record = await queryOne('SELECT image_url FROM equipments WHERE id = ?', [id])
    if (!record) return res.status(404).json({ error: 'Equipamento não encontrado' })
    await removeCloudinaryImage(record.image_url)
    const result = await uploadToCloudinary(req.file.buffer, 'equipments')
    const imageUrl = result.secure_url
    await query('UPDATE equipments SET image_url = ? WHERE id = ?', [imageUrl, id])
    res.json({ image_url: imageUrl })
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao salvar imagem' }) }
}

// DELETE /api/image/:type/:id
export async function deleteImage(req, res) {
  try {
    const { type, id } = req.params
    const tableMap = { teacher: 'teachers', user: 'users', equipment: 'equipments' }
    const table = tableMap[type]
    if (!table) return res.status(400).json({ error: 'Tipo inválido' })
    const record = await queryOne(`SELECT image_url FROM ${table} WHERE id = ?`, [id])
    if (record?.image_url) await removeCloudinaryImage(record.image_url)
    await query(`UPDATE ${table} SET image_url = NULL WHERE id = ?`, [id])
    res.json({ message: 'Imagem removida' })
  } catch (e) { res.status(500).json({ error: 'Erro interno' }) }
}
