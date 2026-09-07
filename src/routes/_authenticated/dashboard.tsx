import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarCheck, Clock, Wrench } from "lucide-react";
import { getDashboardMetrics } from "@/backend/account.functions";
import { apiListBookings } from "@/lib/fastapi-client";
import { BookingStatusBadge } from "@/frontend/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ResoHub" },
      {
        name: "description",
        content: "Live campus utilisation, pending booking requests and today's approved sessions.",
      },
      { property: "og:title", content: "Dashboard — ResoHub" },
      { property: "og:description", content: "Campus resource utilisation at a glance." },
    ],
  }),
  component: DashboardPage,
});

function Metric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof Building2;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function DashboardPage() {
  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => getDashboardMetrics(),
  });
  const { data: bookings } = useQuery({ queryKey: ["bookings"], queryFn: () => apiListBookings() });

  const recent = (bookings ?? []).slice(0, 8);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Operations dashboard</h1>
        <p className="text-sm text-muted-foreground">
          A live view of the campus inventory and booking pipeline.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Resources"
          value={metrics?.totalResources ?? "—"}
          hint={`${metrics?.availableResources ?? 0} available now`}
          icon={Building2}
        />
        <Metric
          label="Pending requests"
          value={metrics?.pendingRequests ?? "—"}
          hint="Awaiting manager review"
          icon={Clock}
        />
        <Metric
          label="Today's sessions"
          value={metrics?.todayApprovedBookings ?? "—"}
          hint={`${metrics?.upcomingBookings ?? 0} upcoming approved`}
          icon={CalendarCheck}
        />
        <Metric
          label="Under maintenance"
          value={metrics?.maintenanceResources ?? "—"}
          hint={`${metrics?.utilizationRate ?? 0}% utilisation today`}
          icon={Wrench}
        />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Recent requests</h2>
          <Link to="/my-bookings" className="text-sm font-medium text-primary">
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recent.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No booking activity yet.
            </p>
          )}
          {recent.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{b.resourceName}</p>
                <p className="text-xs text-muted-foreground">
                  {b.date} · {b.startTime}–{b.endTime} · {b.userName}
                </p>
              </div>
              <p className="max-w-xs truncate text-sm text-muted-foreground">{b.purpose}</p>
              <BookingStatusBadge status={b.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
