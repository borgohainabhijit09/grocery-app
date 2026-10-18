import { Suspense } from "react";
import { OtpLoginForm } from "./otp-form";

export const metadata = { title: "Log in with mobile" };

export default function OtpLoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <Suspense fallback={null}>
        <OtpLoginForm />
      </Suspense>
    </div>
  );
}
