import { ApiError } from "./api";

export function errMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

export function firstFieldError(
  err: unknown,
  field: string
): string | null {
  if (err instanceof ApiError && err.details && err.details[field]?.length) {
    return err.details[field][0];
  }
  return null;
}
