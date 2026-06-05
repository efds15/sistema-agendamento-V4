import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const pool = mysql.createPool({
  host:              process.env.DB_HOST     || 'localhost',
  port:              parseInt(process.env.DB_PORT || '3306'),
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASSWORD || '',
  database:          process.env.DB_NAME     || 'agendamento',
  waitForConnections: true,
  connectionLimit:    10,
  timezone:          'Z',
  decimalNumbers:    true,
})

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

export async function transaction(fn) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function testConnection() {
  try {
    await pool.execute('SELECT 1')
    console.log('✅ MySQL conectado com sucesso')
    return true
  } catch (err) {
    console.error('❌ Erro ao conectar MySQL:', err.message)
    return false
  }
}

export default pool
