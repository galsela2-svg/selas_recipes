"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  ChevronLeft,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Package,
  ShoppingCart,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/components/providers/settings-provider";
import { ACCENT_PRESETS, type ThemeMode } from "@/lib/settings-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "בהיר", icon: Sun },
  { value: "dark", label: "כהה", icon: Moon },
  { value: "system", label: "מערכת", icon: Monitor },
];

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {control}
    </div>
  );
}

function LinkRow({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Package;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
    >
      <Icon className="size-4.5 shrink-0 text-muted" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <ChevronLeft className="size-4 shrink-0 text-muted" />
    </Link>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSetting] = useSettings();
  const [email, setEmail] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("הסיסמה חייבת להכיל לפחות 6 תווים.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("הסיסמאות אינן תואמות.");
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError("לא הצלחנו לעדכן את הסיסמה. נסו שוב.");
      return;
    }

    setPasswordSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">הגדרות</h1>
        <p className="text-sm text-muted">התאימו את האפליקציה בדיוק כמו שנוח לכם.</p>
      </div>

      <SettingsSection title="מראה">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-foreground">ערכת נושא</p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSetting("theme", value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium cursor-pointer transition-colors",
                  settings.theme === value
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border text-muted hover:border-accent/50",
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-foreground">צבע מבטא</p>
          <div className="flex flex-wrap gap-3">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSetting("accentId", preset.id)}
                title={preset.name}
                className="flex size-10 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface cursor-pointer transition-shadow"
                style={{
                  backgroundColor: preset.color,
                  ["--tw-ring-color" as string]:
                    settings.accentId === preset.id ? preset.color : "transparent",
                }}
              >
                {settings.accentId === preset.id && (
                  <Check className="size-4" style={{ color: preset.foreground }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="יחידות ובישול">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">שיטת מדידה ברירת מחדל</p>
          <p className="mb-3 text-xs text-muted">
            מה יוצג בפתיחת מתכון, לפני שתחליפו ידנית.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSetting("defaultUnitSystem", "metric")}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                settings.defaultUnitSystem === "metric"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:border-accent/50",
              )}
            >
              מטרי
            </button>
            <button
              onClick={() => setSetting("defaultUnitSystem", "imperial")}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium cursor-pointer transition-colors",
                settings.defaultUnitSystem === "imperial"
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:border-accent/50",
              )}
            >
              אימפריאלי
            </button>
          </div>
        </div>

        <SettingsRow
          label="מניעת נעילת מסך במצב בישול"
          description="שימושי כשהידיים עסוקות ולא נוגעים בטלפון."
          control={
            <Switch
              checked={settings.keepScreenAwake}
              onChange={(v) => setSetting("keepScreenAwake", v)}
            />
          }
        />

        <SettingsRow
          label="צליל טיימר"
          description="השמעת צליל כשטיימר מסתיים."
          control={
            <div className="flex items-center gap-2">
              {settings.timerSoundEnabled ? (
                <Volume2 className="size-4 text-muted" />
              ) : (
                <VolumeX className="size-4 text-muted" />
              )}
              <Switch
                checked={settings.timerSoundEnabled}
                onChange={(v) => setSetting("timerSoundEnabled", v)}
              />
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection title="רשימת קניות">
        <SettingsRow
          label="דלגו על מרכיבים שיש במזווה"
          description='בלחיצה על "הוספה לרשימת קניות" בעמוד מתכון.'
          control={
            <Switch
              checked={settings.autoHidePantryItems}
              onChange={(v) => setSetting("autoHidePantryItems", v)}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="נתונים">
        <LinkRow href="/pantry" label="המזווה שלי" icon={Package} />
        <LinkRow href="/shopping-list" label="רשימת קניות ופריטים נפוצים" icon={ShoppingCart} />
        <LinkRow href="/export" label="ייצוא, גיבוי וספר מתכונים" icon={BookOpen} />
      </SettingsSection>

      <SettingsSection title="חשבון">
        {email && (
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-xs text-muted">מחוברים כ-</p>
            <p className="text-sm font-medium text-foreground" dir="ltr">
              {email}
            </p>
          </div>
        )}

        {!showPasswordForm ? (
          <button
            onClick={() => {
              setShowPasswordForm(true);
              setPasswordSuccess(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start hover:bg-surface-2 cursor-pointer"
          >
            <KeyRound className="size-4.5 shrink-0 text-muted" />
            <span className="flex-1 text-sm font-medium text-foreground">שינוי סיסמה</span>
          </button>
        ) : (
          <form
            onSubmit={handleChangePassword}
            className="space-y-3 rounded-xl border border-border bg-surface p-4"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">סיסמה חדשה</label>
              <Input
                type="password"
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">אימות סיסמה</label>
              <Input
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPasswordForm(false)}
              >
                ביטול
              </Button>
              <Button type="submit" loading={savingPassword}>
                עדכון סיסמה
              </Button>
            </div>
          </form>
        )}

        {passwordSuccess && (
          <p className="text-sm text-success">הסיסמה עודכנה בהצלחה.</p>
        )}

        <Button variant="danger" className="w-full" onClick={handleSignOut}>
          <LogOut className="size-4" />
          התנתקות
        </Button>
      </SettingsSection>
    </div>
  );
}
