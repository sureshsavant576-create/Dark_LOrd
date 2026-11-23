const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(process.env.LABLINK_DB_PATH || path.join(dataDir, 'lablink.sqlite'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(`
CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, code TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER NOT NULL REFERENCES departments(id), role TEXT NOT NULL DEFAULT 'student');
CREATE TABLE IF NOT EXISTS equipment (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, department_id INTEGER NOT NULL REFERENCES departments(id), location TEXT NOT NULL, description TEXT NOT NULL, specs TEXT NOT NULL DEFAULT '', total_units INTEGER NOT NULL DEFAULT 1 CHECK(total_units > 0), training_required INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'available', tags TEXT NOT NULL DEFAULT '[]', operational_status TEXT NOT NULL DEFAULT 'operational', restrictions TEXT NOT NULL DEFAULT '', max_hours INTEGER NOT NULL DEFAULT 8, equivalent_group TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, description TEXT NOT NULL, deadline TEXT NOT NULL, requirements TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), project_id INTEGER NOT NULL REFERENCES projects(id), equipment_id INTEGER NOT NULL REFERENCES equipment(id), start_at TEXT NOT NULL, end_at TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', priority_score REAL NOT NULL DEFAULT 0, fairness_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_by INTEGER REFERENCES users(id), review_note TEXT NOT NULL DEFAULT '', CHECK(end_at > start_at));
CREATE TABLE IF NOT EXISTS training (user_id INTEGER NOT NULL REFERENCES users(id), equipment_id INTEGER NOT NULL REFERENCES equipment(id), completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,equipment_id));
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS usage_events (id INTEGER PRIMARY KEY, equipment_id INTEGER NOT NULL REFERENCES equipment(id), user_id INTEGER REFERENCES users(id), booking_id INTEGER REFERENCES bookings(id), scheduled_start TEXT, scheduled_end TEXT, actual_start TEXT, actual_end TEXT, source TEXT NOT NULL CHECK(source IN ('simulated','verified')), status TEXT NOT NULL DEFAULT 'complete', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS maintenance_logs (id INTEGER PRIMARY KEY, equipment_id INTEGER NOT NULL REFERENCES equipment(id), actor_id INTEGER REFERENCES users(id), note TEXT NOT NULL, downtime_start TEXT NOT NULL, downtime_end TEXT, source TEXT NOT NULL DEFAULT 'verified', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), event_type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, entity_type TEXT NOT NULL DEFAULT 'system', entity_id INTEGER, read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id,event_type,entity_type,entity_id,created_at));
CREATE INDEX IF NOT EXISTS bookings_equipment_slot ON bookings(equipment_id,start_at,end_at,status);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_user_exact_slot ON bookings(user_id,equipment_id,start_at,end_at) WHERE status IN ('pending','approved');
CREATE INDEX IF NOT EXISTS bookings_user_date ON bookings(user_id,created_at);
`);
for(const [column,definition] of [['operational_status',"TEXT NOT NULL DEFAULT 'operational'"],['restrictions',"TEXT NOT NULL DEFAULT ''"],['max_hours','INTEGER NOT NULL DEFAULT 8'],['equivalent_group',"TEXT NOT NULL DEFAULT ''"]]){
  if(!db.prepare('PRAGMA table_info(equipment)').all().some(c=>c.name===column)) db.exec(`ALTER TABLE equipment ADD COLUMN ${column} ${definition}`);
}

function seed() {
  if (db.prepare('SELECT count(*) n FROM equipment').get().n) return;
  const departments = [['Electronics & Communication','ECE'],['Computer Science','CSE'],['Mechanical Engineering','ME'],['Physics','PHY'],['Design & Innovation','DES']];
  const dep = db.prepare('INSERT INTO departments(name,code) VALUES (?,?)'); departments.forEach(x => dep.run(...x));
  const d = Object.fromEntries(db.prepare('SELECT id,name FROM departments').all().map(x => [x.name,x.id]));
  const user = db.prepare('INSERT INTO users(name,department_id,role) VALUES (?,?,?)');
  [['Aarav Sharma',d['Electronics & Communication'],'student'],['Priya Nair',d['Computer Science'],'student'],['Kabir Mehta',d['Mechanical Engineering'],'student'],['Ananya Iyer',d['Physics'],'student'],['Dr. Meera Rao',d['Electronics & Communication'],'faculty'],['Dr. Rohan Das',d['Computer Science'],'faculty'],['LabLink Admin',d['Design & Innovation'],'admin']].forEach(x=>user.run(...x));
  const equip = db.prepare('INSERT INTO equipment(name,category,department_id,location,description,specs,total_units,training_required,status,tags) VALUES (?,?,?,?,?,?,?,?,?,?)');
  [
    ['ESP32 Development Kit','Development boards',d['Electronics & Communication'],'ECE Lab · Room 204','Wi-Fi and Bluetooth enabled microcontroller board for connected prototypes.','Dual-core 240 MHz · Wi-Fi · Bluetooth · 30 GPIO',12,0,'available',['iot','embedded','microcontroller','wireless']],
    ['Oscilloscope · 100 MHz','Test & measurement',d['Electronics & Communication'],'ECE Lab · Room 210','Four-channel digital oscilloscope for signal analysis and circuit debugging.','4 channels · 100 MHz · 1 GS/s',3,1,'available',['electronics','signals','circuit','measurement']],
    ['Arduino Uno R4','Development boards',d['Electronics & Communication'],'Open Hardware Bench · Room 204','Rapid prototyping microcontroller board with USB-C and LED matrix.','48 MHz · USB-C · 14 digital I/O',10,0,'available',['iot','embedded','microcontroller']],
    ['Jetson Nano Developer Kit','AI & compute',d['Computer Science'],'AI Lab · Room 318','Edge AI development kit for computer vision and robotics projects.','128-core GPU · 4 GB RAM · 4 USB ports',4,1,'available',['ai','computer vision','robotics','edge']],
    ['GPU Workstation','AI & compute',d['Computer Science'],'AI Lab · Room 320','High-performance workstation for model training and rendering.','RTX 4070 · 32 GB RAM · Linux',2,0,'available',['ai','machine learning','compute','gpu']],
    ['3D Printer · Prusa MK4','Fabrication',d['Mechanical Engineering'],'Maker Lab · Ground floor','Reliable FDM printer for functional prototypes and enclosures.','250 × 210 × 220 mm · PLA/PETG/ABS',2,1,'available',['3d print','prototype','fabrication','design']],
    ['CNC Router','Fabrication',d['Mechanical Engineering'],'Workshop · Bay 3','Three-axis CNC router for milling sheet materials and soft metals.','600 × 400 mm · 3-axis',1,1,'available',['fabrication','cnc','manufacturing']],
    ['Thermal Camera','Sensors & imaging',d['Physics'],'Applied Physics Lab · Room 115','Infrared imaging camera for thermal studies and diagnostics.','-20°C to 650°C · 320 × 240',2,1,'available',['thermal','imaging','sensor']],
    ['Soldering Station','Electronics & tools',d['Electronics & Communication'],'ECE Lab · Room 204','Temperature-controlled soldering iron and safe fume extraction.','200–480°C · lead-free ready',5,0,'available',['electronics','soldering','prototype']],
    ['Laser Cutter','Fabrication',d['Design & Innovation'],'Design Studio · Room 012','CO₂ laser for precision cutting and engraving of workshop materials.','600 × 400 mm · 60 W',1,1,'available',['fabrication','laser','design','prototype']]
  ].forEach(x=>equip.run(x[0],x[1],x[2],x[3],x[4],x[5],x[6],x[7],x[8],JSON.stringify(x[9])));
  const project=db.prepare('INSERT INTO projects(user_id,name,description,deadline,requirements) VALUES (?,?,?,?,?)');
  const today=new Date(); const date=n=>{const v=new Date(today);v.setDate(v.getDate()+n);return v.toISOString().slice(0,10)};
  project.run(1,'Smart greenhouse monitor','An IoT greenhouse system measuring temperature and humidity with wireless data logging.',date(12),'["iot","sensor","microcontroller"]');
  project.run(2,'Edge vision rover','A small rover that detects and classifies objects locally using a camera.',date(19),'["robotics","computer vision","edge"]');
  project.run(3,'Rapid prototype enclosure','Design and fabricate a durable enclosure for a wearable device.',date(9),'["3d print","prototype","design"]');
  project.run(4,'Thermal materials study','Compare heat dissipation across material samples with infrared imaging.',date(25),'["thermal","imaging","sensor"]');
  db.prepare('INSERT INTO training(user_id,equipment_id) VALUES (1,2),(2,4),(3,6),(3,7),(4,8),(1,10)').run();
}
seed();
db.exec(`CREATE TRIGGER IF NOT EXISTS notify_booking_created AFTER INSERT ON bookings BEGIN INSERT INTO notifications(user_id,event_type,title,message,entity_type,entity_id) VALUES(NEW.user_id,'booking_submitted','Request submitted','Your equipment request is pending approval.','booking',NEW.id); INSERT INTO notifications(user_id,event_type,title,message,entity_type,entity_id) SELECT id,'booking_pending','New request to review','A student submitted an equipment request.','booking',NEW.id FROM users WHERE role IN ('faculty','hod','admin'); END; CREATE TRIGGER IF NOT EXISTS notify_booking_status AFTER UPDATE OF status ON bookings WHEN OLD.status<>NEW.status BEGIN INSERT INTO notifications(user_id,event_type,title,message,entity_type,entity_id) VALUES(NEW.user_id,'booking_'||NEW.status,'Request '||NEW.status,'Your booking request status changed to '||NEW.status||'. '||coalesce(NEW.review_note,''),'booking',NEW.id); END; CREATE TRIGGER IF NOT EXISTS notify_equipment_updated AFTER UPDATE OF operational_status,restrictions,total_units,training_required ON equipment BEGIN INSERT INTO notifications(user_id,event_type,title,message,entity_type,entity_id) SELECT id,'equipment_updated','Equipment availability changed',NEW.name||' status or access requirements were updated.','equipment',NEW.id FROM users WHERE role IN ('student','project_team'); END; CREATE TRIGGER IF NOT EXISTS notify_training_verified AFTER INSERT ON training BEGIN INSERT INTO notifications(user_id,event_type,title,message,entity_type,entity_id) VALUES(NEW.user_id,'training_verified','Training verified','Your equipment safety training has been verified.','equipment',NEW.equipment_id); END;`);
// Add demo personas to databases created by earlier prototype versions.
const demoDepartment=db.prepare('SELECT id FROM departments WHERE code=?');
for(const [name,code,role] of [['Project Team Atlas','CSE','project_team'],['Lab Technician','ECE','technician'],['Head of Department','DES','hod']]){
  if(!db.prepare('SELECT 1 FROM users WHERE role=?').get(role)) db.prepare('INSERT INTO users(name,department_id,role) VALUES(?,?,?)').run(name,demoDepartment.get(code).id,role);
}
if(db.prepare('SELECT count(*) n FROM usage_events').get().n===0){const seedUsage=db.prepare("INSERT INTO usage_events(equipment_id,scheduled_start,scheduled_end,actual_start,actual_end,source,status) VALUES(?,?,?,NULL,NULL,'simulated','complete')");const counts=[8,5,7,10,14,4,2,3,9,2];for(const e of db.prepare('SELECT id FROM equipment ORDER BY id').all()){for(let i=0;i<(counts[e.id-1]||2);i++){const end=new Date();end.setDate(end.getDate()-((i*3+e.id)%28)-1);end.setHours(15,0,0,0);const start=new Date(end);start.setHours(start.getHours()-1-(i%3));seedUsage.run(e.id,start.toISOString(),end.toISOString());}}}
module.exports={db};
