import { NextResponse } from "next/server";
import { prisma } from "database";
import { addressSchema } from "shared";
import { parseBody, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";
import { serializeAddress } from "@/lib/api-serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const me = await requireApiUser(request);
  const addresses = await prisma.address.findMany({
    where: { userId: me.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items: addresses.map(serializeAddress) });
});

export const POST = route(async (request) => {
  const me = await requireApiUser(request);
  const data = await parseBody(addressSchema, request);

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.address.updateMany({ where: { userId: me.id, isDefault: true }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: {
        userId: me.id,
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

  return NextResponse.json({ address: serializeAddress(address) }, { status: 201 });
});
