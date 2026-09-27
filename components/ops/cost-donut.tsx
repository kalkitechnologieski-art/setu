"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface CostSlice {
  name: string;
  value: number;
  color: string;
}

/**
 * Format a Recharts tooltip value.
 *
 * Recharts types the formatter's first arg as
 *   `ValueType = number | string | Array<number | string> | undefined`
 * so we accept that union and narrow inside.
 */
function formatCost(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `$${value.toFixed(2)}`;
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return `$${n.toFixed(2)}`;
  }
  return "$0.00";
}

export function CostDonut({ data }: { data: readonly CostSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data as CostSlice[]}
            dataKey="value"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
            }}
            // Recharts' Formatter type accepts (value: ValueType) => ReactNode.
            // Widening to `unknown` here keeps us compatible without `any`.
            formatter={(value: unknown) => formatCost(value)}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Today
        </span>
        <span className="text-lg font-semibold tabular-nums">
          ${total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
