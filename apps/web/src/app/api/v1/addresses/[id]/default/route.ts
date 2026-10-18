import { NextResponse } from "next/server";
import { prisma } from "database";
import { NOT_FOUND, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { serializeAddress } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Mark an address as the default (clears the flag on others). */
export const POST = route(async (request, ctx: Ctx) => {
  const me = await requireApiUser(request);
  const { id } = await ctx.params;

  const existing = await prisma.address.findUnique({ where: { id, userId: me.id } });
  if (!existing) throw NOT_FOUND("Address");

  const address = await prisma.$transaction(async (tx) => {
    await tx.address.updateMany({ where: { userId: me.id, isDefault: true }, data: { isDefault: false } });
    return tx.address.update({ where: { id }, data: { isDefault: true } });
  });

  return NextResponse.json({ address: serializeAddress(address) });
});
