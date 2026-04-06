import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Racing_Sans_One } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { Toaster } from "sonner";
import { ParticleProvider } from "@/components/EmojiParticles";
import InstallBanner from "@/components/InstallBanner";
import Footer from "@/components/Footer";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const racingSansOne = Racing_Sans_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-racing-sans-one",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Play 2048 Online | The 2048 League",
    template: "%s | The 2048 League",
  },
  description:
    "Play 2048 online for free. Compete on the leaderboard, challenge friends in real-time multiplayer, and climb the ranks. Start playing now!",
  keywords: [
    "play 2048 online",
    "2048 game",
    "2048 multiplayer",
    "2048 leaderboard",
    "2048 puzzle",
    "2048 online free",
  ],
  authors: [{ name: "The 2048 League" }],
  openGraph: {
    title: "Play 2048 Online | The 2048 League",
    description:
      "Play 2048 online for free. Compete on the leaderboard, challenge friends in real-time multiplayer, and climb the ranks.",
    url: "https://www.the2048league.com",
    siteName: "The 2048 League",
    images: [{ url: "/brand.png", width: 1024, height: 512 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Play 2048 Online | The 2048 League",
    description:
      "Play 2048 online for free. Compete on the leaderboard, challenge friends in real-time multiplayer, and climb the ranks.",
    images: ["/brand.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "2048",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f59e0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable} ${racingSansOne.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "The 2048 League",
              url: "https://www.the2048league.com",
              description:
                "Play 2048 online for free. Compete on leaderboards and challenge friends in real-time multiplayer with ELO-based ranking.",
              applicationCategory: "GameApplication",
              genre: "Puzzle",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ParticleProvider>{children}</ParticleProvider>
          <div className="landscape-blocker">
            <span className="landscape-blocker-icon">📱</span>
            <p className="landscape-blocker-text">Please rotate your device to portrait mode</p>
          </div>
          <Footer />
          <InstallBanner />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
