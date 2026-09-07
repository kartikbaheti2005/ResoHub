import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkConflict } from "./availability";
import { toBooking } from "./mappers";
import { assertManager, getActor } from "./guards";
import type { BookingRequest } from "@/shared/types";

/** Bookings visible to the caller: own requests, or everything for managers. */
export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BookingRequest[]> => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .order("requested_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toBooking);
  });

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      resourceId: string;
      date: string;
      startTime: string;
      endTime: string;
      purpose: string;
      description?: string;
      expectedCount?: number;
      requiredEquipment?: string[];
    }) => input,
  )
  .handler(async ({ data, context }): Promise<BookingRequest> => {
    const db = context.supabase;

    const { data: resource } = await db
      .from("resources")
      .select("id, name, location")
      .eq("id", data.resourceId)
      .maybeSingle();
    if (!resource) throw new Error("The requested resource was not found.");

    const conflict = await checkConflict(
      db,
      data.resourceId,
      data.date,
      data.startTime,
      data.endTime,
    );
    if (conflict.hasConflict) {
      throw new Error(conflict.reason ?? "Resource is not available for the requested time slot.");
    }

    const actor = await getActor(db, context.userId);

    const { data: created, error } = await db
      .from("bookings")
      .insert({
        resource_id: resource.id,
        resource_name: resource.name,
        resource_location: resource.location,
        user_id: actor.id,
        user_name: actor.name,
        user_role: actor.role,
        user_email: actor.email,
        user_department: actor.department,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        purpose: data.purpose,
        description: data.description ?? "",
        expected_count: data.expectedCount ?? 1,
        required_equipment: data.requiredEquipment ?? [],
        status: "PENDING",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await db.from("notifications").insert({
      user_id: actor.id,
      title: "Booking request submitted",
      message: `Your request for ${resource.name} on ${data.date} (${data.startTime} - ${data.endTime}) is pending manager review.`,
      type: "REQUEST_CREATED",
      booking_id: created.id,
    });

    return toBooking(created);
  });

export const reviewBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string; status: "APPROVED" | "REJECTED"; reason?: string }) => input)
  .handler(async ({ data, context }): Promise<BookingRequest> => {
    const db = context.supabase;
    await assertManager(db, context.userId);

    const { data: booking } = await db.from("bookings").select("*").eq("id", data.id).maybeSingle();
    if (!booking) throw new Error("Booking request not found.");
    if (booking.status !== "PENDING") throw new Error("This request has already been reviewed.");

    if (data.status === "APPROVED") {
      const conflict = await checkConflict(
        db,
        booking.resource_id,
        booking.date,
        booking.start_time,
        booking.end_time,
        booking.id,
      );
      if (conflict.hasConflict) {
        throw new Error(`Cannot approve — ${conflict.reason}`);
      }
    }

    const reviewer = await getActor(db, context.userId);

    const { data: updated, error } = await db
      .from("bookings")
      .update({
        status: data.status,
        rejection_reason: data.status === "REJECTED" ? (data.reason ?? "No reason provided") : null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewer.name,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await db.from("notifications").insert({
      user_id: booking.user_id,
      title: data.status === "APPROVED" ? "Booking request approved" : "Booking request rejected",
      message:
        data.status === "APPROVED"
          ? `Your booking for ${booking.resource_name} on ${booking.date} (${booking.start_time} - ${booking.end_time}) was approved by ${reviewer.name}.`
          : `Your booking for ${booking.resource_name} on ${booking.date} was rejected. Reason: ${data.reason ?? "No reason provided"}.`,
      type: data.status === "APPROVED" ? "APPROVAL" : "REJECTION",
      booking_id: booking.id,
    });

    return toBooking(updated);
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<BookingRequest> => {
    const db = context.supabase;
    const { data: booking } = await db.from("bookings").select("*").eq("id", data.id).maybeSingle();
    if (!booking) throw new Error("Booking request not found.");
    if (booking.user_id !== context.userId) {
      throw new Error("You can only cancel your own bookings.");
    }
    if (booking.status === "CANCELLED") return toBooking(booking);

    const { data: updated, error } = await db
      .from("bookings")
      .update({ status: "CANCELLED" })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toBooking(updated);
  });
