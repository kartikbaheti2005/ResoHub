export type UserRole = 'MANAGER' | 'TEACHER' | 'STUDENT' | 'CR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  createdAt: string;
}

export type ResourceStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE';

export interface ResourceSpecification {
  systemCount?: number;
  laptopCount?: number;
  hasProjector?: boolean;
  hasScreen?: boolean;
  hasAC?: boolean;
  hasInternet?: boolean;
  hasAudioSystem?: boolean;
  hasMicrophones?: boolean;
  hasSmartBoard?: boolean;
  installedSoftware?: string[];
  otherNotes?: string;
  [key: string]: any;
}

export interface ResourceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Resource {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  location: string;
  capacity: number;
  status: ResourceStatus;
  description: string;
  specifications: ResourceSpecification;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimetableEntry {
  id: string;
  resourceId: string;
  resourceName: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  classSection: string; // e.g., "CSE-3A"
  subject: string;
  faculty: string;
  academicYear: string;
}

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface BookingRequest {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceLocation: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userEmail: string;
  userDepartment: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "09:00"
  endTime: string;   // "11:00"
  purpose: string;
  description: string;
  expectedCount: number;
  requiredEquipment: string[];
  status: BookingStatus;
  rejectionReason?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface MaintenanceSchedule {
  id: string;
  resourceId: string;
  resourceName: string;
  title: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD"
  startTime: string; // "08:00"
  endTime: string;   // "18:00"
  reason: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'APPROVAL' | 'REJECTION' | 'REQUEST_CREATED' | 'MAINTENANCE' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  bookingId?: string;
}

export interface TimeSlotStatus {
  timeSlot: string; // "09:00 - 10:00"
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  status: 'AVAILABLE' | 'TIMETABLE_OCCUPIED' | 'APPROVED_BOOKING' | 'PENDING_REQUEST' | 'MAINTENANCE';
  details?: string;
  occupiedBy?: string;
}

export interface DashboardMetrics {
  totalResources: number;
  availableResources: number;
  maintenanceResources: number;
  pendingRequests: number;
  todayApprovedBookings: number;
  upcomingBookings: number;
  utilizationRate: number; // percentage
}
