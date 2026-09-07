import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CalendarRange, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResoHub — campus resource booking for labs & halls" },
      {
        name: "description",
        content:
          "ResoHub lets students, faculty and managers book campus labs, auditoriums and classrooms with conflict-free scheduling against the college timetable.",
      },
      { property: "og:title", content: "ResoHub — campus resource booking" },
      {
        property: "og:description",
        content: "Conflict-free booking for campus labs, auditoriums and classrooms.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CalendarRange,
    title: "Timetable-aware slots",
    body: "Every request is checked against the weekly class timetable before it can be approved.",
  },
  {
    icon: ShieldCheck,
    title: "Manager approvals",
    body: "Requests route to resource managers with re-validation at approval time.",
  },
  {
    icon: Wrench,
    title: "Maintenance windows",
    body: "Blocked periods keep resources off-limits while they are being serviced.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Building2 className="size-5" />
          </span>
          <span className="font-display text-lg font-bold">ResoHub</span>
        </div>
        <Button asChild variant="secondary">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Campus operations
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-bold leading-tight text-gradient">
            Book labs, halls and classrooms without the clashes
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            ResoHub keeps the college timetable, maintenance schedule and every approved booking in
            one place, so a slot is only free when it truly is.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/resources">Browse resources</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 md:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="panel p-6">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
