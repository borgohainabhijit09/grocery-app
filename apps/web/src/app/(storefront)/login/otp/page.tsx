import { OtpLoginForm } from "./otp-form";

export const metadata = { title: "Log in with mobile" };

export default async function OtpLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <OtpLoginForm next={safeNext} />
    </div>
  );
}
