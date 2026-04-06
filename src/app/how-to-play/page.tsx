import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Play 2048: Rules, Controls, and Tips",
  description:
    "Learn how to play 2048 with this beginner-friendly tutorial. Master the rules, controls, and scoring, then jump in and start playing today!",
  keywords: [
    "how to play 2048",
    "2048 rules",
    "2048 tutorial",
    "2048 controls",
    "2048 game guide",
    "learn 2048",
    "2048 beginner tips",
  ],
  openGraph: {
    title: "How to Play 2048: Rules, Controls, and Tips",
    description:
      "Learn how to play 2048 with this beginner-friendly tutorial. Master the rules, controls, and scoring, then start playing today!",
    url: "https://www.the2048league.com/how-to-play",
  },
};

export default function HowToPlayPage() {
  return (
    <main className="content-page">
      <div className="content-container">
        <Link href="/" className="content-back-link">
          &larr; Back to Game
        </Link>

        <h1 className="content-title">How to Play 2048</h1>
        <p className="content-intro">
          2048 is a single-player sliding tile puzzle game. Your goal is simple: combine tiles with
          the same number to create a tile with the number 2048. It sounds easy, but it takes real
          strategy to get there.
        </p>

        <section className="content-section">
          <h2 className="content-heading">The Basics</h2>
          <p>
            The game is played on a 4x4 grid (or 8x8 in advanced mode). Each turn, you slide all
            the tiles on the board in one direction: up, down, left, or right. When two tiles with
            the same number touch, they merge into one tile with their combined value.
          </p>
          <p>
            After every move, a new tile appears on an empty spot. New tiles are usually a 2, with a
            small chance of being a 4. The game ends when the board is full and no more moves are
            possible.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Controls</h2>
          <div className="content-grid-2col">
            <div className="content-card">
              <h3 className="content-card-title">Desktop</h3>
              <ul className="content-list">
                <li>Use the <strong>arrow keys</strong> to slide tiles</li>
                <li>Press <strong>Up</strong>, <strong>Down</strong>, <strong>Left</strong>, or <strong>Right</strong> to move</li>
              </ul>
            </div>
            <div className="content-card">
              <h3 className="content-card-title">Mobile</h3>
              <ul className="content-list">
                <li><strong>Swipe</strong> in any direction to slide tiles</li>
                <li>Swipe up, down, left, or right on the game board</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="content-section">
          <h2 className="content-heading">How Scoring Works</h2>
          <p>
            Every time two tiles merge, the value of the new tile is added to your score. For
            example, merging two 16 tiles creates a 32 tile and adds 32 points to your score. Chain
            reactions (multiple merges in a single swipe) add up fast.
          </p>
          <p>
            Your goal is to reach the highest score possible. Even after hitting the 2048 tile, you
            can keep playing to push your score higher.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">How Tiles Merge</h2>
          <ol className="content-list content-list-numbered">
            <li>Two tiles with the <strong>same value</strong> collide when sliding in the same direction.</li>
            <li>They combine into <strong>one tile</strong> with double the value (e.g., 2 + 2 = 4, 4 + 4 = 8).</li>
            <li>A tile can only merge <strong>once per move</strong>. A freshly merged tile will not merge again in the same swipe.</li>
            <li>Tiles slide as far as they can in the chosen direction before merging or stopping.</li>
          </ol>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Game Over</h2>
          <p>
            The game ends when the entire board is full and no adjacent tiles share the same value.
            At that point, no valid moves remain and the game is over. Your final score is displayed
            along with your best tile.
          </p>
        </section>

        <section className="content-section">
          <h2 className="content-heading">Multiplayer Mode</h2>
          <p>
            The 2048 League also features real-time multiplayer. You can play ranked matches against
            online opponents or invite a friend for a casual game. In multiplayer, both players get
            the same starting board and a time limit. The player with the higher score at the end
            wins.
          </p>
          <p>
            Ranked matches use an ELO rating system, so you will be matched with opponents of
            similar skill. Climb the ranks and prove you are the best 2048 player out there.
          </p>
        </section>

        <section className="content-section content-cta">
          <h2 className="content-heading">Ready to Play?</h2>
          <p>Jump into a game and start merging tiles.</p>
          <div className="content-cta-buttons">
            <Link href="/" className="content-btn-primary">
              Play Now
            </Link>
            <Link href="/strategy" className="content-btn-secondary">
              Learn Strategy
            </Link>
            <Link href="/blog" className="content-btn-secondary">
              Read the Blog
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
