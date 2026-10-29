import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "database";
import bcrypt from "bcryptjs";
import { loginSchema, otpVerifySchema } from "shared";
import { verifyOtp } from "@/lib/otp";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.isActive || !user.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: "otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = otpVerifySchema.safeParse({
          phone: credentials?.phone,
          code: credentials?.code,
        });
        if (!parsed.success) return null;

        const result = await verifyOtp({
          phone: parsed.data.phone,
          code: parsed.data.code,
          purpose: "LOGIN",
        });
        if (!result.ok) return null;

        const user = await prisma.user.findUnique({
          where: { phone: parsed.data.phone },
        });
        if (!user || !user.isActive) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Google OAuth: find or create DB user, auto-link by email
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email as string;
        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: (profile.name as string | undefined) ?? email.split("@")[0],
              email,
              role: "CUSTOMER",
            },
          });
        }

        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLoginAt: new Date() },
        });

        token.id = dbUser.id;
        token.role = dbUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as string) ?? "CUSTOMER";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
});
