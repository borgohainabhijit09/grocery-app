import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "database";
import { parseBody, route } from "@/lib/api-helpers";
import { requireApiUser } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: z.enum(["android", "ios"]).default("android"),
});

/** Register (or refresh) an Expo push token for the signed-in user. */
export const POST = route(async (request) => {
  const me = await requireApiUser(request);
  const { token, platform } = await parseBody(schema, request);

  await prisma.deviceToken.upsert({
    where: { token },
    update: { userId: me.id, platform },
    create: { userId: me.id, token, platform },
  });

  return NextResponse.json({ ok: true });
});
