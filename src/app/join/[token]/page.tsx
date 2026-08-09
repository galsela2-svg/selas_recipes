import { Suspense } from "react";
import { JoinFamilyForm } from "@/components/auth/join-family-form";
import { Spinner } from "@/components/ui/spinner";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <Suspense fallback={<Spinner />}>
        <JoinFamilyForm token={token} />
      </Suspense>
    </div>
  );
}
