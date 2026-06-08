import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, User, Phone, Camera, ShieldOff } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateProfile } from "./actions";
import { unblockUser } from "@/app/safety/actions";

// Avatar uploads relay through this server before reaching Supabase Storage,
// which can take longer than the platform's default function timeout on slow
// mobile connections. Give Server Actions on this page more room to finish.
export const maxDuration = 60;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type BlockedProfile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
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

  // People the current user has blocked (so they can unblock them here).
  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  const blockedIds = (blocks ?? []).map((b) => b.blocked_id as string);
  let blockedProfiles: BlockedProfile[] = [];
  if (blockedIds.length > 0) {
    const { data: bp } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", blockedIds);
    blockedProfiles = (bp ?? []) as BlockedProfile[];
  }

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

      <section className="mx-auto max-w-md px-4 pb-[max(env(safe-area-inset-bottom),2rem)] space-y-2">
        {params.message && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
            {params.message}
          </div>
        )}

        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pt-2">
          <ShieldOff className="h-3.5 w-3.5" />
          Blocked people
        </h2>
        <Card className="py-0">
          <CardContent className="px-0 py-0">
            {blockedProfiles.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                You haven&apos;t blocked anyone.
              </p>
            ) : (
              <ul className="divide-y">
                {blockedProfiles.map((b) => {
                  const bName =
                    b.full_name ?? b.email?.split("@")[0] ?? "Member";
                  return (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Avatar size="lg" className="shrink-0">
                        {b.avatar_url && (
                          <AvatarImage src={b.avatar_url} alt={bName} />
                        )}
                        <AvatarFallback className="bg-muted text-sm font-semibold text-muted-foreground">
                          {initials(bName)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="min-w-0 flex-1 font-medium leading-tight truncate">
                        {bName}
                      </p>
                      <form action={unblockUser}>
                        <input type="hidden" name="blocked_id" value={b.id} />
                        <input
                          type="hidden"
                          name="redirect_to"
                          value="/profile/edit"
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Unblock
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
