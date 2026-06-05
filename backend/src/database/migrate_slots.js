import 'dotenv/config'
import mysql from 'mysql2/promise'

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agendamento',
})

await conn.execute(`
  CREATE TABLE IF NOT EXISTS time_slots (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    label      VARCHAR(50)  NOT NULL COMMENT 'Ex: 1ª Aula',
    start_time TIME         NOT NULL,
    end_time   TIME         NOT NULL,
    active     TINYINT(1)   NOT NULL DEFAULT 1,
    sort_order SMALLINT     NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_slot_time (start_time, end_time)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`)

// Inserir as 9 aulas padrão
const slots = [
  ['1ª Aula','07:00','07:50',1],
  ['2ª Aula','07:50','08:40',2],
  ['3ª Aula','08:40','09:30',3],
  ['4ª Aula','09:30','10:20',4],
  ['5ª Aula','10:20','11:10',5],
  ['6ª Aula','11:10','12:00',6],
  ['7ª Aula','13:00','13:50',7],
  ['8ª Aula','13:50','14:40',8],
  ['9ª Aula','14:40','15:30',9],
]
for (const [label, start, end, order] of slots) {
  await conn.execute(
    'INSERT IGNORE INTO time_slots (label, start_time, end_time, sort_order) VALUES (?,?,?,?)',
    [label, start, end, order]
  )
}
console.log('✅ Tabela time_slots criada com 9 aulas padrão')
await conn.end()
