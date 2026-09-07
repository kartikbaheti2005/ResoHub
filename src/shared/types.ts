// Shared domain contracts used by BOTH the frontend and the backend layer.
// Nothing in here may import browser or server-only modules.

export type { UserRole } from "@/features/roles";
export { USER_ROLES, ROLE_LABELS, MANAGER_ROLES } from "@/features/roles";

export interface Profile {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
}

export type ResourceStatus = "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";

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
}

export interface ResourceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const DEFAULT_RESOURCE_CATEGORIES: ResourceCategory[] = [
  {
    id: "auditorium",
    name: "Auditorium",
    description: "Large venue for lectures, events, and public gatherings",
    icon: "Building2",
  },
  {
    id: "classroom",
    name: "Classroom",
    description: "Lecture rooms and teaching spaces for classes",
    icon: "GraduationCap",
  },
  {
    id: "lab",
    name: "Lab",
    description: "Labs for practical, technical, and research work",
    icon: "Laptop",
  },
  {
    id: "conference-room",
    name: "Conference Room",
    description: "Rooms for meetings, presentations, and department work",
    icon: "Briefcase",
  },
  {
    id: "equipment",
    name: "Equipment",
    description: "Portable and shared devices for academic needs",
    icon: "Projector",
  },
  {
    id: "hall",
    name: "Hall",
    description: "Open campus spaces used for seminars, events, and gatherings",
    icon: "Users",
  },
];

export interface Resource {
  id: string;
  name: string;
  resourceType: string;
  location: string;
  capacity: number;
  status: ResourceStatus;
  description: string;
  specifications: ResourceSpecification;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek =
  "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export interface TimetableEntry {
  id: string;
  resourceId: string;
  resourceName: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classSection: string;
  subject: string;
  faculty: string;
  academicYear: string;
}

export type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";

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
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  description: string;
  expectedCount: number;
  requiredEquipment: string[];
  status: BookingStatus;
  rejectionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface MaintenanceSchedule {
  id: string;
  resourceId: string;
  resourceName: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "APPROVAL" | "REJECTION" | "REQUEST_CREATED" | "MAINTENANCE" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
  bookingId: string | null;
}

export type SlotStatus =
  "AVAILABLE" | "TIMETABLE_OCCUPIED" | "APPROVED_BOOKING" | "PENDING_REQUEST" | "MAINTENANCE";

export interface TimeSlotStatus {
  timeSlot: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  details?: string | undefined;
  occupiedBy?: string | undefined;
}

export interface DashboardMetrics {
  totalResources: number;
  availableResources: number;
  maintenanceResources: number;
  pendingRequests: number;
  todayApprovedBookings: number;
  upcomingBookings: number;
  utilizationRate: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string | undefined;
  conflictType?: "MAINTENANCE" | "TIMETABLE" | "APPROVED_BOOKING" | "RESOURCE_STATUS" | undefined;
  details?: string | undefined;
}
