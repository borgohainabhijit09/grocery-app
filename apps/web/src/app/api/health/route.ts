import { NextResponse } from "next/server";
import { prisma } from "database";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  return NextResponse.json({
    ok: true,
    service: "grocery-web",
    version: "0.1.0",
    db,
    time: new Date().toISOString(),
  });
}
