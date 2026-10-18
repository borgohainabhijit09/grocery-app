import { SignJWT, jwtVerify } from "jose";
import { prisma } from "database";
import { ApiError } from "./api-helpers";

const ALG = "HS256";
const TOKEN_TTL = "30d";

export type ApiUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
};

function secretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-api-secret-change-me";
  return new TextEncoder().encode(secret);
}

/** Issue a long-lived bearer token for the mobile apps. */
export async function signApiToken(user: ApiUser): Promise<string> {
  return new SignJWT({
    role: user.role,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey());
}

export async function verifyApiToken(token: string): Promise<ApiUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      role: (payload.role as string) ?? "CUSTOMER",
      email: (payload.email as string) ?? null,
      name: (payload.name as string) ?? null,
    };
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/** Resolve the bearer token to a live, active user (returns null when absent/invalid). */
export async function getApiUser(request: Request): Promise<ApiUser | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const decoded = await verifyApiToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function requireApiUser(request: Request): Promise<ApiUser> {
  const user = await getApiUser(request);
  if (!user) throw new ApiError(401, "Authentication required.");
  return user;
}

export async function requireApiRole(request: Request, roles: string[]): Promise<ApiUser> {
  const user = await requireApiUser(request);
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "You do not have access to this resource.");
  }
  return user;
}

export const requireStaffApi = (request: Request) =>
  requireApiRole(request, ["ADMIN", "STAFF"]);

export const requireAdminApi = (request: Request) => requireApiRole(request, ["ADMIN"]);
