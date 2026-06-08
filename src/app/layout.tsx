import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "@/utils/supabase/server";
import { cn } from "@/lib/utils";
import AppNav from "./AppNav";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Travel Buddy",
  description: "Find a classmate at your school to share a ride to the airport.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Travel Buddy",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#002D72",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only signed-in users get the app chrome; the landing & login stay full-bleed.
  let unread = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    unread = count ?? 0;
  }

  return (
    <html
      lang="en"
      className={cn("font-sans antialiased", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {user ? (
            <>
              <AppNav userId={user.id} initialUnread={unread} />
              <div className="pb-20 md:pb-0 md:pl-60">{children}</div>
            </>
          ) : (
            children
          )}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
