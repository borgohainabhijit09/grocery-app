import type { ZodError } from "zod";

export type FormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  id?: string;
};

export function fieldErrorsFrom(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}

type PrismaKnownError = { code?: string; meta?: { target?: string[] | string } };

export function toDbError(err: unknown): FormState {
  const e = err as PrismaKnownError;
  if (e?.code === "P2002") {
    const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(", ") : e.meta?.target;
    return { error: `A record with the same ${target ?? "value"} already exists.` };
  }
  if (e?.code === "P2025") {
    return { error: "Record not found." };
  }
  return { error: err instanceof Error ? err.message : "Something went wrong." };
}
