export const USER_ROLES = ["STUDENT", "TEACHER", "MANAGER", "CR"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  MANAGER: "Manager",
  CR: "Campus Representative",
};

export const MANAGER_ROLES = new Set<UserRole>(["MANAGER"]);

export function isManagerRole(role?: string | null): boolean {
  return role === "MANAGER";
}
