// lib/integrations/calcom.ts
// Cal.com API v2 client. Version header is required on every request.

const CAL_BASE = "https://api.cal.com/v2";
const CAL_VERSION = process.env.CALCOM_API_VERSION ?? "2026-02-25";

function authHeaders(): Record<string, string> {
  const key = process.env.CALCOM_API_KEY;
  if (!key || key === "cal_live_placeholder") throw new Error("Cal.com not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "cal-api-version": CAL_VERSION,
  };
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export async function getAvailability(
  eventTypeId: number,
  startTime: string,
  endTime: string,
  timeZone = "Asia/Kolkata"
): Promise<AvailableSlot[]> {
  try {
    const res = await fetch(
      `${CAL_BASE}/slots?eventTypeId=${eventTypeId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&timeZone=${encodeURIComponent(timeZone)}`,
      { headers: authHeaders() }
    );
    if (!res.ok) return [];
    const json = await res.json() as { data?: Record<string, Array<{ time: string }>> };
    const slots: AvailableSlot[] = [];
    for (const day of Object.values(json.data ?? {})) {
      for (const s of day) {
        slots.push({ start: s.time, end: s.time });
      }
    }
    return slots;
  } catch {
    return [];
  }
}

export interface BookingResult {
  ok: boolean;
  bookingId?: string;
  error?: string;
}

export async function createBooking(input: {
  eventTypeId: number;
  start: string;
  attendeeName: string;
  attendeeEmail: string;
  timeZone?: string;
  notes?: string;
}): Promise<BookingResult> {
  try {
    const res = await fetch(`${CAL_BASE}/bookings`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        eventTypeId: input.eventTypeId,
        start: input.start,
        attendee: {
          name: input.attendeeName,
          email: input.attendeeEmail,
          timeZone: input.timeZone ?? "Asia/Kolkata",
        },
        metadata: { notes: input.notes ?? "" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Cal.com ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = await res.json() as { data?: { uid?: string } };
    return { ok: true, bookingId: json.data?.uid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Booking failed" };
  }
}
