import type { Db } from "./client";
import { USER_ROLES } from "@/features/roles";
import type { UserRole } from "@/shared/types";

/** Throws unless the caller holds the MANAGER role. */
export async function assertManager(db: Db, userId: string): Promise<void> {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "MANAGER" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only resource managers can perform this action.");
}

export async function getActorRole(db: Db, userId: string): Promise<UserRole> {
  const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId);

  if (error || !data) {
    return "STUDENT";
  }

  const roles = new Set<UserRole>();
  for (const row of data) {
    const role = row.role;
    if (role && USER_ROLES.includes(role as UserRole)) {
      roles.add(role as UserRole);
    }
  }

  if (roles.has("MANAGER")) return "MANAGER";
  if (roles.has("TEACHER")) return "TEACHER";
  if (roles.has("CR")) return "CR";
  return "STUDENT";
}

export interface Actor {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
}

export async function getActor(db: Db, userId: string): Promise<Actor> {
  const [{ data: profile }, role] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    getActorRole(db, userId),
  ]);

  return {
    id: userId,
    name: profile?.name ?? "Unknown user",
    email: profile?.email ?? "",
    department: profile?.department ?? "",
    role,
  };
}
