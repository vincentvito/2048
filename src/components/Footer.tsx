import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
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
        </ul>
        <p className="site-footer-copy">
          &copy; {new Date().getFullYear()} The 2048 League
        </p>
      </div>
    </footer>
  );
}
