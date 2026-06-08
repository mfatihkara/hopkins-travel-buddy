import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Travel Buddy",
};

const UPDATED = "June 8, 2026";

export default function TermsPage() {
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
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <p className="text-muted-foreground">Last updated: {UPDATED}</p>

        <p>
          Welcome to Travel Buddy. By creating an account or using the app, you
          agree to these terms. Please read them carefully.
        </p>

        <Section title="Who can use Travel Buddy">
          <p>
            You must be a current college student with a valid .edu email address
            and at least 18 years old. You&apos;re responsible for keeping your
            account secure and for everything that happens under it.
          </p>
        </Section>

        <Section title="What Travel Buddy is — and isn't">
          <p>
            Travel Buddy is a coordination tool that helps students find each
            other to share rides to the airport. We are <strong>not</strong> a
            transportation provider, ride-hailing company, or carrier. We do not
            employ drivers, own vehicles, or arrange the transportation itself.
            Any ride, fare split, or arrangement is strictly between the students
            involved.
          </p>
        </Section>

        <Section title="Your responsibilities">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Provide accurate information about yourself and your trips.</li>
            <li>Treat other students respectfully and communicate honestly.</li>
            <li>
              Use your own judgment before meeting or riding with anyone. Meet in
              public, share your plans, and trust your instincts.
            </li>
            <li>
              Follow all applicable laws and any third-party service&apos;s terms
              (for example, a rideshare you book together).
            </li>
          </ul>
        </Section>

        <Section title="Prohibited conduct">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Harassment, threats, hate speech, or unsafe behavior.</li>
            <li>Posting fake trips, spam, scams, or impersonating others.</li>
            <li>Using the app for any commercial purpose we haven&apos;t approved.</li>
            <li>Attempting to break, scrape, or abuse the service.</li>
          </ul>
          <p className="mt-2">
            We may suspend or remove accounts that violate these terms or put
            others at risk.
          </p>
        </Section>

        <Section title="Payments">
          <p>
            If we offer in-app payment to split or book a shared ride, you
            authorize us and our payment processor to charge your selected
            payment method for amounts you approve. Fees and refund terms will be
            shown before you pay.
          </p>
        </Section>

        <Section title="Disclaimers and limitation of liability">
          <p>
            The service is provided &ldquo;as is&rdquo; without warranties of any
            kind. Because rides are arranged directly between students, we are not
            responsible for the conduct of any user or for what happens during a
            ride. To the fullest extent permitted by law, Travel Buddy is not
            liable for indirect, incidental, or consequential damages arising
            from your use of the app or any ride you arrange through it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these terms as the app evolves. If we make material
            changes, we&apos;ll update the date above and, where appropriate,
            notify you in the app.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms? Email{" "}
            <a
              className="text-primary underline underline-offset-4"
              href="mailto:support@jointravelbuddy.com"
            >
              support@jointravelbuddy.com
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
