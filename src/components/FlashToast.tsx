"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Surfaces a one-time `?message=`/`?error=` from a redirect as a toast that
// fades on its own, then strips the param so refreshing or going back doesn't
// replay it. Lives as its own component since firing a toast is exactly the
// "sync with an external system" useEffect is for — sonner keeps its own
// store outside React.
export default function FlashToast({
  message,
  error,
}: {
  message?: string;
  error?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!message && !error) return;

    if (message) toast.success(message, { duration: 2000 });
    if (error) toast.error(error, { duration: 2000 });

    const url = new URL(window.location.href);
    url.searchParams.delete("message");
    url.searchParams.delete("error");
    const qs = url.searchParams.toString();
    router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, { scroll: false });
    // Only react to the params changing — re-running on `router` identity
    // would re-fire the toast after the replace above updates the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, error]);

  return null;
}
