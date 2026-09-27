const ITEMS = [
  {
    quote:
      "Our SDR team spent half their week researching leads. Arjun does it in the background and we review qualified leads in the morning.",
    name: "Priya Menon",
    role: "VP Sales, Acme Industries",
    initials: "PM",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    quote:
      "The human-in-the-loop approval flow was the deciding factor. Every write pauses for us. We see the reasoning, we approve, it executes.",
    name: "Rohan Verma",
    role: "Head of Growth, BrightTech",
    initials: "RV",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    quote:
      "Siddhi found a ₹42,000 monthly reallocation in week one. Paid for the entire quarter of Setu three times over.",
    name: "Ishaan Kapoor",
    role: "CMO, Nexus AI",
    initials: "IK",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export function Testimonials() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {ITEMS.map((t) => (
        <figure
          key={t.name}
          className="flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:shadow-primary/5"
        >
          <blockquote className="text-sm leading-relaxed">
            {t.quote}
          </blockquote>
          <figcaption className="flex items-center gap-3 border-t pt-4">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} text-[10px] font-semibold text-white`}
            >
              {t.initials}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{t.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {t.role}
              </div>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
