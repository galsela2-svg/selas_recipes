import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { Spinner } from "@/components/ui/spinner";

export default function JoinAppPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <Suspense fallback={<Spinner />}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
