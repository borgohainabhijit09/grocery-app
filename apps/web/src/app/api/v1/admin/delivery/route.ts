import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "database";
import { ApiError, parseBody, route } from "@/lib/api-helpers";
import { requireAdminApi, requireStaffApi } from "@/lib/api-auth";
import { serializeDeliveryPartner } from "@/lib/api-admin-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPEN_STATUSES = ["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

/** Delivery partners with their open-order counts. */
export const GET = route(async (request) => {
  await requireStaffApi(request);

  const partners = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, isActive: true },
  });

  const openCounts = await prisma.order.groupBy({
    by: ["deliveryPartnerId"],
    where: { deliveryPartnerId: { not: null }, status: { in: [...OPEN_STATUSES] } },
    _count: { _all: true },
  });
  const countByPartner = new Map(
    openCounts.filter((c) => c.deliveryPartnerId).map((c) => [c.deliveryPartnerId as string, c._count._all])
  );

  return NextResponse.json({
    items: partners.map((p) => serializeDeliveryPartner(p, countByPartner.get(p.id) ?? 0)),
  });
});

/** Create a delivery partner (admin only). */
export const POST = route(async (request) => {
  await requireAdminApi(request);
  const { name, email, phone, password } = await parseBody(createSchema, request);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    select: { id: true },
  });
  if (existing) throw new ApiError(409, "A user with this email or phone already exists.");

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      password: await bcrypt.hash(password, 10),
      role: "DELIVERY",
    },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
});
