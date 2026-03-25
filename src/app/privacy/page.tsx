import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for The 2048 League. Learn what data we collect, how we use it, and how we protect your information.",
  openGraph: {
    title: "Privacy Policy | The 2048 League",
    description: "Privacy policy for The 2048 League.",
    url: "https://www.the2048league.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="content-page">
      <div className="content-container content-container-narrow">
        <Link href="/" className="content-back-link">
          &larr; Back to Game
        </Link>

        <h1 className="content-title">Privacy Policy</h1>
        <p className="content-intro">
          Last updated: March 25, 2026. This policy explains what data The 2048 League collects, why
          we collect it, and how we protect it.
        </p>

        <section className="content-section">
          <h2 className="content-heading">What We Collect</h2>

          <h3 className="content-subheading">Account Information</h3>
          <p>
            When you create an account, we collect your <strong>email address</strong> and
            an optional <strong>username</strong>. We use your email to send a one-time verification
            code for sign-in. We do not collect passwords because we use a passwordless
            authentication system.
          </p>

          <h3 className="content-subheading">Game Data</h3>
          <p>
            We store your <strong>scores</strong>, <strong>grid size</strong>, and the date each
            score was submitted. In multiplayer, we also track your <strong>ELO rating</strong>,
            wins, losses, ties, and total games played. This data powers the leaderboard, your stats
            page, and ranked matchmaking.
          </p>

          <h3 className="content-subheading">Session Data</h3>
          <p>
            When you sign in, we create a session that includes your <strong>IP address</strong> and
            {" "}<strong>browser user agent</strong>. This is used to maintain your login state and
            protect against unauthorized access. Sessions expire automatically.
          </p>

          <h3 className="content-subheading">Local Storage</h3>
          <p>
            We store some data locally in your browser, including your theme preference, personal
            best scores, and recent game history. This data never leaves your device unless you are
            signed in and submit a score.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">What We Do Not Collect</h2>
          <ul className="content-list">
            <li>We do not use analytics or tracking scripts (no Google Analytics, no Meta Pixel, no third-party trackers).</li>
            <li>We do not sell, rent, or share your personal data with advertisers.</li>
            <li>We do not collect payment information. The game is free.</li>
            <li>We do not store passwords. Sign-in is handled via one-time email codes.</li>
          </ul>
        </section>

        <section className="content-section">
          <h2 className="content-heading">How We Use Your Data</h2>
          <ul className="content-list">
            <li><strong>Authentication:</strong> Your email is used to send sign-in codes and verify your identity.</li>
            <li><strong>Leaderboards:</strong> Your username and scores are displayed publicly on the leaderboard.</li>
            <li><strong>Matchmaking:</strong> Your ELO rating is used to pair you with opponents of similar skill in ranked multiplayer.</li>
            <li><strong>Stats:</strong> Your game history is used to calculate and display your personal statistics.</li>
          </ul>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Third-Party Services</h2>
          <p>We use the following third-party services to operate The 2048 League:</p>
          <ul className="content-list">
            <li>
              <strong>Supabase</strong> for database hosting and authentication infrastructure.
              Your account and game data is stored in a Supabase-hosted PostgreSQL database.
            </li>
            <li>
              <strong>Resend</strong> for email delivery. When you sign in, Resend sends the
              verification code to your email address. We do not use email for marketing.
            </li>
            <li>
              <strong>PartyKit</strong> for real-time multiplayer connections. During a multiplayer
              match, your game state is transmitted via WebSocket to coordinate gameplay with your
              opponent.
            </li>
            <li>
              <strong>Google Fonts</strong> for loading typefaces used on the site. Google may
              collect basic request data (IP address) when fonts are loaded.
            </li>
          </ul>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Cookies</h2>
          <p>
            We use HTTP-only session cookies to keep you signed in. These cookies contain a session
            token and are not used for tracking or advertising. They expire when your session ends
            or after a set period of inactivity.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Data Security</h2>
          <p>
            All database tables use Row Level Security (RLS) policies, which means users can only
            read and write their own data. Scores and usernames on the leaderboard are publicly
            visible by design. All connections to our services use HTTPS encryption.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Playing as a Guest</h2>
          <p>
            You can play single-player and friendly multiplayer matches without creating an account.
            Guest players do not have any data stored on our servers. All game data for guests is
            kept locally in the browser and is never transmitted.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Your Rights</h2>
          <p>
            You can request deletion of your account and all associated data at any time by
            contacting us. Once deleted, your scores will be removed from the leaderboard and your
            account data will be permanently erased from our database.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. Any changes will be reflected on
            this page with an updated date at the top. Continued use of The 2048 League after
            changes are posted means you accept the updated policy.
          </p>
        </section>

        <section className="content-section content-cta">
          <h2 className="content-heading">Questions?</h2>
          <p>If you have questions about this policy or your data, reach out to us.</p>
          <div className="content-cta-buttons">
            <Link href="/" className="content-btn-primary">
              Back to Game
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
