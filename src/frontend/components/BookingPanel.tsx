import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge, slotTone } from "./StatusBadge";
import { getAvailability } from "@/backend/catalog.functions";
import { apiCreateBooking } from "@/lib/fastapi-client";
import type { Resource } from "@/shared/types";
import { cn } from "@/lib/utils";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AvailabilityTimeline({
  resourceId,
  date,
  onPick,
}: {
  resourceId: string;
  date: string;
  onPick?: (start: string, end: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["availability", resourceId, date],
    queryFn: () => getAvailability({ data: { resourceId, date } }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading availability…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {(data ?? []).map((slot) => {
        const free = slot.status === "AVAILABLE";
        return (
          <button
            key={slot.timeSlot}
            type="button"
            disabled={!free || !onPick}
            onClick={() => onPick?.(slot.startTime, slot.endTime)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              free
                ? "border-success/40 bg-success/10 hover:bg-success/20"
                : "border-border bg-secondary/60 opacity-80",
              !onPick && "cursor-default",
            )}
          >
            <p className="font-display text-sm font-semibold">{slot.timeSlot}</p>
            <Badge variant={slotTone[slot.status]} className="mt-2">
              {slot.status.replace(/_/g, " ").toLowerCase()}
            </Badge>
            {slot.occupiedBy && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{slot.occupiedBy}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function BookingDialog({
  resource,
  open,
  onOpenChange,
}: {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [expectedCount, setExpectedCount] = useState(20);

  const mutation = useMutation({
    mutationFn: () =>
      apiCreateBooking({
        resourceId: resource!.id,
        date,
        startTime,
        endTime,
        purpose,
        description,
        expectedCount,
      }),
    onSuccess: () => {
      toast.success("Request submitted", {
        description: "A resource manager will review it shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      onOpenChange(false);
      setPurpose("");
      setDescription("");
    },
    onError: (error: Error) => toast.error("Could not book", { description: error.message }),
  });

  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book {resource.name}</DialogTitle>
          <DialogDescription>
            {resource.location} · capacity {resource.capacity}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                min={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Availability on {date}</p>
            <AvailabilityTimeline
              resourceId={resource.id}
              date={date}
              onPick={(s, e) => {
                setStartTime(s);
                setEndTime(e);
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Workshop, extra lab, seminar…"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="count">Expected attendance</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={resource.capacity}
                value={expectedCount}
                onChange={(e) => setExpectedCount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Details</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything the manager should know"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Submit request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
