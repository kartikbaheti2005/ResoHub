import { cn } from "@/lib/utils";
import type { BookingStatus, ResourceStatus, SlotStatus } from "@/shared/types";

const tone = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  primary: "bg-primary/15 text-primary border-primary/30",
} as const;

type Tone = keyof typeof tone;

const resourceTone: Record<ResourceStatus, Tone> = {
  AVAILABLE: "success",
  UNAVAILABLE: "danger",
  MAINTENANCE: "warning",
};

const bookingTone: Record<BookingStatus, Tone> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  COMPLETED: "info",
};

export const slotTone: Record<SlotStatus, Tone> = {
  AVAILABLE: "success",
  TIMETABLE_OCCUPIED: "info",
  APPROVED_BOOKING: "primary",
  PENDING_REQUEST: "warning",
  MAINTENANCE: "danger",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tone[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return <Badge variant={resourceTone[status]}>{status.toLowerCase()}</Badge>;
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={bookingTone[status]}>{status.toLowerCase()}</Badge>;
}
