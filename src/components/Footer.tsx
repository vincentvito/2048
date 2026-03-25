import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-about">
          <p>
            <strong>The 2048 League</strong> is a free online 2048 game with real-time multiplayer.
            Play the classic sliding tile puzzle, compete on daily leaderboards, and challenge
            friends or ranked opponents. Every ranked match uses an ELO rating system so you are
            always matched with players at your skill level.
          </p>
          <p>
            New to 2048? Learn{" "}
            <Link href="/how-to-play">how to play</Link> or read
            our <Link href="/strategy">strategy guide</Link> to improve your game.
          </p>
        </div>
        <ul className="site-footer-links">
          <li>
            <Link href="/how-to-play">How to Play</Link>
          </li>
          <li>
            <Link href="/strategy">Strategy Guide</Link>
          </li>
          <li>
            <Link href="/blog">Blog</Link>
          </li>
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
        </ul>
        <p className="site-footer-copy">
          &copy; {new Date().getFullYear()} The 2048 League
        </p>
      </div>
    </footer>
  );
}
