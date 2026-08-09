"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserId } from "@/lib/queries/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { describeError } from "@/lib/utils";

/** The general "come use this app" entry point (shared from Settings) —
 * unlike /join/[token], this doesn't redeem a family invite. It just
 * creates an account; the family-less middleware gate then lands you on
 * /family to either create your own (solo) family or start a shared one. */
export function SignupForm() {
  const router = useRouter();
  const { data: userId, isLoading: userLoading } = useCurrentUserId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  if (userLoading) return <Spinner />;

  if (userId) {
    router.replace("/dashboard");
    return <Spinner />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(describeError(signUpError, "משהו השתבש. נסו שוב."));
      setLoading(false);
      return;
    }

    if (!data.session) {
      setAwaitingConfirmation(true);
      setLoading(false);
      return;
    }

    router.replace("/family");
    router.refresh();
  }

  if (awaitingConfirmation) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <ChefHat className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">כמעט סיימנו</h1>
        <p className="mt-2 text-sm text-muted">
          שלחנו מייל אימות לכתובת שהזנתם. אחרי שתאשרו אותו, חזרו והתחברו כדי להתחיל.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <ChefHat className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">יצירת חשבון</h1>
        <p className="text-sm text-muted">
          אחרי ההרשמה תוכלו להשתמש באפליקציה לבד, או לפתוח משפחה ולהזמין אליה אנשים.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          יצירת חשבון
        </Button>
      </form>
    </div>
  );
}
