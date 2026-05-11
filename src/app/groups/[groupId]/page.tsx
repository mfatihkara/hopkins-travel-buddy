import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Plane, MapPin, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import Chat from "./Chat";

const TZ = "America/New_York";

function formatWindow(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: TZ,
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
  return `${dateFmt.format(s)} · ${timeFmt.format(s)} – ${timeFmt.format(e)}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Trip = {
  id: string;
  user_id: string;
  pickup_area: string;
  depart_window_start: string;
  depart_window_end: string;
  profiles: { email: string; full_name: string | null } | null;
};

type Message = {
  id: string;
  group_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group }, { data: tripsData }, { data: messagesData }] =
    await Promise.all([
      supabase
        .from("trip_groups")
        .select("id, airport, created_at")
        .eq("id", groupId)
        .maybeSingle(),
      supabase
        .from("trips")
        .select(
          "id, user_id, pickup_area, depart_window_start, depart_window_end, profiles ( email, full_name )",
        )
        .eq("group_id", groupId)
        .order("depart_window_start", { ascending: true }),
      supabase
        .from("messages")
        .select("id, group_id, user_id, body, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(100),
    ]);

  if (!group) notFound();

  const trips = (tripsData ?? []) as unknown as Trip[];
  const initialMessages = (messagesData ?? []) as Message[];

  const iAmMember = trips.some((t) => t.user_id === user.id);
  if (!iAmMember) {
    redirect("/?error=" + encodeURIComponent("You're not in this group."));
  }

  const seen = new Set<string>();
  const members = trips.flatMap((t) => {
    if (seen.has(t.user_id)) return [];
    seen.add(t.user_id);
    return [
      {
        user_id: t.user_id,
        full_name: t.profiles?.full_name ?? null,
        email: t.profiles?.email ?? "",
      },
    ];
  });

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plane className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                Trip to {group.airport}
              </h1>
              <p className="text-xs text-muted-foreground">
                {members.length}{" "}
                {members.length === 1 ? "person" : "people"} matched
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Members
          </h2>
          <Card className="py-0">
            <CardContent className="px-0 py-0">
              <ul className="divide-y">
                {trips.map((t) => {
                  const name =
                    t.profiles?.full_name ??
                    t.profiles?.email.split("@")[0] ??
                    "Member";
                  const isMe = t.user_id === user.id;
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {initials(name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-tight truncate">
                          {name}
                          {isMe && (
                            <span className="ml-1 text-muted-foreground font-normal">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatWindow(
                            t.depart_window_start,
                            t.depart_window_end,
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {t.pickup_area}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chat
          </h2>
          <Chat
            groupId={groupId}
            currentUserId={user.id}
            initialMessages={initialMessages}
            members={members}
          />
        </section>
      </div>
    </main>
  );
}
