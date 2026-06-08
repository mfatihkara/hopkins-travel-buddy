import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Travel Buddy",
};

const UPDATED = "June 8, 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <p className="text-muted-foreground">Last updated: {UPDATED}</p>

        <p>
          Travel Buddy (&ldquo;we,&rdquo; &ldquo;us&rdquo;) helps verified
          college students find classmates to share rides to the airport. This
          policy explains what we collect, why, and the choices you have.
        </p>

        <Section title="Information we collect">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Account info:</strong> your school (.edu) email address,
              which we use to verify you&apos;re a student and to match you only
              with people at your own school.
            </li>
            <li>
              <strong>Profile:</strong> your name, optional profile photo, and
              optional phone number.
            </li>
            <li>
              <strong>Trips:</strong> the airport, dates, time windows, and
              pickup area you post.
            </li>
            <li>
              <strong>Messages:</strong> chat messages you send within a matched
              ride group.
            </li>
            <li>
              <strong>Safety:</strong> reports you submit about other users.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>To match you with compatible riders at your school.</li>
            <li>To let your matched group coordinate over chat.</li>
            <li>
              To send you account, ride, and safety notifications. If you add a
              phone number, we may text you ride and driver updates; standard
              message rates may apply and you can remove your number anytime.
            </li>
            <li>To keep the service safe and investigate reports.</li>
          </ul>
        </Section>

        <Section title="What we share">
          <p>
            Your name, photo, pickup area, and trip details are visible to other
            verified students at your school so they can decide whether to ride
            with you. Your phone number is only shared with members of a ride
            group you&apos;ve matched into. We do not sell your personal
            information.
          </p>
          <p className="mt-2">
            We use third-party providers to run the service — including Supabase
            (database, authentication, and storage) and an email/SMS delivery
            provider — who process your data on our behalf.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            If you pay for a shared ride through the app in the future, payment
            card details are handled by our payment processor and are not stored
            on our servers.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Edit your name, photo, and phone number anytime in your profile.</li>
            <li>Delete a trip you posted, or leave a ride group.</li>
            <li>Block users so you&apos;re never matched with them again.</li>
            <li>
              Request deletion of your account and associated data by emailing
              us.
            </li>
          </ul>
        </Section>

        <Section title="Data retention">
          <p>
            We keep your information for as long as your account is active. When
            you delete your account, we delete your profile, trips, and messages,
            except where we must retain limited records for safety or legal
            reasons.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests? Email{" "}
            <a
              className="text-primary underline underline-offset-4"
              href="mailto:privacy@jointravelbuddy.com"
            >
              privacy@jointravelbuddy.com
            </a>
            .
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
