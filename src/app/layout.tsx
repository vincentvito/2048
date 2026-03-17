import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/features/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "2048",
  description: "Play 2048 - the classic sliding tile puzzle game",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
