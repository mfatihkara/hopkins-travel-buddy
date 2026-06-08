import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Plane, MapPin, Clock, LogOut, Flag, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Chat from "./Chat";
import RatingStars from "./RatingStars";
import { leaveGroup } from "./actions";

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
  profiles: { email: string; full_name: string | null; avatar_url: string | null } | null;
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
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { groupId } = await params;
  const { error: errorMsg, message } = await searchParams;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group }, { data: tripsData }, { data: messagesData }, { count: messageCount }] =
    await Promise.all([
      supabase
        .from("trip_groups")
        .select("id, airport, created_at")
        .eq("id", groupId)
        .maybeSingle(),
      supabase
        .from("trips")
        .select(
          "id, user_id, pickup_area, depart_window_start, depart_window_end, profiles ( email, full_name, avatar_url )",
        )
        .eq("group_id", groupId)
        .order("depart_window_start", { ascending: true }),
      supabase
        .from("messages")
        .select("id, group_id, user_id, body, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId),
    ]);

  if (!group) notFound();

  const trips = (tripsData ?? []) as unknown as Trip[];
  const initialMessages = ((messagesData ?? []) as Message[]).reverse(); // newest-last for display

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
        avatar_url: t.profiles?.avatar_url ?? null,
      },
    ];
  });

  // The ride is "done" (and thus rateable) once my own window has passed.
  const myTrip = trips.find((t) => t.user_id === user.id);
  const rideCompleted =
    !!myTrip && new Date(myTrip.depart_window_end) < new Date();

  // My existing ratings for this group + everyone's public rating summary.
  const memberIds = members.map((m) => m.user_id);
  const [{ data: myRatingsData }, { data: summaryData }] = await Promise.all([
    supabase
      .from("ratings")
      .select("ratee_id, score")
      .eq("rater_id", user.id)
      .eq("group_id", groupId),
    supabase
      .from("profile_ratings")
      .select("user_id, avg_score, rating_count")
      .in("user_id", memberIds),
  ]);

  const myRatings = new Map<string, number>(
    (myRatingsData ?? []).map((r) => [r.ratee_id as string, r.score as number]),
  );
  const summaries = new Map<
    string,
    { avg: number; count: number }
  >(
    (summaryData ?? []).map((s) => [
      s.user_id as string,
      { avg: Number(s.avg_score), count: s.rating_count as number },
    ]),
  );

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
          <div className="flex flex-1 items-center gap-2">
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
          <form action={leaveGroup}>
            <input type="hidden" name="group_id" value={groupId} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Leave
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {message && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {errorMsg}
          </div>
        )}

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
                  const summary = summaries.get(t.user_id);
                  const myScore = myRatings.get(t.user_id) ?? 0;
                  return (
                    <li key={t.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar size="lg" className="shrink-0">
                          {t.profiles?.avatar_url && (
                            <AvatarImage src={t.profiles.avatar_url} alt={name} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight truncate">
                            {name}
                            {isMe && (
                              <span className="ml-1 text-muted-foreground font-normal">
                                (you)
                              </span>
                            )}
                            {summary && (
                              <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-xs font-normal text-muted-foreground">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {summary.avg.toFixed(1)}
                                <span className="text-muted-foreground/70">
                                  ({summary.count})
                                </span>
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
                        {!isMe && (
                          <Link
                            href={`/report/${t.user_id}?from=${encodeURIComponent(
                              `/groups/${groupId}`,
                            )}`}
                            aria-label={`Report or block ${name}`}
                            title="Report or block"
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                              className:
                                "shrink-0 text-muted-foreground hover:text-destructive",
                            })}
                          >
                            <Flag className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                      {!isMe && rideCompleted && (
                        <div className="mt-2 flex items-center gap-2 pl-[3.75rem]">
                          <span className="text-xs text-muted-foreground">
                            {myScore ? "Your rating" : "Rate this ride"}
                          </span>
                          <RatingStars
                            groupId={groupId}
                            rateeId={t.user_id}
                            current={myScore}
                          />
                        </div>
                      )}
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
            totalMessages={messageCount ?? 0}
          />
        </section>
      </div>
    </main>
  );
}
