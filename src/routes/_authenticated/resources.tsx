import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Users, Search, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_RESOURCE_CATEGORIES } from "@/shared/types";
import {
  deleteResource,
  listCategories,
  listResources,
  saveResource,
} from "@/backend/catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResourceStatusBadge } from "@/frontend/components/StatusBadge";
import { BookingDialog } from "@/frontend/components/BookingPanel";
import { useProfile } from "@/frontend/hooks/useSession";
import type { Resource } from "@/shared/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Campus resources — ResoHub" },
      {
        name: "description",
        content:
          "Browse labs, auditoriums, seminar halls and classrooms with live availability and book a slot.",
      },
      { property: "og:title", content: "Campus resources — ResoHub" },
      { property: "og:description", content: "Live availability for every campus resource." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { isManager } = useProfile();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [resourceType, setResourceType] = useState<string | null>(null);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resourceDraft, setResourceDraft] = useState({
    name: "",
    resourceType: "",
    location: "",
    capacity: 30,
    status: "AVAILABLE" as Resource["status"],
    description: "",
    specifications: {},
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const categoryOptions =
    categories && categories.length > 0 ? categories : DEFAULT_RESOURCE_CATEGORIES;
  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: () => listResources(),
  });

  const saveResourceMutation = useMutation({
    mutationFn: () =>
      saveResource({
        id: editingId ?? undefined,
        name: resourceDraft.name,
        resourceType: resourceDraft.resourceType || categoryOptions?.[0]?.id || "classroom",
        location: resourceDraft.location,
        capacity: Number(resourceDraft.capacity) || 1,
        status: resourceDraft.status,
        description: resourceDraft.description,
        specifications: resourceDraft.specifications,
      }),
    onSuccess: () => {
      toast.success(editingId ? "Resource updated" : "Resource created");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      resetResourceDraft();
    },
    onError: (error: Error) => toast.error("Resource save failed", { description: error.message }),
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: string) => deleteResource({ id }),
    onSuccess: () => {
      toast.success("Resource deleted");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error: Error) => toast.error("Delete failed", { description: error.message }),
  });

  function resetResourceDraft() {
    setEditingId(null);
    setResourceDraft({
      name: "",
      resourceType: categoryOptions[0]?.id ?? "classroom",
      location: "",
      capacity: 30,
      status: "AVAILABLE",
      description: "",
      specifications: {},
    });
  }

  function startEdit(resource: Resource) {
    if (!resource) return;

    setEditingId(resource.id);
    setResourceDraft({
      name: resource.name,
      resourceType: resource.resourceType,
      location: resource.location,
      capacity: resource.capacity,
      status: resource.status,
      description: resource.description,
      specifications: resource.specifications ?? {},
    });
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (resources ?? []).filter(Boolean).filter((r) => {
      const matchesCategory = !resourceType || r?.resourceType === resourceType;
      const matchesTerm =
        !term ||
        r?.name?.toLowerCase().includes(term) ||
        r?.location?.toLowerCase().includes(term) ||
        r?.resourceType?.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [resources, query, resourceType]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Campus resources</h1>
        <p className="text-sm text-muted-foreground">
          Pick a resource, check the hourly timeline, and send a booking request.
        </p>
      </header>

      {isManager && (
        <section className="panel space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit resource" : "Add a resource"}
            </h2>
            {editingId && (
              <Button variant="secondary" onClick={resetResourceDraft} className="h-9">
                Cancel
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={resourceDraft.name}
              onChange={(e) => setResourceDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Resource name"
            />
            <select
              value={resourceDraft.resourceType}
              onChange={(e) =>
                setResourceDraft((prev) => ({ ...prev, resourceType: e.target.value }))
              }
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Input
              value={resourceDraft.location}
              onChange={(e) => setResourceDraft((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Location"
            />
            <Input
              type="number"
              min={1}
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
                  status: e.target.value as Resource["status"],
                }))
              }
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
            <div className="md:col-span-2">
              <Textarea
                value={resourceDraft.description}
                onChange={(e) =>
                  setResourceDraft((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description"
                className="min-h-[100px]"
              />
            </div>
          </div>

          <Button
            onClick={() => saveResourceMutation.mutate()}
            disabled={
              saveResourceMutation.isPending || !resourceDraft.name || !resourceDraft.location
            }
            className="gap-2"
          >
            <Plus className="size-4" />
            {editingId ? "Save changes" : "Create resource"}
          </Button>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, block or category"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setResourceType(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              !resourceType
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            All
          </button>
          {categoryOptions.map((c) => (
            <button
              key={c.id}
              onClick={() => setResourceType(c.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                resourceType === c.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading resources…</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((resource) => (
          <article key={resource.id} className="panel flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {categoryOptions.find((category) => category.id === resource?.resourceType)
                    ?.name ?? resource?.resourceType ?? "Classroom"}
                </p>
                <h2 className="mt-1 text-lg font-semibold">{resource.name}</h2>
              </div>
              <ResourceStatusBadge status={resource.status} />
            </div>

            <p className="line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {resource.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" /> {resource.capacity} seats
              </span>
            </div>

            <div className="mt-auto flex gap-2">
              <Button
                className="flex-1"
                disabled={resource.status !== "AVAILABLE"}
                onClick={() => setSelected(resource)}
              >
                {resource.status === "AVAILABLE" ? "Check & book" : "Unavailable"}
              </Button>
              {isManager && (
                <>
                  <Button variant="secondary" size="icon" onClick={() => startEdit(resource)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteResourceMutation.mutate(resource.id)}
                    disabled={deleteResourceMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <p className="panel p-8 text-center text-sm text-muted-foreground">
          No resources match your filters.
        </p>
      )}

      <BookingDialog
        resource={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
