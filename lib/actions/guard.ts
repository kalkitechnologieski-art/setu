// lib/actions/guard.ts
// ═══════════════════════════════════════════════════════════════════════════
// withAction — a Server Action wrapper that enforces the Result Pattern.
//
//   export const createLead = withAction({
//     schema: CreateLeadSchema,
//     handler: async (input, { userId, supabase }) => {
//       const { data, error } = await supabase.from("leads").insert(...);
//       if (error) throw mapSupabaseError(error);
//       return data;
//     },
//   });
//
// The wrapper:
//   1. Resolves the authenticated user (401 if none)
//   2. Validates input via Zod (400 + fieldErrors on failure)
//   3. Invokes the handler with a typed { userId, supabase, correlationId } ctx
//   4. Catches every throw — converts to a typed ActionFailure
//   5. Logs server-side with a correlation ID
//   6. Never leaks stack traces to the client
// ═══════════════════════════════════════════════════════════════════════════
import { type ZodTypeAny, type z as zType } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  actionSuccess,
  actionFailure,
  type ActionResult,
  type ActionErrorCode,
} from "@/lib/types/action";

// ─── Domain errors ────────────────────────────────────────────────────────

export class DomainError extends Error {
  constructor(
    public readonly code: ActionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const Unauthorized = (m = "Not authenticated") =>
  new DomainError("UNAUTHORIZED", m);
export const Forbidden = (m = "Not permitted") =>
  new DomainError("FORBIDDEN", m);
export const NotFound = (m = "Resource not found") =>
  new DomainError("NOT_FOUND", m);
export const Conflict = (m = "Already exists") =>
  new DomainError("CONFLICT", m);
export const RateLimited = (m = "Too many requests") =>
  new DomainError("RATE_LIMITED", m);

// ─── Supabase error mapping ───────────────────────────────────────────────

export function mapSupabaseError(error: {
  code?: string;
  message: string;
}): DomainError {
  switch (error.code) {
    case "23505":    return Conflict(error.message);
    case "42501":    return Forbidden("Row-level security blocked this request");
    case "PGRST116": return NotFound(error.message);
    case "PGRST301": return Unauthorized(error.message);
    default:
      return new DomainError("INTERNAL_ERROR", error.message);
  }
}

// ─── Action context ───────────────────────────────────────────────────────

export interface ActionContext {
  userId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  correlationId: string;
}

type Handler<TSchema extends ZodTypeAny, TOutput> = (
  input: zType.infer<TSchema>,
  ctx: ActionContext
) => Promise<TOutput>;

interface WithActionConfig<TSchema extends ZodTypeAny, TOutput> {
  schema: TSchema;
  handler: Handler<TSchema, TOutput>;
  requireAuth?: boolean;
}

// ─── The wrapper ──────────────────────────────────────────────────────────

export function withAction<TSchema extends ZodTypeAny, TOutput>(
  config: WithActionConfig<TSchema, TOutput>
) {
  const { schema, handler, requireAuth = true } = config;

  return async function action(
    rawInput: unknown
  ): Promise<ActionResult<TOutput>> {
    const correlationId = crypto.randomUUID();

    try {
      const parsed = schema.safeParse(rawInput);
      if (!parsed.success) {
        return actionFailure("VALIDATION_ERROR", "Invalid input", {
          fieldErrors: parsed.error.flatten().fieldErrors as Record<
            string,
            string[]
          >,
          correlationId,
        });
      }

      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (requireAuth && !user) {
        return actionFailure("UNAUTHORIZED", "Not authenticated", {
          correlationId,
        });
      }

      const data = await handler(parsed.data, {
        userId: user?.id ?? "anonymous",
        supabase,
        correlationId,
      });

      return actionSuccess(data);
    } catch (err) {
      if (err instanceof DomainError) {
        console.warn(`[action:${correlationId}] ${err.code}: ${err.message}`);
        return actionFailure(err.code, err.message, { correlationId });
      }

      console.error(`[action:${correlationId}] unexpected`, err);
      return actionFailure(
        "INTERNAL_ERROR",
        "Something went wrong. Please try again.",
        { correlationId }
      );
    }
  };
}

