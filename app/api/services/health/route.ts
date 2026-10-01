import { NextResponse } from "next/server";
import { bootstrapServices, getServiceBus } from "@/lib/services/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    bootstrapServices();
    const bus = getServiceBus();
    const health = await bus.healthAll();

    const ready = health.filter((h) => h.ready).length;
    const degraded = health.filter((h) => h.degraded).length;

    return NextResponse.json(
      {
        ok: ready > 0,
        at: new Date().toISOString(),
        total: health.length,
        ready,
        degraded,
        services: health,
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        at: new Date().toISOString(),
        error: e instanceof Error ? e.message : "Health check failed",
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
