import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Resource,
  ResourceCategory,
  TimetableEntry,
  BookingRequest,
  MaintenanceSchedule,
  NotificationItem,
} from '../types';

interface DatabaseSchema {
  users: User[];
  userPasswords: Record<string, string>; // userId -> passwordHash
  categories: ResourceCategory[];
  resources: Resource[];
  timetable: TimetableEntry[];
  bookings: BookingRequest[];
  maintenanceSchedules: MaintenanceSchedule[];
  notifications: NotificationItem[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Memory cache
let db: DatabaseSchema = {
  users: [],
  userPasswords: {},
  categories: [],
  resources: [],
  timetable: [],
  bookings: [],
  maintenanceSchedules: [],
  notifications: [],
};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveDb(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database to disk:', err);
  }
}

export function loadDb(): void {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      console.log('Successfully loaded database from disk.');
      return;
    } catch (err) {
      console.error('Error parsing db.json, generating fresh seed data:', err);
    }
  }

  seedDb();
}

function seedDb(): void {
  console.log('Seeding fresh ResoHub database...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  const users: User[] = [
    {
      id: 'usr_mgr_1',
      name: 'Dr. Alok Verma (Admin/Manager)',
      email: 'manager@resohub.edu',
      role: 'MANAGER',
      department: 'Central Resource Management',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr_tch_1',
      name: 'Prof. Sunita Sharma',
      email: 'dr.sharma@resohub.edu',
      role: 'TEACHER',
      department: 'Computer Science & Engineering',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr_cr_1',
      name: 'Rahul Mehta (CR CSE-3A)',
      email: 'rahul.cse@resohub.edu',
      role: 'CR',
      department: 'Computer Science & Engineering',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr_std_1',
      name: 'Ananya Roy',
      email: 'ananya.ece@resohub.edu',
      role: 'STUDENT',
      department: 'Electronics & Communication',
      createdAt: new Date().toISOString(),
    },
  ];

  const userPasswords: Record<string, string> = {
    usr_mgr_1: defaultPasswordHash,
    usr_tch_1: defaultPasswordHash,
    usr_cr_1: defaultPasswordHash,
    usr_std_1: defaultPasswordHash,
  };

  const categories: ResourceCategory[] = [
    {
      id: 'cat_lab',
      name: 'Laboratories',
      description: 'Computer labs, electronics labs, and research facilities',
      icon: 'Laptop',
    },
    {
      id: 'cat_aud',
      name: 'Auditoriums & Halls',
      description: 'Large venues for conferences, symposiums, and college events',
      icon: 'Users',
    },
    {
      id: 'cat_cls',
      name: 'Smart Classrooms',
      description: 'Lectures halls equipped with projectors and audio systems',
      icon: 'GraduationCap',
    },
    {
      id: 'cat_eqp',
      name: 'Portable Equipment',
      description: 'Projectors, PA systems, cameras, and laptops for checkout',
      icon: 'Projector',
    },
    {
      id: 'cat_mtg',
      name: 'Conference Rooms',
      description: 'Meeting rooms for departmental discussions and faculty meets',
      icon: 'Briefcase',
    },
  ];

  const resources: Resource[] = [
    {
      id: 'res_lab_3',
      name: 'Computer Lab 3 (Advanced AI & Web Dev)',
      categoryId: 'cat_lab',
      categoryName: 'Laboratories',
      location: 'Building A - 2nd Floor (Room A-204)',
      capacity: 60,
      status: 'AVAILABLE',
      description: 'High-performance workstation lab equipped with GPU machines and dual monitors for software development and AI labs.',
      specifications: {
        systemCount: 60,
        laptopCount: 10,
        hasProjector: true,
        hasScreen: true,
        hasAC: true,
        hasInternet: true,
        installedSoftware: ['VSCode', 'Python 3.11', 'CUDA Toolkit', 'Docker', 'MySQL Workbench', 'MATLAB'],
      },
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'res_aud_main',
      name: 'Dr. APJ Abdul Kalam Main Auditorium',
      categoryId: 'cat_aud',
      categoryName: 'Auditoriums & Halls',
      location: 'Central Campus - Administrative Block',
      capacity: 500,
      status: 'AVAILABLE',
      description: 'Grand auditorium with state-of-the-art acoustic design, central AC, stage lighting, and professional sound system.',
      specifications: {
        hasProjector: true,
        hasScreen: true,
        hasAC: true,
        hasAudioSystem: true,
        hasMicrophones: true,
        hasInternet: true,
        otherNotes: 'Podium microphone, 4 cordless mics, Dolby 7.1 audio system.',
      },
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'res_sem_1',
      name: 'Aryabhata Seminar Hall',
      categoryId: 'cat_aud',
      categoryName: 'Auditoriums & Halls',
      location: 'Building B - 1st Floor',
      capacity: 150,
      status: 'AVAILABLE',
      description: 'Tiered seating seminar hall ideal for guest lectures, workshops, and project presentations.',
      specifications: {
        hasProjector: true,
        hasScreen: true,
        hasAC: true,
        hasAudioSystem: true,
        hasMicrophones: true,
        hasSmartBoard: true,
        hasInternet: true,
      },
      imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'res_cls_201',
      name: 'Smart Classroom A-201',
      categoryId: 'cat_cls',
      categoryName: 'Smart Classrooms',
      location: 'Building A - 2nd Floor',
      capacity: 75,
      status: 'AVAILABLE',
      description: 'Interactive digital classroom with smart touchscreen display, lecture recording setup, and ergonomic seating.',
      specifications: {
        hasProjector: true,
        hasScreen: true,
        hasSmartBoard: true,
        hasAC: true,
        hasInternet: true,
      },
      imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'res_lab_ece',
      name: 'Embedded Systems & Robotics Lab',
      categoryId: 'cat_lab',
      categoryName: 'Laboratories',
      location: 'Building C - Ground Floor',
      capacity: 45,
      status: 'MAINTENANCE',
      description: 'Specialized lab for IoT, microcontroller development, FPGA boards, and signal processing experiments.',
      specifications: {
        systemCount: 30,
        hasProjector: true,
        hasAC: true,
        hasInternet: true,
        otherNotes: 'Oscilloscopes, Soldering Stations, Arduino & Raspberry Pi kits on site.',
      },
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'res_proj_portable',
      name: 'Mobile 4K Laser Projector Unit #2',
      categoryId: 'cat_eqp',
      categoryName: 'Portable Equipment',
      location: 'Equipment Store Room (Admin Office)',
      capacity: 1,
      status: 'AVAILABLE',
      description: 'Ultra-portable 4000 lumens laser projector with portable 120-inch tripod screen and wireless HDMI receiver.',
      specifications: {
        hasProjector: true,
        hasScreen: true,
        hasInternet: true,
        otherNotes: 'Includes HDMI cable, wireless dongle, and carrying case.',
      },
      imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Timetable entries (Mon-Fri regular schedule)
  const timetable: TimetableEntry[] = [
    // Computer Lab 3 Timetable
    {
      id: 'tt_1',
      resourceId: 'res_lab_3',
      resourceName: 'Computer Lab 3 (Advanced AI & Web Dev)',
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '11:00',
      classSection: 'CSE-3A',
      subject: 'Data Structures Lab (CS301L)',
      faculty: 'Prof. Sunita Sharma',
      academicYear: '2026-2027 (Sem V)',
    },
    {
      id: 'tt_2',
      resourceId: 'res_lab_3',
      resourceName: 'Computer Lab 3 (Advanced AI & Web Dev)',
      dayOfWeek: 'Monday',
      startTime: '11:30',
      endTime: '13:30',
      classSection: 'CSE-3B',
      subject: 'Database Management Systems Lab (CS304L)',
      faculty: 'Dr. Rajesh Gupta',
      academicYear: '2026-2027 (Sem V)',
    },
    {
      id: 'tt_3',
      resourceId: 'res_lab_3',
      resourceName: 'Computer Lab 3 (Advanced AI & Web Dev)',
      dayOfWeek: 'Tuesday',
      startTime: '10:00',
      endTime: '12:00',
      classSection: 'IT-2A',
      subject: 'Object Oriented Programming Lab (IT202L)',
      faculty: 'Prof. Meenakshi Sundaram',
      academicYear: '2026-2027 (Sem III)',
    },
    {
      id: 'tt_4',
      resourceId: 'res_lab_3',
      resourceName: 'Computer Lab 3 (Advanced AI & Web Dev)',
      dayOfWeek: 'Wednesday',
      startTime: '14:00',
      endTime: '16:00',
      classSection: 'CSE-4A',
      subject: 'Machine Learning & AI Lab (CS402L)',
      faculty: 'Dr. Sunita Sharma',
      academicYear: '2026-2027 (Sem VII)',
    },
    {
      id: 'tt_5',
      resourceId: 'res_lab_3',
      resourceName: 'Computer Lab 3 (Advanced AI & Web Dev)',
      dayOfWeek: 'Thursday',
      startTime: '09:00',
      endTime: '11:00',
      classSection: 'CSE-3A',
      subject: 'Web Technologies Lab (CS308L)',
      faculty: 'Prof. Vikas Nanda',
      academicYear: '2026-2027 (Sem V)',
    },
    // Smart Classroom A-201
    {
      id: 'tt_6',
      resourceId: 'res_cls_201',
      resourceName: 'Smart Classroom A-201',
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      classSection: 'CSE-3A',
      subject: 'Operating Systems (CS302)',
      faculty: 'Dr. Amit Patel',
      academicYear: '2026-2027 (Sem V)',
    },
    {
      id: 'tt_7',
      resourceId: 'res_cls_201',
      resourceName: 'Smart Classroom A-201',
      dayOfWeek: 'Tuesday',
      startTime: '11:00',
      endTime: '12:00',
      classSection: 'CSE-3A',
      subject: 'Theory of Computation (CS303)',
      faculty: 'Prof. Sunita Sharma',
      academicYear: '2026-2027 (Sem V)',
    },
  ];

  // Helper date generators for current & upcoming dates
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const nextWeekObj = new Date();
  nextWeekObj.setDate(nextWeekObj.getDate() + 3);
  const nextWeekStr = nextWeekObj.toISOString().split('T')[0];

  const bookings: BookingRequest[] = [
    {
      id: 'bk_101',
      resourceId: 'res_lab_3',
      resourceName: 'Computer Lab 3 (Advanced AI & Web Dev)',
      resourceLocation: 'Building A - 2nd Floor (Room A-204)',
      userId: 'usr_cr_1',
      userName: 'Rahul Mehta (CR CSE-3A)',
      userRole: 'CR',
      userEmail: 'rahul.cse@resohub.edu',
      userDepartment: 'Computer Science & Engineering',
      date: todayStr,
      startTime: '14:00',
      endTime: '16:00',
      purpose: 'Hackathon Practice & Code Review Session',
      description: 'Students from CSE-3A assembling to test project deployment for the upcoming inter-college hackathon.',
      expectedCount: 35,
      requiredEquipment: ['Projector', 'Internet', 'AC'],
      status: 'APPROVED',
      requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      reviewedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      reviewedBy: 'Dr. Alok Verma',
    },
    {
      id: 'bk_102',
      resourceId: 'res_aud_main',
      resourceName: 'Dr. APJ Abdul Kalam Main Auditorium',
      resourceLocation: 'Central Campus - Administrative Block',
      userId: 'usr_tch_1',
      userName: 'Prof. Sunita Sharma',
      userRole: 'TEACHER',
      userEmail: 'dr.sharma@resohub.edu',
      userDepartment: 'Computer Science & Engineering',
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '13:00',
      purpose: 'Departmental Guest Lecture on Quantum Computing',
      description: 'Keynote speech by invited speaker from IIT Delhi for all 3rd and 4th year CSE students.',
      expectedCount: 300,
      requiredEquipment: ['Audio System', 'Microphones', 'Projector', 'AC'],
      status: 'PENDING',
      requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'bk_103',
      resourceId: 'res_sem_1',
      resourceName: 'Aryabhata Seminar Hall',
      resourceLocation: 'Building B - 1st Floor',
      userId: 'usr_std_1',
      userName: 'Ananya Roy',
      userRole: 'STUDENT',
      userEmail: 'ananya.ece@resohub.edu',
      userDepartment: 'Electronics & Communication',
      date: nextWeekStr,
      startTime: '14:00',
      endTime: '16:00',
      purpose: 'Robotics Club Orientation & Workshop',
      description: 'Interactive introduction for 1st year students joining the Robotics student chapter.',
      expectedCount: 80,
      requiredEquipment: ['Projector', 'Smart Board', 'Microphones'],
      status: 'PENDING',
      requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  const maintenanceSchedules: MaintenanceSchedule[] = [
    {
      id: 'maint_1',
      resourceId: 'res_lab_ece',
      resourceName: 'Embedded Systems & Robotics Lab',
      title: 'Oscilloscope Calibration & Network Wiring Maintenance',
      startDate: todayStr,
      endDate: tomorrowStr,
      startTime: '08:00',
      endTime: '18:00',
      reason: 'Scheduled hardware servicing and upgrading lab network switches.',
      createdAt: new Date().toISOString(),
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_1',
      userId: 'usr_cr_1',
      title: 'Booking Request Approved! 🎉',
      message: `Your booking for Computer Lab 3 on ${todayStr} (14:00 - 16:00) has been APPROVED by Dr. Alok Verma.`,
      type: 'APPROVAL',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      bookingId: 'bk_101',
    },
    {
      id: 'notif_2',
      userId: 'usr_mgr_1',
      title: 'New Booking Request Received',
      message: `Prof. Sunita Sharma requested Main Auditorium for ${tomorrowStr} (10:00 - 13:00). Approval pending.`,
      type: 'REQUEST_CREATED',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      bookingId: 'bk_102',
    },
  ];

  db = {
    users,
    userPasswords,
    categories,
    resources,
    timetable,
    bookings,
    maintenanceSchedules,
    notifications,
  };

  saveDb();
}

// Data access API
export const dbStore = {
  getUsers: () => db.users,
  getUserById: (id: string) => db.users.find((u) => u.id === id),
  getUserByEmail: (email: string) => db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  getUserPasswordHash: (userId: string) => db.userPasswords[userId],
  
  createUser: (user: User, passwordHash: string) => {
    db.users.push(user);
    db.userPasswords[user.id] = passwordHash;
    saveDb();
    return user;
  },

  getCategories: () => db.categories,
  
  getResources: () => db.resources,
  getResourceById: (id: string) => db.resources.find((r) => r.id === id),
  
  createResource: (resource: Resource) => {
    db.resources.push(resource);
    saveDb();
    return resource;
  },

  updateResource: (id: string, updates: Partial<Resource>) => {
    const idx = db.resources.findIndex((r) => r.id === id);
    if (idx !== -1) {
      db.resources[idx] = {
        ...db.resources[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveDb();
      return db.resources[idx];
    }
    return null;
  },

  deleteResource: (id: string) => {
    db.resources = db.resources.filter((r) => r.id !== id);
    // Also remove related timetable entries and maintenance
    db.timetable = db.timetable.filter((t) => t.resourceId !== id);
    saveDb();
  },

  getTimetable: () => db.timetable,
  getTimetableForResource: (resourceId: string) => db.timetable.filter((t) => t.resourceId === resourceId),
  
  addTimetableEntry: (entry: TimetableEntry) => {
    db.timetable.push(entry);
    saveDb();
    return entry;
  },

  deleteTimetableEntry: (id: string) => {
    db.timetable = db.timetable.filter((t) => t.id !== id);
    saveDb();
  },

  getBookings: () => db.bookings,
  getBookingById: (id: string) => db.bookings.find((b) => b.id === id),
  getBookingsForUser: (userId: string) => db.bookings.filter((b) => b.userId === userId),
  getBookingsForResource: (resourceId: string) => db.bookings.filter((b) => b.resourceId === resourceId),

  createBookingRequest: (booking: BookingRequest) => {
    db.bookings.push(booking);
    // Send notification to manager
    const managers = db.users.filter((u) => u.role === 'MANAGER');
    managers.forEach((m) => {
      db.notifications.push({
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId: m.id,
        title: 'New Booking Request',
        message: `${booking.userName} (${booking.userRole}) requested ${booking.resourceName} on ${booking.date} (${booking.startTime} - ${booking.endTime}).`,
        type: 'REQUEST_CREATED',
        isRead: false,
        createdAt: new Date().toISOString(),
        bookingId: booking.id,
      });
    });
    saveDb();
    return booking;
  },

  updateBookingStatus: (id: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED', reviewerName?: string, reason?: string) => {
    const booking = db.bookings.find((b) => b.id === id);
    if (!booking) return null;

    booking.status = status;
    booking.reviewedAt = new Date().toISOString();
    if (reviewerName) booking.reviewedBy = reviewerName;
    if (reason) booking.rejectionReason = reason;

    // Send notification to user
    const notifTitle = status === 'APPROVED' ? 'Booking Approved! 🎉' : status === 'REJECTED' ? 'Booking Request Declined' : 'Booking Cancelled';
    const notifMsg = status === 'APPROVED'
      ? `Your booking for ${booking.resourceName} on ${booking.date} (${booking.startTime} - ${booking.endTime}) has been APPROVED.`
      : status === 'REJECTED'
      ? `Your booking for ${booking.resourceName} on ${booking.date} was rejected. Reason: ${reason || 'No reason provided.'}`
      : `Your booking for ${booking.resourceName} on ${booking.date} was cancelled.`;

    db.notifications.push({
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: booking.userId,
      title: notifTitle,
      message: notifMsg,
      type: status === 'APPROVED' ? 'APPROVAL' : status === 'REJECTED' ? 'REJECTION' : 'SYSTEM',
      isRead: false,
      createdAt: new Date().toISOString(),
      bookingId: booking.id,
    });

    saveDb();
    return booking;
  },

  getMaintenanceSchedules: () => db.maintenanceSchedules,
  createMaintenanceSchedule: (schedule: MaintenanceSchedule) => {
    db.maintenanceSchedules.push(schedule);
    // Also mark resource as MAINTENANCE
    const resource = db.resources.find((r) => r.id === schedule.resourceId);
    if (resource) {
      resource.status = 'MAINTENANCE';
    }
    saveDb();
    return schedule;
  },

  getNotificationsForUser: (userId: string) =>
    db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),

  markNotificationAsRead: (notificationId: string) => {
    const notif = db.notifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
      saveDb();
    }
  },

  markAllNotificationsAsRead: (userId: string) => {
    db.notifications.forEach((n) => {
      if (n.userId === userId) n.isRead = true;
    });
    saveDb();
  },
};

// Initialize DB on module import
loadDb();
