import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_RESOURCE_CATEGORIES } from "@/shared/types";
import { apiListBookings, apiReviewBooking } from "@/lib/fastapi-client";
import {
  addMaintenance,
  addTimetableEntry,
  deleteMaintenance,
  deleteResource,
  deleteTimetableEntry,
  listCategories,
  listMaintenance,
  listResources,
  listTimetable,
  saveResource,
} from "@/backend/catalog.functions";
import { useProfile } from "@/frontend/hooks/useSession";
import { BookingStatusBadge } from "@/frontend/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DayOfWeek } from "@/shared/types";

export const Route = createFileRoute("/_authenticated/manage")({
  beforeLoad: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw redirect({ to: "/auth" });
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "MANAGER");

    if (rolesError) {
      throw rolesError;
    }

    if (!roles || roles.length === 0) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Manager console — ResoHub" },
      {
        name: "description",
        content:
          "Approve or reject booking requests and review the campus timetable and maintenance windows.",
      },
      { property: "og:title", content: "Manager console — ResoHub" },
      { property: "og:description", content: "Review the campus booking pipeline." },
    ],
  }),
  component: ManagePage,
});

function ManagePage() {
  const { isManager, loading } = useProfile();
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [resourceDraft, setResourceDraft] = useState({
    name: "",
    resourceType: "",
    location: "",
    capacity: 30,
    status: "AVAILABLE" as "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE",
    description: "",
  });
  const [timetableDraft, setTimetableDraft] = useState({
    resourceId: "",
    dayOfWeek: "Monday",
    startTime: "09:00",
    endTime: "10:00",
    classSection: "",
    subject: "",
    faculty: "",
    academicYear: "2026-27",
  });
  const [maintenanceDraft, setMaintenanceDraft] = useState({
    resourceId: "",
    title: "",
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "10:00",
    reason: "",
  });

  const { data: bookings } = useQuery({ queryKey: ["bookings"], queryFn: () => apiListBookings() });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const categoryOptions =
    categories && categories.length > 0 ? categories : DEFAULT_RESOURCE_CATEGORIES;
  const { data: resources } = useQuery({ queryKey: ["resources"], queryFn: () => listResources() });
  const { data: timetable } = useQuery({ queryKey: ["timetable"], queryFn: () => listTimetable() });
  const { data: maintenance } = useQuery({
    queryKey: ["maintenance"],
    queryFn: () => listMaintenance(),
  });

  useEffect(() => {
    if (categoryOptions.length === 0) return;
    setResourceDraft((prev) => ({
      ...prev,
      resourceType: prev.resourceType || categoryOptions[0].id,
    }));
  }, [categoryOptions]);

  useEffect(() => {
    if (!resources || resources.length === 0) return;
    setTimetableDraft((prev) => ({
      ...prev,
      resourceId: prev.resourceId || resources[0].id,
    }));
    setMaintenanceDraft((prev) => ({
      ...prev,
      resourceId: prev.resourceId || resources[0].id,
    }));
  }, [resources]);

  const review = useMutation({
    mutationFn: (input: { id: string; status: "APPROVED" | "REJECTED"; reason?: string }) =>
      apiReviewBooking(input),
    onSuccess: () => {
      toast.success("Request reviewed");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error("Review failed", { description: error.message }),
  });

  const createResource = useMutation({
    mutationFn: () => {
      if (!resourceDraft.resourceType) {
        throw new Error("Choose a resource type before creating the resource.");
      }

      return saveResource({
        name: resourceDraft.name,
        resourceType: resourceDraft.resourceType,
        location: resourceDraft.location,
        capacity: Number(resourceDraft.capacity) || 1,
        status: resourceDraft.status,
        description: resourceDraft.description,
        specifications: {},
      });
    },
    onSuccess: () => {
      toast.success("Resource saved");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setResourceDraft({
        name: "",
        resourceType: resources?.[0]?.resourceType ?? "classroom",
        location: "",
        capacity: 30,
        status: "AVAILABLE",
        description: "",
      });
    },
    onError: (error: Error) => toast.error("Save failed", { description: error.message }),
  });

  const createTimetableEntry = useMutation({
    mutationFn: () => {
      if (!timetableDraft.resourceId) {
        throw new Error("Choose a resource before adding the timetable entry.");
      }

      return addTimetableEntry({
        resourceId: timetableDraft.resourceId,
        dayOfWeek: timetableDraft.dayOfWeek as DayOfWeek,
        startTime: timetableDraft.startTime,
        endTime: timetableDraft.endTime,
        classSection: timetableDraft.classSection,
        subject: timetableDraft.subject,
        faculty: timetableDraft.faculty,
        academicYear: timetableDraft.academicYear,
      });
    },
    onSuccess: () => {
      toast.success("Timetable entry added");
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
      setTimetableDraft((prev) => ({ ...prev, classSection: "", subject: "", faculty: "" }));
    },
    onError: (error: Error) =>
      toast.error("Could not add timetable entry", { description: error.message }),
  });

  const removeTimetableEntry = useMutation({
    mutationFn: (id: string) => deleteTimetableEntry({ id }),
    onSuccess: () => {
      toast.success("Timetable entry removed");
      queryClient.invalidateQueries({ queryKey: ["timetable"] });
    },
    onError: (error: Error) => toast.error("Remove failed", { description: error.message }),
  });

  const removeResource = useMutation({
    mutationFn: (id: string) => deleteResource({ id }),
    onSuccess: () => {
      toast.success("Resource removed");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error: Error) => toast.error("Remove failed", { description: error.message }),
  });

  const createMaintenance = useMutation({
    mutationFn: () => {
      if (!maintenanceDraft.resourceId) {
        throw new Error("Choose a resource before creating the maintenance window.");
      }

      return addMaintenance({
        resourceId: maintenanceDraft.resourceId,
        title: maintenanceDraft.title,
        startDate: maintenanceDraft.startDate,
        endDate: maintenanceDraft.endDate,
        startTime: maintenanceDraft.startTime,
        endTime: maintenanceDraft.endTime,
        reason: maintenanceDraft.reason,
      });
    },
    onSuccess: () => {
      toast.success("Maintenance window added");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setMaintenanceDraft({
        resourceId: resources?.[0]?.id ?? "",
        title: "",
        startDate: "",
        endDate: "",
        startTime: "09:00",
        endTime: "10:00",
        reason: "",
      });
    },
    onError: (error: Error) =>
      toast.error("Could not add maintenance", { description: error.message }),
  });

  const removeMaintenance = useMutation({
    mutationFn: (id: string) => deleteMaintenance({ id }),
    onSuccess: () => {
      toast.success("Maintenance window removed");
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
    },
    onError: (error: Error) => toast.error("Remove failed", { description: error.message }),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isManager) {
    return (
      <p className="panel p-10 text-center text-sm text-muted-foreground">
        Only resource managers can access this console.
      </p>
    );
  }

  const pending = (bookings ?? []).filter((b) => b.status === "PENDING");
  const reviewed = (bookings ?? []).filter((b) => b.status !== "PENDING");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Manager console</h1>
        <p className="text-sm text-muted-foreground">
          Approvals are re-checked against the timetable and maintenance windows before they apply.
        </p>
      </header>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-3">
          {pending.length === 0 && (
            <p className="panel p-10 text-center text-sm text-muted-foreground">
              No requests waiting for review.
            </p>
          )}
          {pending.map((b) => (
            <article key={b.id} className="panel space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{b.resourceName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {b.date} · {b.startTime}–{b.endTime} · {b.resourceLocation}
                  </p>
                </div>
                <BookingStatusBadge status={b.status} />
              </div>
              <p className="text-sm">
                <span className="font-medium">{b.userName}</span> ({b.userRole} · {b.userDepartment}
                ) — {b.purpose}
              </p>
              {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={reasons[b.id] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [b.id]: e.target.value }))}
                  placeholder="Rejection reason (optional)"
                  className="max-w-xs"
                />
                <Button
                  onClick={() => review.mutate({ id: b.id, status: "APPROVED" })}
                  disabled={review.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    review.mutate({ id: b.id, status: "REJECTED", reason: reasons[b.id] ?? "" })
                  }
                  disabled={review.isPending}
                >
                  Reject
                </Button>
              </div>
            </article>
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-3">
          {reviewed.map((b) => (
            <div key={b.id} className="panel flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.resourceName}</p>
                <p className="text-xs text-muted-foreground">
                  {b.date} · {b.startTime}–{b.endTime} · {b.userName}
                </p>
              </div>
              <BookingStatusBadge status={b.status} />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="resources" className="mt-6 space-y-4">
          <div className="panel space-y-4 p-5">
            <h2 className="text-lg font-semibold">Add resource</h2>
            {(!categories || categories.length === 0) && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
                Using the default campus categories: auditorium, classroom, lab, hall, and
                conference room.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                value={resourceDraft.name}
                onChange={(e) => setResourceDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Resource name"
              />
              <div className="space-y-1">
                <select
                  value={resourceDraft.resourceType}
                  onChange={(e) =>
                    setResourceDraft((prev) => ({ ...prev, resourceType: e.target.value }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={categoryOptions.length === 0}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                value={resourceDraft.location}
                onChange={(e) =>
                  setResourceDraft((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="Location"
              />
              <Input
                type="number"
                value={resourceDraft.capacity}
                onChange={(e) =>
                  setResourceDraft((prev) => ({ ...prev, capacity: Number(e.target.value) || 1 }))
                }
                placeholder="Capacity"
              />
              <select
                value={resourceDraft.status}
                onChange={(e) =>
                  setResourceDraft((prev) => ({
                    ...prev,
                    status: e.target.value as "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE",
                  }))
                }
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="AVAILABLE">Available</option>
                <option value="UNAVAILABLE">Unavailable</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
            <Textarea
              value={resourceDraft.description}
              onChange={(e) =>
                setResourceDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description"
            />
            <Button
              onClick={() => createResource.mutate()}
              disabled={
                createResource.isPending ||
                !resourceDraft.name ||
                !resourceDraft.location ||
                !resourceDraft.resourceType ||
                !categoryOptions.length
              }
            >
              Create resource
            </Button>
          </div>

          <div className="space-y-2">
            {(resources ?? []).map((resource) => (
              <div
                key={resource.id}
                className="panel flex flex-wrap items-center gap-3 p-4 text-sm"
              >
                <span className="font-medium">{resource.name}</span>
                <span className="text-muted-foreground">{resource.location}</span>
                <span className="text-muted-foreground">{resource.status}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeResource.mutate(resource.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timetable" className="mt-6 space-y-4">
          <div className="panel space-y-4 p-5">
            <h2 className="text-lg font-semibold">Add timetable entry</h2>
            {(!resources || resources.length === 0) && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
                No resources exist yet. Create a resource first so timetable entries can attach to
                it.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={timetableDraft.resourceId}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, resourceId: e.target.value }))
                }
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!resources || resources.length === 0}
              >
                <option value="">Select resource</option>
                {(resources ?? []).map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
              <select
                value={timetableDraft.dayOfWeek}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, dayOfWeek: e.target.value }))
                }
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                  (day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ),
                )}
              </select>
              <Input
                type="time"
                value={timetableDraft.startTime}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, startTime: e.target.value }))
                }
              />
              <Input
                type="time"
                value={timetableDraft.endTime}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, endTime: e.target.value }))
                }
              />
              <Input
                value={timetableDraft.classSection}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, classSection: e.target.value }))
                }
                placeholder="Class section"
              />
              <Input
                value={timetableDraft.subject}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Subject"
              />
              <Input
                value={timetableDraft.faculty}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, faculty: e.target.value }))
                }
                placeholder="Faculty"
              />
              <Input
                value={timetableDraft.academicYear}
                onChange={(e) =>
                  setTimetableDraft((prev) => ({ ...prev, academicYear: e.target.value }))
                }
                placeholder="Academic year"
              />
            </div>
            <Button
              onClick={() => createTimetableEntry.mutate()}
              disabled={
                createTimetableEntry.isPending ||
                !timetableDraft.resourceId ||
                !timetableDraft.subject ||
                !timetableDraft.faculty
              }
            >
              Add timetable entry
            </Button>
          </div>

          <div className="space-y-2">
            {(timetable ?? []).map((entry) => (
              <div key={entry.id} className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="font-medium">{entry.resourceName}</span>
                <span className="text-muted-foreground">
                  {entry.dayOfWeek} {entry.startTime}–{entry.endTime}
                </span>
                <span className="text-muted-foreground">
                  {entry.subject} · {entry.classSection} · {entry.faculty}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeTimetableEntry.mutate(entry.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6 space-y-4">
          <div className="panel space-y-4 p-5">
            <h2 className="text-lg font-semibold">Add maintenance window</h2>
            {(!resources || resources.length === 0) && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
                No resources exist yet. Create a resource before adding maintenance windows.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={maintenanceDraft.resourceId}
                onChange={(e) =>
                  setMaintenanceDraft((prev) => ({ ...prev, resourceId: e.target.value }))
                }
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!resources || resources.length === 0}
              >
                <option value="">Select resource</option>
                {(resources ?? []).map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
              <Input
                value={maintenanceDraft.title}
                onChange={(e) =>
                  setMaintenanceDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Maintenance title"
              />
              <Input
                type="date"
                value={maintenanceDraft.startDate}
                onChange={(e) =>
                  setMaintenanceDraft((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
              <Input
                type="date"
                value={maintenanceDraft.endDate}
                onChange={(e) =>
                  setMaintenanceDraft((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
              <Input
                type="time"
                value={maintenanceDraft.startTime}
                onChange={(e) =>
                  setMaintenanceDraft((prev) => ({ ...prev, startTime: e.target.value }))
                }
              />
              <Input
                type="time"
                value={maintenanceDraft.endTime}
                onChange={(e) =>
                  setMaintenanceDraft((prev) => ({ ...prev, endTime: e.target.value }))
                }
              />
            </div>
            <Textarea
              value={maintenanceDraft.reason}
              onChange={(e) => setMaintenanceDraft((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason"
            />
            <Button
              onClick={() => createMaintenance.mutate()}
              disabled={
                createMaintenance.isPending ||
                !maintenanceDraft.resourceId ||
                !maintenanceDraft.title ||
                !maintenanceDraft.startDate ||
                !maintenanceDraft.endDate
              }
            >
              Add maintenance window
            </Button>
          </div>

          <div className="space-y-2">
            {(maintenance ?? []).map((item) => (
              <div key={item.id} className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="font-medium">{item.resourceName}</span>
                <span className="text-muted-foreground">
                  {item.startDate} → {item.endDate} · {item.startTime}–{item.endTime}
                </span>
                <span className="text-muted-foreground">{item.title}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeMaintenance.mutate(item.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
