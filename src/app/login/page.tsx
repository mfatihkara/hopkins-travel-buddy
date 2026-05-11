import Link from "next/link";
import { Plane, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { signInWithEmail } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use your @jhu.edu or @jh.edu email.
            <br />
            We&apos;ll send you a magic link.
          </p>
        </div>

        <Card className="py-0">
          <CardContent className="px-4 py-5">
            <form action={signInWithEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@jhu.edu"
                  className="h-11"
                />
              </div>
              <Button type="submit" size="xl" className="w-full">
                Send magic link
              </Button>
              {params.message && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  {params.message}
                </p>
              )}
              {params.error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {params.error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
