import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
