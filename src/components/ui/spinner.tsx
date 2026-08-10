import Image from "next/image";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center", className)}>
      <Image src="/logo.png" alt="" width={64} height={64} className="size-16 animate-spin" priority />
    </div>
  );
}
