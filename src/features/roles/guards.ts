import { isManagerRole } from "./types";

export function canAccessManagerConsole(role?: string | null): boolean {
  return isManagerRole(role);
}
