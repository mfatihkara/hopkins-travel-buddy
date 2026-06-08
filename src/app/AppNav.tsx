"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bell, User, Plus, LogOut, Plane } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: boolean;
};

const ITEMS: Item[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: true },
  { href: "/profile/edit", label: "Profile", icon: User },
];

function useUnread(userId: string, initial: number) {
  const [unread, setUnread] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`nav-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => setUnread((u) => u + 1),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Opening the notifications page marks everything read on the server, so
  // clear the badge optimistically when the user taps through.
  return { unread, clear: () => setUnread(0) };
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-2 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export default function AppNav({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number;
}) {
  const pathname = usePathname();
  const { unread, clear } = useUnread(userId, initialUnread);

  return (
    <>
      {/* Desktop: persistent left sidebar */}
      <aside className="hidden border-r bg-background px-3 py-4 md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col">
        <div className="flex items-center gap-2 px-2 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plane className="h-4 w-4" />
          </div>
          <span className="font-semibold">Travel Buddy</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((it) => {
            const active = isActive(pathname, it.href);
            const showBadge = it.badge && unread > 0;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={it.badge ? clear : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="relative">
                  <it.icon className="h-5 w-5" />
                  {showBadge && <Badge count={unread} />}
                </span>
                {it.label}
              </Link>
            );
          })}

          <Link
            href="/trips/new"
            className={buttonVariants({
              size: "lg",
              className: "mt-2 justify-start gap-3",
            })}
          >
            <Plus className="h-5 w-5" />
            Post a trip
          </Link>
        </nav>

        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </form>
      </aside>

      {/* Mobile: bottom tab bar (Home · Notifications · + · Profile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1.5 backdrop-blur md:hidden">
        <TabLink item={ITEMS[0]} pathname={pathname} unread={unread} />
        <TabLink
          item={ITEMS[1]}
          pathname={pathname}
          unread={unread}
          onClick={clear}
        />
        <Link
          href="/trips/new"
          aria-label="Post a trip"
          className="flex flex-1 flex-col items-center justify-center px-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-5 w-5" />
          </span>
        </Link>
        <TabLink item={ITEMS[2]} pathname={pathname} unread={unread} />
      </nav>
    </>
  );
}

function TabLink({
  item,
  pathname,
  unread,
  onClick,
}: {
  item: Item;
  pathname: string;
  unread: number;
  onClick?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const showBadge = item.badge && unread > 0;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[10px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {showBadge && <Badge count={unread} />}
      </span>
      {item.label}
    </Link>
  );
}
