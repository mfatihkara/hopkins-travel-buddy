import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Hopkins Travel Buddy",
  description: "Find a JHU classmate to share a ride to BWI, IAD, or DCA.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans antialiased", geist.variable)}>
      <body className="min-h-dvh bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
