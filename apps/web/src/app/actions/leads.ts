"use server";

import { prisma } from "database";
import { phoneSchema } from "shared";

export type LeadResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function captureLeadAction(
  _prev: LeadResult | undefined,
  formData: FormData
): Promise<LeadResult> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const fieldErrors: Record<string, string[]> = {};
  if (name.length < 2) fieldErrors.name = ["Please enter your name"];

  const phoneCheck = phoneSchema.safeParse(phone);
  if (!phoneCheck.success) {
    fieldErrors.phone = [phoneCheck.error.issues[0]?.message ?? "Enter a valid mobile number"];
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = ["Enter a valid email address"];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    await prisma.auditLog.create({
      data: {
        action: "LEAD_CAPTURE",
        entity: "Lead",
        diff: {
          name,
          phone,
          email: email || null,
          message: message || null,
          source: "home-popup",
        },
      },
    });
    return { ok: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
