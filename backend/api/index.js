import app from '../src/app.js'
import { query } from '../src/database/connection.js'
import { seed } from '../src/database/seed.js'

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id    INT UNSIGNED NOT NULL,
      type       ENUM('confirmado','pendente','cancelado','conflito','manutencao','info') NOT NULL DEFAULT 'info',
      title      VARCHAR(150) NOT NULL,
      message    VARCHAR(500) NOT NULL,
      booking_id INT UNSIGNED NULL,
      read_at    DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notif_user    (user_id, read_at),
      KEY idx_notif_created (created_at),
      CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const cols = [
    `ALTER TABLE teachers   ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NULL`,
    `ALTER TABLE equipments ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NULL`,
    `ALTER TABLE users      ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NULL`,
  ]
  for (const c of cols) { try { await query(c) } catch {} }

  await query(`
    CREATE TABLE IF NOT EXISTS time_slots (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      label      VARCHAR(50)  NOT NULL,
      start_time TIME         NOT NULL,
      end_time   TIME         NOT NULL,
      active     TINYINT(1)   NOT NULL DEFAULT 1,
      sort_order SMALLINT     NOT NULL DEFAULT 0,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_slot_time (start_time, end_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const [{ n }] = await query('SELECT COUNT(*) AS n FROM time_slots')
  if (n === 0) {
    const defaults = [
      ['1ª Aula','07:00','07:50',1],['2ª Aula','07:50','08:40',2],
      ['3ª Aula','08:40','09:30',3],['4ª Aula','09:30','10:20',4],
      ['5ª Aula','10:20','11:10',5],['6ª Aula','11:10','12:00',6],
      ['7ª Aula','13:00','13:50',7],['8ª Aula','13:50','14:40',8],
      ['9ª Aula','14:40','15:30',9],
    ]
    for (const [l,s,e,o] of defaults)
      await query('INSERT IGNORE INTO time_slots (label,start_time,end_time,sort_order) VALUES (?,?,?,?)',[l,s,e,o])
  }

  try { await seed() } catch {}
}

// Runs once per cold start; subsequent requests reuse the resolved promise
const initPromise = ensureSchema().catch(e => console.warn('DB init warning:', e.message))

export default async function handler(req, res) {
  await initPromise
  return app(req, res)
}
