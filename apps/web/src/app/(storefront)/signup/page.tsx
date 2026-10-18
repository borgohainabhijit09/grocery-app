import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <SignupForm />
    </div>
  );
}
