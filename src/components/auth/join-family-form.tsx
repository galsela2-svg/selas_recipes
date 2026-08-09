"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Users, ChefHat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserId } from "@/lib/queries/auth";
import { useInvitePreview, useRedeemInvite } from "@/lib/queries/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/providers/toast-provider";
import { describeError } from "@/lib/utils";

export function JoinFamilyForm({ token }: { token: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: userId, isLoading: userLoading } = useCurrentUserId();
  const { data: invite, isLoading: inviteLoading, isError: inviteError } = useInvitePreview(token);
  const redeemInvite = useRedeemInvite();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const loadingInitial = userLoading || inviteLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("יש להזין שם תצוגה.");
      return;
    }

    setLoading(true);
    try {
      if (!userId) {
        const supabase = createClient();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          // Email confirmation is required before a session exists — the
          // invite can't be redeemed (needs auth.uid()) until they confirm
          // and come back to this same link.
          setAwaitingConfirmation(true);
          setLoading(false);
          return;
        }
      }

      await redeemInvite.mutateAsync({ token, displayName });
      showToast(`הצטרפת למשפחת ${invite?.family_name ?? ""} בהצלחה!`);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(describeError(err, "משהו השתבש. נסו שוב."));
      setLoading(false);
    }
  }

  if (loadingInitial) {
    return <Spinner />;
  }

  if (inviteError || !invite || !invite.is_valid) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-danger/15 text-danger">
          <Users className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">הקישור לא תקין</h1>
        <p className="mt-2 text-sm text-muted">
          קישור ההזמנה פג תוקף או שכבר נעשה בו שימוש. בקשו מבן המשפחה קישור הזמנה חדש.
        </p>
      </div>
    );
  }

  if (awaitingConfirmation) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <ChefHat className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">כמעט סיימנו</h1>
        <p className="mt-2 text-sm text-muted">
          שלחנו מייל אימות לכתובת שהזנתם. אחרי שתאשרו אותו, חזרו לקישור ההזמנה הזה כדי להצטרף
          למשפחת {invite.family_name}.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Users className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">הצטרפות למשפחת {invite.family_name}</h1>
        <p className="text-sm text-muted">
          {userId
            ? "בחרו שם תצוגה כדי להצטרף לספר המתכונים המשותף."
            : "צרו חשבון כדי להצטרף לספר המתכונים המשותף."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="displayName" className="text-sm font-medium text-foreground">
            שם תצוגה
          </label>
          <Input
            id="displayName"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="לדוגמה: דנה"
          />
        </div>

        {!userId && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                אימייל
              </label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                סיסמה
              </label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          הצטרפות למשפחה
        </Button>
      </form>
    </div>
  );
}
