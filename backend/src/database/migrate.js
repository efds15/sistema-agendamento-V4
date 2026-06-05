import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

async function migrate() {
  // Conecta sem selecionar banco para poder criá-lo
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  })

  const db = process.env.DB_NAME || 'agendamento'
  console.log(`\n📦 Criando banco de dados "${db}"...\n`)

  await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${db}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.execute(`USE \`${db}\``)

  const tables = [
    // ── teachers ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS teachers (
      id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      name       VARCHAR(120)    NOT NULL,
      email      VARCHAR(180)    NOT NULL,
      cpf        VARCHAR(20)     NULL,
      subjects   VARCHAR(255)    NULL,
      role       ENUM('teacher','coordinator','admin') NOT NULL DEFAULT 'teacher',
      phone      VARCHAR(30)     NULL,
      active     TINYINT(1)      NOT NULL DEFAULT 1,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_teachers_email (email),
      KEY idx_teachers_active (active),
      KEY idx_teachers_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── users ──────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS users (
      id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      name       VARCHAR(120)    NOT NULL,
      email      VARCHAR(180)    NOT NULL,
      password   VARCHAR(255)    NOT NULL,
      role       ENUM('teacher','coordinator','admin') NOT NULL DEFAULT 'teacher',
      teacher_id INT UNSIGNED    NULL,
      active     TINYINT(1)      NOT NULL DEFAULT 1,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      KEY idx_users_teacher_id (teacher_id),
      KEY idx_users_active (active),
      CONSTRAINT fk_users_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── resources ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS resources (
      id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      name       VARCHAR(120)    NOT NULL,
      type       ENUM('sala','laboratorio','quadra','especial') NOT NULL,
      capacity   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      location   VARCHAR(120)    NULL,
      floor      VARCHAR(60)     NULL,
      features   JSON            NULL,
      active     TINYINT(1)      NOT NULL DEFAULT 1,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_resources_type (type),
      KEY idx_resources_active (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── equipments ─────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS equipments (
      id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      name       VARCHAR(120)    NOT NULL,
      type       ENUM('projetor','computador','kit_didatico','camera','audio','outro') NOT NULL,
      brand      VARCHAR(80)     NULL,
      model      VARCHAR(100)    NULL,
      patrimony  VARCHAR(40)     NULL,
      status     ENUM('disponivel','manutencao','emprestado') NOT NULL DEFAULT 'disponivel',
      active     TINYINT(1)      NOT NULL DEFAULT 1,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_equipments_patrimony (patrimony),
      KEY idx_equipments_type (type),
      KEY idx_equipments_status (status),
      KEY idx_equipments_active (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── bookings ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS bookings (
      id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      teacher_id    INT UNSIGNED    NOT NULL,
      resource_id   INT UNSIGNED    NOT NULL,
      equipment_ids JSON            NULL,
      date          DATE            NOT NULL,
      start_time    TIME            NOT NULL,
      end_time      TIME            NOT NULL,
      purpose       VARCHAR(255)    NULL,
      status        ENUM('pendente','confirmado','cancelado') NOT NULL DEFAULT 'pendente',
      created_by    INT UNSIGNED    NULL,
      created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_bookings_resource_date (resource_id, date),
      KEY idx_bookings_teacher_date (teacher_id, date),
      KEY idx_bookings_date (date),
      KEY idx_bookings_status (status),
      CONSTRAINT fk_bookings_teacher  FOREIGN KEY (teacher_id)  REFERENCES teachers  (id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_bookings_resource FOREIGN KEY (resource_id) REFERENCES resources (id) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── booking_equipment ──────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS booking_equipment (
      booking_id   INT UNSIGNED NOT NULL,
      equipment_id INT UNSIGNED NOT NULL,
      PRIMARY KEY (booking_id, equipment_id),
      KEY idx_be_equipment (equipment_id),
      CONSTRAINT fk_be_booking   FOREIGN KEY (booking_id)   REFERENCES bookings   (id) ON DELETE CASCADE  ON UPDATE CASCADE,
      CONSTRAINT fk_be_equipment FOREIGN KEY (equipment_id) REFERENCES equipments (id) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ]

  for (const sql of tables) {
    const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]
    await conn.execute(sql)
    console.log(`  ✅ Tabela "${name}" OK`)
  }

  // Views
  await conn.execute(`CREATE OR REPLACE VIEW vw_bookings_full AS
    SELECT b.id, b.date, b.start_time, b.end_time, b.purpose, b.status, b.equipment_ids, b.created_at,
           t.id AS teacher_id, t.name AS teacher_name, t.email AS teacher_email,
           r.id AS resource_id, r.name AS resource_name, r.type AS resource_type, r.location AS resource_location
    FROM bookings b
    INNER JOIN teachers  t ON t.id = b.teacher_id
    INNER JOIN resources r ON r.id = b.resource_id`)
  console.log('  ✅ View "vw_bookings_full" OK')

  await conn.end()
  console.log('\n🎉 Migrations concluídas!\n')
}

migrate().catch(e => { console.error(e); process.exit(1) })

// Adiciona tabela de notificações se não existir (pode ser rodado de novo com segurança)
export async function migrateNotifications() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agendamento',
  })
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id    INT UNSIGNED NOT NULL COMMENT 'Destinatário',
      type       ENUM('confirmado','pendente','cancelado','conflito','manutencao','info') NOT NULL DEFAULT 'info',
      title      VARCHAR(150) NOT NULL,
      message    VARCHAR(500) NOT NULL,
      booking_id INT UNSIGNED NULL,
      read_at    DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notif_user   (user_id, read_at),
      KEY idx_notif_created (created_at),
      CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('  ✅ Tabela "notifications" OK')
  await conn.end()
}

export async function migrateImages() {
  const mysql = await import('mysql2/promise')
  const conn = await mysql.default.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agendamento',
  })
  // Add image_url column to teachers if not exists
  const queries = [
    `ALTER TABLE teachers   ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NULL AFTER phone`,
    `ALTER TABLE equipments ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NULL AFTER patrimony`,
    `ALTER TABLE users      ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) NULL AFTER active`,
  ]
  for (const q of queries) {
    try { await conn.execute(q) } catch(e) { /* column may already exist */ }
  }
  await conn.end()
}
