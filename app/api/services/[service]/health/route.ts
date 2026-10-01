import { NextResponse, type NextRequest } from "next/server";
import {
  bootstrapServices,
  getServiceBus,
  type ServiceId,
} from "@/lib/services/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: readonly ServiceId[] = [
  "email",
  "calling",
  "leads",
  "performance",
  "assistant",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await params;

    if (!VALID.includes(service as ServiceId)) {
      return NextResponse.json(
        { error: "unknown_service", valid: VALID },
        { status: 404 }
      );
    }

    bootstrapServices();
    const bus = getServiceBus();
    const health = await bus.healthOne(service as ServiceId);

    if (!health) {
      return NextResponse.json(
        { error: "service_unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: health.ready,
        at: new Date().toISOString(),
        service: health,
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: "internal_error",
        message: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 200 }
    );
  }
}
