import { Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function TripCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="px-4 py-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-14 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="min-h-dvh pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-4 w-4" />
            </div>
            <span className="font-semibold">Travel Buddy</span>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-8">
        <section className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <TripCardSkeleton />
        </section>
        <section className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </section>
      </div>
    </main>
  );
}
