import { NextResponse } from "next/server";
import type { ZodError, ZodTypeAny, infer as ZodInfer } from "zod";

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;

  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function jsonError(
  message: string,
  status = 400,
  details?: Record<string, string[]>
): NextResponse {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

export function fieldErrorsFrom(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }
}

/** Read the request body and validate it against a Zod schema. */
export async function parseBody<S extends ZodTypeAny>(schema: S, request: Request): Promise<ZodInfer<S>> {
  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, "Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  return parsed.data;
}

/** Validate an arbitrary value against a Zod schema. */
export function parseInput<S extends ZodTypeAny>(schema: S, value: unknown): ZodInfer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(422, "Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }
  return parsed.data;
}

type PrismaKnownError = { code?: string; meta?: { target?: string[] | string } };

/** Convert a thrown error into a JSON error response. */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return jsonError(err.message, err.status, err.details);
  }
  const e = err as PrismaKnownError;
  if (e?.code === "P2002") {
    const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(", ") : e.meta?.target;
    return jsonError(`A record with the same ${target ?? "value"} already exists.`, 409);
  }
  if (e?.code === "P2025") {
    return jsonError("Record not found.", 404);
  }
  console.error("[api:v1]", err);
  return jsonError("Something went wrong.", 500);
}

/** Wrap a route handler so thrown errors become JSON responses. */
export function route<T extends unknown[]>(
  handler: (request: Request, ...args: T) => Promise<NextResponse>
) {
  return async (request: Request, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (err) {
      return handleError(err);
    }
  };
}

export const UNAUTHORIZED = () => new ApiError(401, "Authentication required.");
export const FORBIDDEN = () => new ApiError(403, "You do not have access to this resource.");
export const NOT_FOUND = (what = "Resource") => new ApiError(404, `${what} not found.`);
