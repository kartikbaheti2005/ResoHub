import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicDb } from "./client";
import { buildHourlyTimeline, checkConflict } from "./availability";
import { toMaintenance, toResource, toTimetableEntry } from "./mappers";
import { assertManager } from "./guards";
import { DEFAULT_RESOURCE_CATEGORIES } from "@/shared/types";
import type {
  ConflictCheckResult,
  MaintenanceSchedule,
  Resource,
  TimeSlotStatus,
  TimetableEntry,
} from "@/shared/types";

/* -------------------------------- reads -------------------------------- */

const isMissingTableError = (message: string) =>
  /PGRST205|Could not find the table|schema cache/i.test(message);

const databaseSetupError = (table: string) =>
  new Error(
    `The Supabase database is not initialized: public.${table} is missing. Apply the migrations with "npx supabase db push --yes", then refresh the app.`,
  );

export const listCategories = createServerFn({ method: "GET" }).handler(
  async () => DEFAULT_RESOURCE_CATEGORIES,
);

export const listResources = createServerFn({ method: "GET" }).handler(
  async (): Promise<Resource[]> => {
    const { data, error } = await publicDb().from("resources").select("*").order("name");
    if (error) {
      if (isMissingTableError(error.message)) return [];
      throw new Error(error.message);
    }
    return (data ?? []).filter(Boolean).map(toResource);
  },
);

export const listTimetable = createServerFn({ method: "GET" }).handler(
  async (): Promise<TimetableEntry[]> => {
    const { data, error } = await publicDb()
      .from("timetable_entries")
      .select("*")
      .order("start_time");
    if (error) {
      if (isMissingTableError(error.message)) return [];
      throw new Error(error.message);
    }
    return (data ?? []).map(toTimetableEntry);
  },
);

export const listMaintenance = createServerFn({ method: "GET" }).handler(
  async (): Promise<MaintenanceSchedule[]> => {
    const { data, error } = await publicDb()
      .from("maintenance_schedules")
      .select("*")
      .order("start_date", { ascending: false });
    if (error) {
      if (isMissingTableError(error.message)) return [];
      throw new Error(error.message);
    }
    return (data ?? []).map(toMaintenance);
  },
);

export const getAvailability = createServerFn({ method: "GET" })
  .validator((input: { resourceId: string; date: string }) => input)
  .handler(async ({ data }): Promise<TimeSlotStatus[]> => {
    return buildHourlyTimeline(publicDb(), data.resourceId, data.date);
  });

export const checkBookingConflict = createServerFn({ method: "POST" })
  .validator(
    (input: { resourceId: string; date: string; startTime: string; endTime: string }) => input,
  )
  .handler(async ({ data }): Promise<ConflictCheckResult> => {
    return checkConflict(publicDb(), data.resourceId, data.date, data.startTime, data.endTime);
  });

/* ----------------------------- manager writes ---------------------------- */

export interface ResourceInput {
  id?: string;
  name: string;
  resourceType: string;
  location: string;
  capacity: number;
  status: Resource["status"];
  description: string;
  imageUrl?: string;
  specifications: Resource["specifications"];
}

export const saveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ResourceInput) => input)
  .handler(async ({ data, context }): Promise<Resource> => {
    await assertManager(context.supabase, context.userId);

    if (!data) {
      throw new Error("Resource details were not received. Fill in the resource form and try again.");
    }

    const fallbackCategory =
      DEFAULT_RESOURCE_CATEGORIES.find((category) => category.id === data.resourceType) ??
      DEFAULT_RESOURCE_CATEGORIES[0];
    const normalizedResourceType = data.resourceType?.trim() || fallbackCategory.id;

    const legacyRow = {
      name: data.name,
      category_id: fallbackCategory.id,
      category_name: fallbackCategory.name,
      location: data.location,
      capacity: data.capacity,
      status: data.status,
      description: data.description,
      image_url: data.imageUrl ?? null,
      specifications: data.specifications as unknown as Record<string, never>,
      updated_at: new Date().toISOString(),
    };
    const row = {
      ...legacyRow,
      resource_type: normalizedResourceType,
    };

    const ensureLegacyCategory = async () => {
      const { error } = await context.supabase.from("categories").upsert(
        {
          id: fallbackCategory.id,
          name: fallbackCategory.name,
          description: fallbackCategory.description,
          icon: fallbackCategory.icon,
        },
        { onConflict: "id" },
      );
      if (error) throw new Error(`Unable to prepare resource type: ${error.message}`);
    };
    const isLegacySchemaError = (message: string) =>
      /resource_type|category_id|category_name|column .* does not exist|violates not-null constraint/i.test(
        message,
      );

    if (data.id) {
      const result = await context.supabase
        .from("resources")
        .update(row)
        .eq("id", data.id)
        .select("*")
        .single();
      if (!result.error) return toResource(result.data);
      if (isMissingTableError(result.error.message)) throw databaseSetupError("resources");
      if (!isLegacySchemaError(result.error.message)) {
        throw new Error(result.error.message);
      }

      await ensureLegacyCategory();
      const legacyResult = await context.supabase
        .from("resources")
        .update(legacyRow)
        .eq("id", data.id)
        .select("*")
        .single();
      if (legacyResult.error) throw new Error(legacyResult.error.message);
      return toResource(legacyResult.data);
    }

    const id = `res_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const result = await context.supabase
      .from("resources")
      .insert({ id, ...row })
      .select("*")
      .single();
    if (!result.error) return toResource(result.data);
    if (isMissingTableError(result.error.message)) throw databaseSetupError("resources");
    if (!isLegacySchemaError(result.error.message)) {
      throw new Error(result.error.message);
    }

    await ensureLegacyCategory();
    const legacyResult = await context.supabase
      .from("resources")
      .insert({ id, ...legacyRow })
      .select("*")
      .single();
    if (legacyResult.error) throw new Error(legacyResult.error.message);
    return toResource(legacyResult.data);
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("resources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTimetableEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      resourceId: string;
      dayOfWeek: TimetableEntry["dayOfWeek"];
      startTime: string;
      endTime: string;
      classSection: string;
      subject: string;
      faculty: string;
      academicYear: string;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<TimetableEntry> => {
    await assertManager(context.supabase, context.userId);

    const { data: resource } = await context.supabase
      .from("resources")
      .select("name")
      .eq("id", data.resourceId)
      .maybeSingle();

    const { data: created, error } = await context.supabase
      .from("timetable_entries")
      .insert({
        resource_id: data.resourceId,
        resource_name: resource?.name ?? "",
        day_of_week: data.dayOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
        class_section: data.classSection,
        subject: data.subject,
        faculty: data.faculty,
        academic_year: data.academicYear,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toTimetableEntry(created);
  });

export const deleteTimetableEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const { error } = await context.supabase.from("timetable_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      resourceId: string;
      title: string;
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      reason: string;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<MaintenanceSchedule> => {
    await assertManager(context.supabase, context.userId);

    const { data: resource } = await context.supabase
      .from("resources")
      .select("name")
      .eq("id", data.resourceId)
      .maybeSingle();

    const { data: created, error } = await context.supabase
      .from("maintenance_schedules")
      .insert({
        resource_id: data.resourceId,
        resource_name: resource?.name ?? "",
        title: data.title,
        start_date: data.startDate,
        end_date: data.endDate,
        start_time: data.startTime,
        end_time: data.endTime,
        reason: data.reason,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toMaintenance(created);
  });

export const deleteMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("maintenance_schedules")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
