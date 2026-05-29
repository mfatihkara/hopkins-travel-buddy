import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Plane } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { saveProfile } from "./actions";

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already has a name — skip this page.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  if (profile?.full_name) redirect(params.next ?? "/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">One last step</h1>
          <p className="text-sm text-muted-foreground">
            What should your travel buddies call you?
          </p>
        </div>

        <Card className="py-0">
          <CardContent className="px-4 py-5">
            <form action={saveProfile} className="space-y-4">
              <input type="hidden" name="next" value={params.next ?? "/"} />
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Your name</Label>
                <Input
                  id="full_name"
                  type="text"
                  name="full_name"
                  required
                  autoComplete="name"
                  autoFocus
                  maxLength={80}
                  placeholder="Jane Smith"
                  className="h-11"
                />
              </div>
              {params.error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {params.error}
                </p>
              )}
              <Button type="submit" size="xl" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
