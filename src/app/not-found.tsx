import Link from "next/link";
import { Plane } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Plane className="h-8 w-8 -rotate-45" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Lost your way?</h1>
          <p className="text-muted-foreground">
            We couldn&apos;t find that page. It may have moved, or it never
            existed.
          </p>
        </div>
        <Link
          href="/"
          className={buttonVariants({ size: "xl", className: "w-full" })}
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
