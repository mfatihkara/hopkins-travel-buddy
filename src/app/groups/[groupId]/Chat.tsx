"use client";

import { useEffect, useRef, useState } from "react";
import { Send, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type Message = {
  id: string;
  group_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type Member = {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

const TZ = "America/New_York";

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export default function Chat({
  groupId,
  currentUserId,
  initialMessages,
  members,
  totalMessages,
}: {
  groupId: string;
  currentUserId: string;
  initialMessages: Message[];
  members: Member[];
  totalMessages: number;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const memberByUserId = new Map(members.map((m) => [m.user_id, m]));

  // Whether there are older messages not yet loaded
  const hasMore = messages.length < totalMessages;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Scroll to bottom only on new messages (not when loading older ones)
  const prevLengthRef = useRef(initialMessages.length);
  useEffect(() => {
    const prev = prevLengthRef.current;
    prevLengthRef.current = messages.length;
    // Only scroll if messages were appended at the end (new message), not prepended
    if (messages.length > prev) {
      const lastNew = messages[messages.length - 1];
      const lastOld = messages[prev - 1];
      if (!lastOld || lastNew.created_at >= lastOld.created_at) {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages]);

  // Scroll to bottom on first render
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const supabase = createClient();
    const oldest = messages[0];

    const { data, error } = await supabase
      .from("messages")
      .select("id, group_id, user_id, body, created_at")
      .eq("group_id", groupId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    setLoadingMore(false);

    if (error) {
      toast.error("Couldn't load older messages.");
      return;
    }

    if (data && data.length > 0) {
      const older = (data as Message[]).reverse();
      // Preserve scroll position — measure before prepend, restore after
      const el = scrollRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...prev];
      });
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ group_id: groupId, user_id: currentUserId, body })
      .select()
      .single();

    setSending(false);
    if (error) {
      setInput(body);
      toast.error("Failed to send message. Try again.");
      return;
    }
    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data as Message];
      });
    }
  }

  return (
    <Card className="py-0 overflow-hidden">
      <div
        ref={scrollRef}
        className="h-[28rem] overflow-y-auto bg-muted/30 px-3 py-4"
      >
        {/* Load earlier button */}
        {hasMore && (
          <div className="flex justify-center mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-muted-foreground gap-1"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              {loadingMore ? "Loading…" : "Load earlier messages"}
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground text-center px-6">
              No messages yet.
              <br />
              Say hi and coordinate your ride!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m, i) => {
              const me = m.user_id === currentUserId;
              const prev = messages[i - 1];
              const sameSenderAsPrev = prev && prev.user_id === m.user_id;
              const sender = memberByUserId.get(m.user_id);
              const name =
                sender?.full_name ??
                sender?.email.split("@")[0] ??
                "Member";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    me ? "justify-end" : "justify-start",
                  )}
                >
                  <div className="max-w-[78%]">
                    {!me && !sameSenderAsPrev && (
                      <p className="text-[11px] text-muted-foreground mb-0.5 ml-2.5">
                        {name}
                      </p>
                    )}
                    <div
                      className={cn(
                        "px-3.5 py-2 text-sm leading-snug",
                        me
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                          : "bg-background text-foreground rounded-2xl rounded-bl-sm ring-1 ring-border",
                      )}
                    >
                      {m.body}
                    </div>
                    <p
                      className={cn(
                        "text-[10px] text-muted-foreground mt-0.5",
                        me ? "text-right mr-1" : "ml-2.5",
                      )}
                    >
                      {fmtTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t bg-background p-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          maxLength={2000}
          className="flex-1 h-10 rounded-full bg-muted/50 px-4 text-sm outline-none focus:bg-muted ring-0"
        />
        <Button
          type="submit"
          size="icon-lg"
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
