import { ArrowLeft, Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plane className="h-4 w-4" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <section className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Card className="py-0">
            <CardContent className="px-0 py-0">
              <ul className="divide-y">
                {[0, 1].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Card className="py-0 overflow-hidden">
            <div className="h-[28rem] space-y-3 bg-muted/30 p-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="ml-auto h-10 w-1/2" />
              <Skeleton className="h-10 w-3/5" />
              <Skeleton className="ml-auto h-10 w-2/5" />
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
