import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { rateMember } from "./actions";

export default function RatingStars({
  groupId,
  rateeId,
  current,
}: {
  groupId: string;
  rateeId: string;
  current: number;
}) {
  return (
    <form action={rateMember} className="flex items-center gap-0.5">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="ratee_id" value={rateeId} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="submit"
          name="score"
          value={n}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-amber-500"
        >
          <Star
            className={cn(
              "h-5 w-5",
              n <= current && "fill-amber-400 text-amber-400",
            )}
          />
        </button>
      ))}
    </form>
  );
}
