"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { deleteTrip } from "@/app/trips/actions";

export default function DeleteTripButton({ tripId }: { tripId: string }) {
  // The confirm button lives in a portal outside this form, so it submits by
  // ref rather than needing to be a descendant.
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <AlertDialog>
      <form ref={formRef} action={deleteTrip} className="hidden">
        <input type="hidden" name="trip_id" value={tripId} />
      </form>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete trip"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes your post from the feed for good — classmates looking
            for a ride won&apos;t be able to find or join it anymore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={() => formRef.current?.requestSubmit()}>
            Delete trip
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
