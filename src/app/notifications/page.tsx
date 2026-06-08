import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Bell, Users, MessageCircle, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

type Notification = {
  id: string;
  type: "match" | "message" | "reminder";
  title: string;
  body: string | null;
  link: string;
  read_at: string | null;
  created_at: string;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(iso));
}

function iconFor(type: Notification["type"]) {
  if (type === "match") return Users;
  if (type === "message") return MessageCircle;
  return Clock;
}

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data ?? []) as Notification[];

  // Mark everything read now that they've opened the list. The unread dots
  // below still reflect what was new on this visit.
  if (notifications.some((n) => !n.read_at)) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
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
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6">
        {notifications.length === 0 ? (
          <Card className="py-0">
            <CardContent className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up. Matches, messages, and ride reminders
                will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="py-0">
            <CardContent className="px-0 py-0">
              <ul className="divide-y">
                {notifications.map((n) => {
                  const Icon = iconFor(n.type);
                  const unread = !n.read_at;
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.link}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="relative shrink-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          {unread && (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={
                              "text-sm leading-tight " +
                              (unread ? "font-semibold" : "font-medium")
                            }
                          >
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {n.body}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {relativeTime(n.created_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
