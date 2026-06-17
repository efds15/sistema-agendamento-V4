import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

function getDbConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL)
    return {
      host:           url.hostname,
      port:           parseInt(url.port),
      user:           url.username,
      password:       url.password,
      database:       url.pathname.slice(1),
      timezone:       'Z',
      decimalNumbers: true,
      ssl:            { rejectUnauthorized: false },
      connectTimeout: 10000,
    }
  }
  return {
    host:           process.env.DB_HOST     || 'localhost',
    port:           parseInt(process.env.DB_PORT || '3306'),
    user:           process.env.DB_USER     || 'root',
    password:       process.env.DB_PASSWORD || '',
    database:       process.env.DB_NAME     || 'agendamento',
    timezone:       'Z',
    decimalNumbers: true,
    ...(isServerless && { ssl: { rejectUnauthorized: false }, connectTimeout: 10000 }),
  }
}

const dbConfig = getDbConfig()
console.log(`[DB] host=${dbConfig.host} port=${dbConfig.port} db=${dbConfig.database} serverless=${isServerless} ssl=${!!dbConfig.ssl}`)

const pool = isServerless ? null : mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit:    10,
})

async function getConnection() {
  if (pool) return pool
  return mysql.createConnection(dbConfig)
}

export async function query(sql, params = []) {
  const conn = await getConnection()
  try {
    const [rows] = await conn.execute(sql, params)
    return rows
  } finally {
    if (!pool) await conn.end()
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

export async function transaction(fn) {
  const conn = pool ? await pool.getConnection() : await mysql.createConnection(dbConfig)
  await conn.beginTransaction()
  try {
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    if (pool) conn.release()
    else await conn.end()
  }
}

export async function testConnection() {
  try {
    await query('SELECT 1')
    console.log('✅ MySQL conectado com sucesso')
    return true
  } catch (err) {
    console.error('❌ Erro ao conectar MySQL:', err.message)
    return false
  }
}

export default pool || { execute: (sql, params) => query(sql, params) }
