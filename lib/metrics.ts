// lib/metrics.ts
// In-process metrics registry. Counter, Gauge, Histogram.
// Exposed via /api/metrics in a Prometheus-compatible format.

interface CounterRecord {
  value: number;
  labels: Record<string, string>;
}

interface GaugeRecord {
  value: number;
  updatedAt: number;
  labels: Record<string, string>;
}

interface HistogramRecord {
  count: number;
  sum: number;
  min: number;
  max: number;
  samples: number[];
  labels: Record<string, string>;
}

function labelKey(name: string, labels: Record<string, string>): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return name;
  const parts = keys.map((k) => `${k}=${labels[k]}`);
  return `${name}{${parts.join(",")}}`;
}

class MetricsRegistry {
  private readonly counters = new Map<string, CounterRecord>();
  private readonly gauges = new Map<string, GaugeRecord>();
  private readonly histograms = new Map<string, HistogramRecord>();
  private readonly MAX_HIST_SAMPLES = 1000;

  increment(name: string, value: number = 1, labels: Record<string, string> = {}): void {
    const key = labelKey(name, labels);
    const existing = this.counters.get(key);
    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { value, labels });
    }
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = labelKey(name, labels);
    this.gauges.set(key, { value, updatedAt: Date.now(), labels });
  }

  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = labelKey(name, labels);
    let h = this.histograms.get(key);
    if (!h) {
      h = {
        count: 0,
        sum: 0,
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        samples: [],
        labels,
      };
      this.histograms.set(key, h);
    }
    h.count += 1;
    h.sum += value;
    h.min = Math.min(h.min, value);
    h.max = Math.max(h.max, value);
    h.samples.push(value);
    if (h.samples.length > this.MAX_HIST_SAMPLES) {
      h.samples.shift();
    }
  }

  percentile(name: string, labels: Record<string, string>, p: number): number {
    const key = labelKey(name, labels);
    const h = this.histograms.get(key);
    if (!h || h.samples.length === 0) return 0;
    const sorted = [...h.samples].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx] ?? 0;
  }

  snapshot(): {
    counters: Array<{ key: string; value: number; labels: Record<string, string> }>;
    gauges: Array<{ key: string; value: number; labels: Record<string, string> }>;
    histograms: Array<{
      key: string;
      count: number;
      sum: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
      labels: Record<string, string>;
    }>;
  } {
    const counters: Array<{ key: string; value: number; labels: Record<string, string> }> = [];
    for (const [key, v] of this.counters.entries()) {
      counters.push({ key, value: v.value, labels: v.labels });
    }

    const gauges: Array<{ key: string; value: number; labels: Record<string, string> }> = [];
    for (const [key, v] of this.gauges.entries()) {
      gauges.push({ key, value: v.value, labels: v.labels });
    }

    const histograms: Array<{
      key: string;
      count: number;
      sum: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
      labels: Record<string, string>;
    }> = [];
    for (const [key, h] of this.histograms.entries()) {
      const sorted = [...h.samples].sort((a, b) => a - b);
      const pick = (p: number): number => {
        if (sorted.length === 0) return 0;
        const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
        return sorted[i] ?? 0;
      };
      histograms.push({
        key,
        count: h.count,
        sum: h.sum,
        min: h.min === Number.POSITIVE_INFINITY ? 0 : h.min,
        max: h.max === Number.NEGATIVE_INFINITY ? 0 : h.max,
        p50: pick(50),
        p95: pick(95),
        p99: pick(99),
        labels: h.labels,
      });
    }

    return { counters, gauges, histograms };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

let singleton: MetricsRegistry | null = null;

export function getMetrics(): MetricsRegistry {
  if (!singleton) singleton = new MetricsRegistry();
  return singleton;
}

export const metrics = {
  increment: (name: string, value?: number, labels?: Record<string, string>): void =>
    getMetrics().increment(name, value, labels),
  gauge: (name: string, value: number, labels?: Record<string, string>): void =>
    getMetrics().gauge(name, value, labels),
  observe: (name: string, value: number, labels?: Record<string, string>): void =>
    getMetrics().observe(name, value, labels),
  snapshot: () => getMetrics().snapshot(),
  reset: () => getMetrics().reset(),
};
