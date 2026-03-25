import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-layout">
      <div className="container">
        <div className="not-found-page">
          <div className="not-found-content">
            <div className="not-found-tiles">
              <span className="tile-4">4</span>
              <span className="tile-0">0</span>
              <span className="tile-4">4</span>
            </div>
            <h1 className="not-found-title">Page Not Found</h1>
            <p className="not-found-subtitle">
              Looks like this tile got stuck and can&apos;t merge anywhere.
            </p>
            <div className="not-found-actions">
              <Link href="/" className="ui-btn ui-btn-primary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 12V4M8 4L4 8M8 4L12 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to Game
              </Link>
              <Link href="/how-to-play" className="ui-btn ui-btn-secondary">
                How to Play
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
