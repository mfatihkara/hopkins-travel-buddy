import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, User, Phone, Camera } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateProfile } from "./actions";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone_number, avatar_url, email")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name ?? "";

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Edit profile</h1>
        </div>
      </header>

      <form
        action={updateProfile}
        encType="multipart/form-data"
        className="mx-auto max-w-md px-4 py-6 space-y-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <Card className="py-0">
          <CardContent className="px-4 py-5 space-y-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar size="lg">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <Label
                htmlFor="avatar"
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary"
              >
                <Camera className="h-4 w-4" />
                Change photo
              </Label>
              <input
                id="avatar"
                type="file"
                name="avatar"
                accept="image/*"
                className="sr-only"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                Your name
              </Label>
              <Input
                id="full_name"
                type="text"
                name="full_name"
                required
                autoComplete="name"
                maxLength={80}
                defaultValue={name}
                placeholder="Jane Smith"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone_number" className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone number
              </Label>
              <Input
                id="phone_number"
                type="tel"
                name="phone_number"
                autoComplete="tel"
                maxLength={20}
                defaultValue={profile?.phone_number ?? ""}
                placeholder="(443) 555-0192"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Optional — lets us text you ride and driver updates down the
                road. Only ever shared with your matched ride group.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-muted-foreground">School email</Label>
              <p className="text-sm">{profile?.email}</p>
            </div>
          </CardContent>
        </Card>

        {params.error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {params.error}
          </div>
        )}

        <Button type="submit" size="xl" className="w-full">
          Save changes
        </Button>
      </form>
    </main>
  );
}
