import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getActor } from "./guards";
import { toNotification } from "./mappers";
import type { DashboardMetrics, NotificationItem, Profile } from "@/shared/types";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile> => {
    const actor = await getActor(context.supabase, context.userId);
    return {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      department: actor.department,
      role: actor.role,
    };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationItem[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(toNotification);
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id?: string }) => input)
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", context.userId);
    if (data.id) query = query.eq("id", data.id);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardMetrics> => {
    const db = context.supabase;
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: resources }, { data: bookings }] = await Promise.all([
      db.from("resources").select("status"),
      db.from("bookings").select("status, date"),
    ]);

    const allResources = resources ?? [];
    const allBookings = bookings ?? [];

    const totalResources = allResources.length;
    const availableResources = allResources.filter((r) => r.status === "AVAILABLE").length;
    const maintenanceResources = allResources.filter((r) => r.status === "MAINTENANCE").length;
    const pendingRequests = allBookings.filter((b) => b.status === "PENDING").length;
    const todayApprovedBookings = allBookings.filter(
      (b) => b.status === "APPROVED" && b.date === today,
    ).length;
    const upcomingBookings = allBookings.filter(
      (b) => b.status === "APPROVED" && b.date >= today,
    ).length;

    return {
      totalResources,
      availableResources,
      maintenanceResources,
      pendingRequests,
      todayApprovedBookings,
      upcomingBookings,
      utilizationRate: totalResources
        ? Math.round((todayApprovedBookings / (totalResources * 11)) * 100)
        : 0,
    };
  });
