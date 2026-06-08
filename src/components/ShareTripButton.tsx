"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ShareTripButton({
  tripId,
  airport,
  date,
}: {
  tripId: string;
  airport: string;
  date: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Built at click time so it picks up the real origin (works in dev,
    // preview, and prod without hardcoding a domain).
    const url = `${window.location.origin}/trips/join/${tripId}`;
    const text = `Headed to ${airport} on ${date} — want to share a ride? Join my trip on Travel Buddy:`;

    // Native share sheet on mobile/PWA; falls through to clipboard elsewhere.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Share a ride to the airport", text, url });
        return;
      } catch (err) {
        // User dismissing the sheet throws AbortError — that's not a failure,
        // so stay quiet and don't fall back to copying.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied", {
        description: "Send it to a friend so they can join this ride.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link", {
        description: "Long-press the trip to share it manually.",
      });
    }
  }

  return (
    <Button
      type="button"
      onClick={share}
      variant="ghost"
      size="icon-sm"
      aria-label="Invite a friend to this trip"
      title="Invite a friend"
      className="text-muted-foreground hover:text-primary"
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
    </Button>
  );
}
