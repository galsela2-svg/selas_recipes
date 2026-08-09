// A brand-accurate WhatsApp glyph reads more clearly at a glance than a
// generic message-bubble icon for a button whose whole point is "this one
// opens WhatsApp specifically".
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.19 1.25-1.95 1.41-.52.11-1.2.2-3.48-.75-2.92-1.21-4.8-4.17-4.94-4.36-.15-.19-1.18-1.57-1.18-3 0-1.42.75-2.13 1.02-2.42.24-.26.63-.38.99-.38.12 0 .23 0 .33.01.29.01.44.02.63.48.24.58.81 2 .88 2.15.07.15.11.32.02.5-.08.19-.13.3-.26.46-.13.16-.28.35-.4.47-.13.13-.27.27-.12.53.15.26.68 1.12 1.46 1.82 1 .9 1.85 1.18 2.11 1.31.26.13.42.11.57-.06.16-.18.66-.77.84-1.03.18-.26.35-.22.6-.13.24.09 1.55.73 1.82.86.26.13.44.19.5.3.07.11.07.63-.17 1.31Z" />
    </svg>
  );
}
