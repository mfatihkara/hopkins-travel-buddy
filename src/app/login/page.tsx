import Link from "next/link";
import { Plane, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithEmail,
} from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    error?: string;
    mode?: "signup" | "signin" | "magic";
  }>;
}) {
  const params = await searchParams;
  const mode = params.mode ?? "signin";

  const isSignup = mode === "signup";
  const isMagic = mode === "magic";

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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#3f6fb0] text-primary-foreground shadow-sm">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isSignup ? "Create account" : isMagic ? "Magic link" : "Sign in"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isMagic
              ? "We'll email you a one-time link."
              : isSignup
              ? "Use your .edu email and pick a password."
              : "Welcome back. Sign in with your .edu email."}
          </p>
        </div>

        <Card className="py-0">
          <CardContent className="px-4 py-5">
            <form
              action={
                isMagic
                  ? signInWithEmail
                  : isSignup
                  ? signUpWithPassword
                  : signInWithPassword
              }
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@school.edu"
                  className="h-11"
                />
              </div>

              {!isMagic && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    placeholder={isSignup ? "At least 8 characters" : "Your password"}
                    className="h-11"
                  />
                </div>
              )}

              <Button type="submit" size="xl" className="w-full">
                {isMagic
                  ? "Send magic link"
                  : isSignup
                  ? "Create account"
                  : "Sign in"}
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

        {/* Mode switch */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          {isSignup ? (
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          ) : isMagic ? (
            <p>
              <Link href="/login" className="text-primary font-medium hover:underline">
                Back to password sign in
              </Link>
            </p>
          ) : (
            <>
              <p>
                New here?{" "}
                <Link
                  href="/login?mode=signup"
                  className="text-primary font-medium hover:underline"
                >
                  Create an account
                </Link>
              </p>
              <p>
                Forgot password?{" "}
                <Link
                  href="/login?mode=magic"
                  className="text-primary font-medium hover:underline"
                >
                  Email me a magic link
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
