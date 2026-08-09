"use client";

import { useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { formatRecipeForSharing, shareToWhatsApp } from "@/lib/share-recipe";
import { useCreateRecipeShare } from "@/lib/queries/recipe-shares";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { describeError } from "@/lib/utils";

export function ShareRecipeButton({ recipe }: { recipe: Recipe }) {
  const { showToast } = useToast();
  const createShare = useCreateRecipeShare();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const canUseNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  function shareText() {
    return formatRecipeForSharing(recipe);
  }

  async function handleCreateAppLink() {
    try {
      const share = await createShare.mutateAsync(recipe.id);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setShareLink(`${origin}/shared/${share.token}`);
    } catch (err) {
      showToast(describeError(err, "לא הצלחנו ליצור קישור שיתוף."));
    }
  }

  async function handleCopyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      showToast("הקישור הועתק!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showToast("ההעתקה נכשלה. נסו שוב.");
    }
  }

  function handleWhatsAppLink() {
    if (!shareLink) return;
    shareToWhatsApp(`הנה מתכון בשבילך — ${recipe.title}: ${shareLink}`);
  }

  function closeModal() {
    setOpen(false);
    setShareLink(null);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: recipe.title, text: shareText() });
      setOpen(false);
    } catch {
      // Cancelled by the user, or unsupported mid-flow — leave the modal
      // open so the other options are still reachable.
    }
  }

  function handleWhatsApp() {
    shareToWhatsApp(shareText());
    setOpen(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      showToast("המתכון הועתק!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("ההעתקה נכשלה. נסו שוב.");
    }
  }

  return (
    <>
      <Button variant="ghost" title="שיתוף" aria-label="שיתוף" onClick={() => setOpen(true)}>
        <Share2 className="size-4" />
      </Button>

      <Modal open={open} onClose={closeModal} title="שיתוף המתכון">
        {shareLink ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              כל מי שרשום לאפליקציה ופותח את הקישור הזה יכול לצפות במתכון ולהוסיף אותו לאוסף
              שלו.
            </p>
            <p className="truncate rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-muted" dir="ltr">
              {shareLink}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleCopyLink}>
                {linkCopied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                העתקת קישור
              </Button>
              <Button variant="secondary" className="flex-1" onClick={handleWhatsAppLink}>
                <WhatsAppIcon className="size-4" />
                וואטסאפ
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setShareLink(null)}>
              חזרה לאפשרויות שיתוף
            </Button>
          </div>
        ) : (
        <div className="space-y-2">
          {canUseNativeShare && (
            <button
              onClick={handleNativeShare}
              className="flex w-full items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-start transition-colors hover:bg-accent/15 cursor-pointer"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                <Share2 className="size-4.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">שיתוף מהמכשיר</span>
                <span className="block text-xs text-muted">
                  וואטסאפ, מייל, הודעות ועוד — לפי מה שמותקן אצלכם
                </span>
              </span>
            </button>
          )}

          <button
            onClick={handleWhatsApp}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start transition-colors hover:bg-surface-2 cursor-pointer"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
              <WhatsAppIcon className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">וואטסאפ</span>
              <span className="block text-xs text-muted">פתיחה עם המתכון מוכן לשליחה</span>
            </span>
          </button>

          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start transition-colors hover:bg-surface-2 cursor-pointer"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
              {copied ? <Check className="size-4.5 text-success" /> : <Copy className="size-4.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">העתקת טקסט</span>
              <span className="block text-xs text-muted">להדבקה בכל מקום שתרצו</span>
            </span>
          </button>

          <button
            onClick={handleCreateAppLink}
            disabled={createShare.isPending}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-start transition-colors hover:bg-surface-2 cursor-pointer disabled:opacity-50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Link2 className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                שליחה למשתמש באפליקציה
              </span>
              <span className="block text-xs text-muted">
                קישור למתכון המלא, גם למי שלא במשפחה שלכם
              </span>
            </span>
          </button>
        </div>
        )}
      </Modal>
    </>
  );
}
