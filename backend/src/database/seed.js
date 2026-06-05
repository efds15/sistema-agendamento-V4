import bcrypt from 'bcryptjs'
import { query } from './connection.js'

export async function seed(force = false) {
  console.log('\n🌱 Verificando dados iniciais...\n')

  const [{ count }] = await query('SELECT COUNT(*) as count FROM users')
  if (count > 0 && !force) {
    console.log('  ℹ️  Banco já possui dados. Use seed(true) para forçar.\n')
    return
  }

  if (force) {
    await query('SET FOREIGN_KEY_CHECKS=0')
    for (const t of ['booking_equipment','bookings','users','teachers','equipments','resources']) {
      await query(`TRUNCATE TABLE ${t}`)
    }
    await query('SET FOREIGN_KEY_CHECKS=1')
    console.log('  🗑️  Dados anteriores removidos')
  }

  const adminHash = await bcrypt.hash('admin123', 10)
  const profHash  = await bcrypt.hash('prof123',  10)

  // Teachers
  const teachers = [
    [1,'João Silva',    'joao@agendamento.com',    '111.222.333-44','Matemática, Física',  'teacher',    '(11) 99999-0001',1],
    [2,'Ana Costa',     'ana@agendamento.com',     '222.333.444-55','Português, Literatura','teacher',   '(11) 99999-0002',1],
    [3,'Carlos Melo',   'carlos@agendamento.com',  '333.444.555-66','Educação Física',     'coordinator','(11) 99999-0003',1],
    [4,'Beatriz Lima',  'beatriz@agendamento.com', '444.555.666-77','Biologia, Química',   'teacher',    '(11) 99999-0004',1],
    [5,'Fernanda Souza','fernanda@agendamento.com','555.666.777-88','Química',             'teacher',    '(11) 99999-0005',0],
  ]
  for (const [id,name,email,cpf,subjects,role,phone,active] of teachers) {
    await query('INSERT INTO teachers (id,name,email,cpf,subjects,role,phone,active) VALUES (?,?,?,?,?,?,?,?)',
      [id,name,email,cpf,subjects,role,phone,active])
  }
  console.log('  ✅ Teachers inseridos')

  // Users
  const users = [
    [1,'Administrador','admin@agendamento.com',adminHash,'admin',      null,1],
    [2,'João Silva',   'joao@agendamento.com', profHash, 'teacher',    1,   1],
    [3,'Ana Costa',    'ana@agendamento.com',  profHash, 'teacher',    2,   1],
    [4,'Carlos Melo',  'carlos@agendamento.com',profHash,'coordinator',3,   1],
  ]
  for (const [id,name,email,password,role,teacher_id,active] of users) {
    await query('INSERT INTO users (id,name,email,password,role,teacher_id,active) VALUES (?,?,?,?,?,?,?)',
      [id,name,email,password,role,teacher_id,active])
  }
  console.log('  ✅ Users inseridos')

  // Resources
  const resources = [
    [1,'Sala 01',             'sala',       35,'Bloco A','1º andar', '["Quadro branco","Projetor fixo","Ar condicionado"]'],
    [2,'Sala 02',             'sala',       35,'Bloco A','1º andar', '["Quadro branco"]'],
    [3,'Sala 10',             'sala',       40,'Bloco B','2º andar', '["Quadro branco","Ar condicionado"]'],
    [4,'Lab. Informática 1',  'laboratorio',30,'Bloco B','Térreo',   '["30 computadores","Projetor","Ar condicionado"]'],
    [5,'Lab. Química',        'laboratorio',24,'Bloco C','Térreo',   '["Bancadas","Pia","EPIs"]'],
    [6,'Lab. Biologia',       'laboratorio',24,'Bloco C','1º andar', '["Microscópios","Bancadas"]'],
    [7,'Quadra Poliesportiva','quadra',    200,'Área externa','Térreo','["Vestiário","Iluminação","Arquibancada"]'],
    [8,'Sala Multiuso',       'especial',   60,'Bloco D','Térreo',   '["Palco","Som","Projetor","Ar condicionado"]'],
    [9,'Biblioteca',          'especial',   50,'Bloco A','Térreo',   '["Computadores","Mesas de estudo"]'],
  ]
  for (const [id,name,type,capacity,location,floor,features] of resources) {
    await query('INSERT INTO resources (id,name,type,capacity,location,floor,features) VALUES (?,?,?,?,?,?,?)',
      [id,name,type,capacity,location,floor,features])
  }
  console.log('  ✅ Resources inseridos')

  // Equipments
  const equipments = [
    [1,'Projetor Epson 1','projetor',    'Epson',         'PowerLite X49','PAT-001','disponivel'],
    [2,'Projetor Epson 2','projetor',    'Epson',         'PowerLite X49','PAT-002','disponivel'],
    [3,'Projetor BenQ',   'projetor',    'BenQ',          'MH560',        'PAT-003','manutencao'],
    [4,'Kit Robótica A',  'kit_didatico','Lego Education','SPIKE Prime',  'PAT-010','disponivel'],
    [5,'Kit Robótica B',  'kit_didatico','Lego Education','SPIKE Prime',  'PAT-011','disponivel'],
    [6,'Notebook Dell 1', 'computador',  'Dell',          'Latitude 5420','PAT-020','disponivel'],
    [7,'Câmera Canon',    'camera',      'Canon',         'EOS Rebel T7', 'PAT-030','disponivel'],
    [8,'Caixa de Som JBL','audio',       'JBL',           'EON615',       'PAT-040','disponivel'],
  ]
  for (const [id,name,type,brand,model,patrimony,status] of equipments) {
    await query('INSERT INTO equipments (id,name,type,brand,model,patrimony,status) VALUES (?,?,?,?,?,?,?)',
      [id,name,type,brand,model,patrimony,status])
  }
  console.log('  ✅ Equipments inseridos')

  // Bookings — datas relativas a hoje
  const pad = n => String(n).padStart(2,'0')
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  const today = new Date(), t2 = new Date(today.getTime()+86400000), t3 = new Date(today.getTime()+172800000)
  const [d1,d2,d3] = [fmtDate(today),fmtDate(t2),fmtDate(t3)]

  const bookings = [
    [1,1,4,'[]',           d1,'07:30','09:00','Aula de programação',   'confirmado',1],
    [2,2,1,'[1]',          d1,'09:00','10:30','Aula de redação',       'confirmado',3],
    [3,3,7,'[]',           d1,'10:30','12:00','Aula de Ed. Física',    'confirmado',4],
    [4,4,5,'[6]',          d2,'07:30','09:00','Experimento químico',   'pendente',  1],
    [5,1,3,'[1,6]',        d2,'14:00','15:30','Aula de matemática',    'confirmado',2],
    [6,2,8,'[8]',          d3,'09:00','11:00','Apresentação cultural', 'pendente',  3],
  ]
  for (const [id,tid,rid,eids,date,st,et,purpose,status,cby] of bookings) {
    await query('INSERT INTO bookings (id,teacher_id,resource_id,equipment_ids,date,start_time,end_time,purpose,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id,tid,rid,eids,date,st,et,purpose,status,cby])
    // Preenche também booking_equipment
    const ids = JSON.parse(eids)
    for (const eid of ids) {
      await query('INSERT IGNORE INTO booking_equipment (booking_id,equipment_id) VALUES (?,?)',[id,eid])
    }
  }
  console.log('  ✅ Bookings inseridos')
  console.log('\n🎉 Seed concluído!\n')
  console.log('  👑 Admin:    admin@agendamento.com / admin123')
  console.log('  👤 Prof:     joao@agendamento.com  / prof123\n')
}

// Run standalone: node src/database/seed.js
if (process.argv[1].endsWith('seed.js')) {
  seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
}
