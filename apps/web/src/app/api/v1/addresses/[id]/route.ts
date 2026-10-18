import { NextResponse } from "next/server";
import { prisma } from "database";
import { addressSchema } from "shared";
import { NOT_FOUND, parseBody, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { serializeAddress } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (request, ctx: Ctx) => {
  const me = await requireApiUser(request);
  const { id } = await ctx.params;
  const data = await parseBody(addressSchema, request);

  const existing = await prisma.address.findUnique({ where: { id, userId: me.id } });
  if (!existing) throw NOT_FOUND("Address");

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({ where: { userId: me.id, isDefault: true }, data: { isDefault: false } });
    }
    return tx.address.update({
      where: { id },
      data: {
        label: data.label || null,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2 || null,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        latitude: data.latitude,
        longitude: data.longitude,
        isDefault: data.isDefault,
      },
    });
  });

  return NextResponse.json({ address: serializeAddress(address) });
});

export const DELETE = route(async (request, ctx: Ctx) => {
  const me = await requireApiUser(request);
  const { id } = await ctx.params;
  await prisma.address.delete({ where: { id, userId: me.id } });
  return NextResponse.json({ ok: true });
});
