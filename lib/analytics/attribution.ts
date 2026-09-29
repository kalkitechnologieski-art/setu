// lib/analytics/attribution.ts
// Multi-touch attribution models.

export type AttributionModel =
  | "first_touch" | "last_touch" | "linear" | "time_decay" | "u_shaped";

export interface Touch {
  channel: string;
  campaignId?: string;
  timestamp: string;
}

export interface AttributionCredit {
  channel: string;
  credit: number;
}

export function attribute(
  touches: Touch[],
  model: AttributionModel = "linear"
): AttributionCredit[] {
  if (touches.length === 0) return [];

  const credits = new Map<string, number>();

  const add = (channel: string, amount: number) => {
    credits.set(channel, (credits.get(channel) ?? 0) + amount);
  };

  switch (model) {
    case "first_touch":
      add(touches[0]!.channel, 1);
      break;
    case "last_touch":
      add(touches[touches.length - 1]!.channel, 1);
      break;
    case "linear": {
      const share = 1 / touches.length;
      for (const t of touches) add(t.channel, share);
      break;
    }
    case "time_decay": {
      // 7-day half-life
      const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
      const lastTs = new Date(touches[touches.length - 1]!.timestamp).getTime();
      let total = 0;
      const weights: number[] = [];
      for (const t of touches) {
        const age = lastTs - new Date(t.timestamp).getTime();
        const w = Math.pow(0.5, age / halfLifeMs);
        weights.push(w);
        total += w;
      }
      touches.forEach((t, i) => add(t.channel, weights[i]! / total));
      break;
    }
    case "u_shaped": {
      if (touches.length === 1) { add(touches[0]!.channel, 1); break; }
      if (touches.length === 2) {
        add(touches[0]!.channel, 0.5);
        add(touches[1]!.channel, 0.5);
        break;
      }
      add(touches[0]!.channel, 0.4);
      add(touches[touches.length - 1]!.channel, 0.4);
      const middle = touches.slice(1, -1);
      const share = 0.2 / middle.length;
      for (const t of middle) add(t.channel, share);
      break;
    }
  }

  return Array.from(credits.entries()).map(([channel, credit]) => ({ channel, credit }));
}
