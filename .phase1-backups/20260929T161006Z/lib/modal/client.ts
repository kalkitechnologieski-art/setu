// lib/modal/client.ts
const DAILY_CAP_CENTS = 17;

let modalSpentTodayCents = 0;

export function getModalSpentToday(): number {
  return modalSpentTodayCents;
}

export function hasModalBudget(): boolean {
  return modalSpentTodayCents < DAILY_CAP_CENTS;
}

export function trackModalSpend(costCents: number): void {
  modalSpentTodayCents += costCents;
}

export interface ModalCallOptions {
  appName: string;
  functionName: string;
  args: unknown[];
  kwargs?: Record<string, unknown>;
}

export async function callModalFunction<T = unknown>(
  opts: ModalCallOptions
): Promise<T> {
  if (!hasModalBudget()) {
    throw new Error("MODAL_BUDGET_EXHAUSTED");
  }
  const url = process.env.MODAL_ENDPOINT_URL;
  const key = process.env.MODAL_PROXY_KEY;
  const secret = process.env.MODAL_PROXY_SECRET;
  if (!url || !key || !secret) throw new Error("Modal not configured");

  const res = await fetch(`${url.replace(/\/$/, "")}/functions/${opts.appName}.${opts.functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": key,
      "Modal-Secret": secret,
    },
    body: JSON.stringify({ args: opts.args, kwargs: opts.kwargs ?? {} }),
  });
  if (!res.ok) throw new Error(`Modal ${res.status}`);
  return (await res.json()) as T;
}

export async function callModalEndpoint<T = unknown>(
  path: string,
  body: unknown
): Promise<T> {
  const url = process.env.MODAL_ENDPOINT_URL;
  const key = process.env.MODAL_PROXY_KEY;
  const secret = process.env.MODAL_PROXY_SECRET;
  if (!url || !key || !secret) throw new Error("Modal not configured");

  const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Modal-Key": key,
      "Modal-Secret": secret,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Modal ${res.status}`);
  return (await res.json()) as T;
}
