import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { CREATE_TABLES_SQL } from './schema';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'resohub.sqlite');

let dbInstance: SqlJsDatabase | null = null;

// Lock mechanism for thread-safe/concurrency-safe operations in Node event loop
class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          if (next) next();
        } else {
          this.locked = false;
        }
      };

      if (this.locked) {
        this.queue.push(() => resolve(release));
      } else {
        this.locked = true;
        resolve(release);
      }
    });
  }
}

export const dbMutex = new Mutex();

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run(CREATE_TABLES_SQL);
  seedDatabaseIfEmpty(dbInstance);
  saveDbToDisk();

  return dbInstance;
}

export function saveDbToDisk(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to write SQLite database to disk:', err);
  }
}

function seedDatabaseIfEmpty(db: SqlJsDatabase): void {
  const result = db.exec('SELECT COUNT(*) as count FROM users');
  const userCount = result[0]?.values[0]?.[0] as number;

  if (userCount && userCount > 0) return;

  console.log('Seeding relational SQLite database with default college data...');

  const salt = bcrypt.genSaltSync(10);
  const defaultHash = bcrypt.hashSync('password123', salt);
  const now = new Date().toISOString();

  // Users
  db.run(
    `INSERT INTO users (id, name, email, password_hash, role, department, created_at) VALUES 
    ('usr_mgr_1', 'Dr. Alok Verma (Admin/Manager)', 'manager@resohub.edu', ?, 'MANAGER', 'Central Resource Management', ?),
    ('usr_tch_1', 'Prof. Sunita Sharma', 'dr.sharma@resohub.edu', ?, 'TEACHER', 'Computer Science & Engineering', ?),
    ('usr_cr_1', 'Rahul Mehta (CR CSE-3A)', 'rahul.cse@resohub.edu', ?, 'CR', 'Computer Science & Engineering', ?),
    ('usr_std_1', 'Ananya Roy', 'ananya.ece@resohub.edu', ?, 'STUDENT', 'Electronics & Communication', ?)`,
    [defaultHash, now, defaultHash, now, defaultHash, now, defaultHash, now]
  );

  // Categories
  db.run(`INSERT INTO categories (id, name, description, icon) VALUES
    ('cat_lab', 'Laboratories', 'Computer labs, electronics labs, and research facilities', 'Laptop'),
    ('cat_aud', 'Auditoriums & Halls', 'Large venues for conferences, symposiums, and college events', 'Users'),
    ('cat_cls', 'Smart Classrooms', 'Lectures halls equipped with projectors and audio systems', 'GraduationCap'),
    ('cat_eqp', 'Portable Equipment', 'Projectors, PA systems, cameras, and laptops for checkout', 'Projector'),
    ('cat_mtg', 'Conference Rooms', 'Meeting rooms for departmental discussions and faculty meets', 'Briefcase')`);

  // Resources
  db.run(`INSERT INTO resources (id, name, category_id, category_name, location, capacity, status, description, image_url, created_at, updated_at) VALUES
    ('res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'cat_lab', 'Laboratories', 'Building A - 2nd Floor (Room A-204)', 60, 'AVAILABLE', 'High-performance workstation lab equipped with GPU machines and dual monitors for software development and AI labs.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60', ?, ?),
    ('res_aud_main', 'Dr. APJ Abdul Kalam Main Auditorium', 'cat_aud', 'Auditoriums & Halls', 'Central Campus - Administrative Block', 500, 'AVAILABLE', 'Grand auditorium with state-of-the-art acoustic design, central AC, stage lighting, and professional sound system.', 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=60', ?, ?),
    ('res_sem_1', 'Aryabhata Seminar Hall', 'cat_aud', 'Auditoriums & Halls', 'Building B - 1st Floor', 150, 'AVAILABLE', 'Tiered seating seminar hall ideal for guest lectures, workshops, and project presentations.', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=60', ?, ?),
    ('res_cls_201', 'Smart Classroom A-201', 'cat_cls', 'Smart Classrooms', 'Building A - 2nd Floor', 75, 'AVAILABLE', 'Interactive digital classroom with smart touchscreen display, lecture recording setup, and ergonomic seating.', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=60', ?, ?),
    ('res_lab_ece', 'Embedded Systems & Robotics Lab', 'cat_lab', 'Laboratories', 'Building C - Ground Floor', 45, 'MAINTENANCE', 'Specialized lab for IoT, microcontroller development, FPGA boards, and signal processing experiments.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60', ?, ?),
    ('res_proj_portable', 'Mobile 4K Laser Projector Unit #2', 'cat_eqp', 'Portable Equipment', 'Equipment Store Room (Admin Office)', 1, 'AVAILABLE', 'Ultra-portable 4000 lumens laser projector with portable 120-inch tripod screen and wireless HDMI receiver.', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=60', ?, ?)`,
    [now, now, now, now, now, now, now, now, now, now, now, now]);

  // Specifications
  db.run(`INSERT INTO resource_specifications (resource_id, system_count, laptop_count, has_projector, has_screen, has_ac, has_internet, has_audio_system, has_microphones, has_smart_board, installed_software, other_notes) VALUES
    ('res_lab_3', 60, 10, 1, 1, 1, 1, 0, 0, 0, '["VSCode", "Python 3.11", "CUDA Toolkit", "Docker", "MySQL Workbench", "MATLAB"]', 'Dual monitors'),
    ('res_aud_main', 0, 0, 1, 1, 1, 1, 1, 1, 0, '[]', 'Podium mic, 4 cordless mics, Dolby 7.1 audio.'),
    ('res_sem_1', 0, 0, 1, 1, 1, 1, 1, 1, 1, '[]', 'Tiered seating.'),
    ('res_cls_201', 0, 0, 1, 1, 1, 1, 0, 0, 1, '[]', 'Lecture recording setup.'),
    ('res_lab_ece', 30, 0, 1, 0, 1, 1, 0, 0, 0, '[]', 'Oscilloscopes, Soldering Stations, Kits on site.'),
    ('res_proj_portable', 0, 0, 1, 1, 0, 1, 0, 0, 0, '[]', 'Includes HDMI cable, wireless dongle, carrying case.')`);

  // Timetable
  db.run(`INSERT INTO timetable_entries (id, resource_id, resource_name, day_of_week, start_time, end_time, class_section, subject, faculty, academic_year) VALUES
    ('tt_1', 'res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Monday', '09:00', '11:00', 'CSE-3A', 'Data Structures Lab (CS301L)', 'Prof. Sunita Sharma', '2026-2027 (Sem V)'),
    ('tt_2', 'res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Monday', '11:30', '13:30', 'CSE-3B', 'Database Management Systems Lab (CS304L)', 'Dr. Rajesh Gupta', '2026-2027 (Sem V)'),
    ('tt_3', 'res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Tuesday', '10:00', '12:00', 'IT-2A', 'Object Oriented Programming Lab (IT202L)', 'Prof. Meenakshi Sundaram', '2026-2027 (Sem III)'),
    ('tt_4', 'res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Wednesday', '14:00', '16:00', 'CSE-4A', 'Machine Learning & AI Lab (CS402L)', 'Dr. Sunita Sharma', '2026-2027 (Sem VII)'),
    ('tt_5', 'res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Thursday', '09:00', '11:00', 'CSE-3A', 'Web Technologies Lab (CS308L)', 'Prof. Vikas Nanda', '2026-2027 (Sem V)'),
    ('tt_6', 'res_cls_201', 'Smart Classroom A-201', 'Monday', '09:00', '10:00', 'CSE-3A', 'Operating Systems (CS302)', 'Dr. Amit Patel', '2026-2027 (Sem V)'),
    ('tt_7', 'res_cls_201', 'Smart Classroom A-201', 'Tuesday', '11:00', '12:00', 'CSE-3A', 'Theory of Computation (CS303)', 'Prof. Sunita Sharma', '2026-2027 (Sem V)')`);

  // Sample Bookings
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  db.run(`INSERT INTO bookings (id, resource_id, resource_name, resource_location, user_id, user_name, user_role, user_email, user_department, date, start_time, end_time, purpose, description, expected_count, required_equipment, status, requested_at, reviewed_at, reviewed_by) VALUES
    ('bk_101', 'res_lab_3', 'Computer Lab 3 (Advanced AI & Web Dev)', 'Building A - 2nd Floor (Room A-204)', 'usr_cr_1', 'Rahul Mehta (CR CSE-3A)', 'CR', 'rahul.cse@resohub.edu', 'Computer Science & Engineering', ?, '14:00', '16:00', 'Hackathon Practice & Code Review Session', 'Students assembling for hackathon practice.', 35, '["Projector", "Internet", "AC"]', 'APPROVED', ?, ?, 'Dr. Alok Verma'),
    ('bk_102', 'res_aud_main', 'Dr. APJ Abdul Kalam Main Auditorium', 'Central Campus - Administrative Block', 'usr_tch_1', 'Prof. Sunita Sharma', 'TEACHER', 'dr.sharma@resohub.edu', 'Computer Science & Engineering', ?, '10:00', '13:00', 'Departmental Guest Lecture on Quantum Computing', 'Keynote speech by invited speaker from IIT Delhi.', 300, '["Audio System", "Microphones", "Projector", "AC"]', 'PENDING', ?, NULL, NULL)`,
    [todayStr, now, now, tomorrowStr, now]);

  // Notifications
  db.run(`INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, booking_id) VALUES
    ('notif_1', 'usr_cr_1', 'Booking Request Approved! 🎉', 'Your booking for Computer Lab 3 has been APPROVED by Dr. Alok Verma.', 'APPROVAL', 0, ?, 'bk_101'),
    ('notif_2', 'usr_mgr_1', 'New Booking Request Received', 'Prof. Sunita Sharma requested Main Auditorium. Approval pending.', 'REQUEST_CREATED', 0, ?, 'bk_102')`,
    [now, now]);
}

// SQL Query helper that maps sql.js output arrays to clean objects
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runQuery(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  saveDbToDisk();
}
