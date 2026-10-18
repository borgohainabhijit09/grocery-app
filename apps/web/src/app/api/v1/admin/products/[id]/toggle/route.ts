import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "database";
import { parseBody, route } from "@/lib/api-helpers";
import { requireStaffApi } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  field: z.enum(["isActive", "isFeatured"]),
  value: z.coerce.boolean(),
});

type Ctx = { params: Promise<{ id: string }> };

/** Toggle a product's isActive / isFeatured flag. */
export const PATCH = route(async (request, ctx: Ctx) => {
  await requireStaffApi(request);
  const { id } = await ctx.params;
  const { field, value } = await parseBody(schema, request);

  await prisma.product.update({ where: { id }, data: { [field]: value } });
  return NextResponse.json({ ok: true });
});
