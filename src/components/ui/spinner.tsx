import Image from "next/image";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[60vh] items-center justify-center", className)}>
      <Image
        src="/logo.png"
        alt=""
        width={128}
        height={128}
        className="size-32 animate-spin"
        style={{ animationDuration: "2s" }}
        priority
      />
    </div>
  );
}
