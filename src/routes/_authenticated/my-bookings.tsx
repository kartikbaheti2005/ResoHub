import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiCancelBooking, apiListBookings } from "@/lib/fastapi-client";
import { useProfile } from "@/frontend/hooks/useSession";
import { BookingStatusBadge } from "@/frontend/components/StatusBadge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-bookings")({
  head: () => ({
    meta: [
      { title: "My bookings — ResoHub" },
      {
        name: "description",
        content: "Track the status of your campus resource requests and cancel upcoming slots.",
      },
      { property: "og:title", content: "My bookings — ResoHub" },
      { property: "og:description", content: "Track and manage your resource requests." },
    ],
  }),
  component: MyBookingsPage,
});

function MyBookingsPage() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => apiListBookings(),
  });

  const mine = (data ?? []).filter((b) => b.userId === profile?.id);

  const cancel = useMutation({
    mutationFn: (id: string) => apiCancelBooking(id),
    onSuccess: () => {
      toast.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error: Error) => toast.error("Could not cancel", { description: error.message }),
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">My bookings</h1>
        <p className="text-sm text-muted-foreground">
          Everything you have requested, with review status and manager notes.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-3">
        {mine.map((b) => (
          <article key={b.id} className="panel flex flex-wrap items-start gap-4 p-5">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">{b.resourceName}</h2>
                <BookingStatusBadge status={b.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {b.date} · {b.startTime}–{b.endTime} · {b.resourceLocation}
              </p>
              <p className="text-sm">{b.purpose}</p>
              {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
              {b.status === "REJECTED" && b.rejectionReason && (
                <p className="text-sm text-destructive">Reason: {b.rejectionReason}</p>
              )}
            </div>
            {(b.status === "PENDING" || b.status === "APPROVED") && (
              <Button
                variant="secondary"
                onClick={() => cancel.mutate(b.id)}
                disabled={cancel.isPending}
              >
                Cancel
              </Button>
            )}
          </article>
        ))}
      </div>

      {!isLoading && mine.length === 0 && (
        <p className="panel p-10 text-center text-sm text-muted-foreground">
          You have not requested any resources yet.
        </p>
      )}
    </div>
  );
}
