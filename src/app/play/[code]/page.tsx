import type { Metadata } from "next";
import Link from "next/link";
import { isValidRoomCode } from "@/lib/room-code";
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const upper = code.toUpperCase();

  if (!isValidRoomCode(upper)) {
    return { title: "Invalid Invite" };
  }

  return {
    title: "Join my 2048 match!",
    openGraph: {
      title: "Join my 2048 match!",
      description: "Click to join a friendly 2048 match on The 2048 League.",
      images: [{ url: "/brand.png", width: 1024, height: 512 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Join my 2048 match!",
      description: "Click to join a friendly 2048 match on The 2048 League.",
      images: ["/brand.png"],
    },
  };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const upper = code.toUpperCase();

  if (!isValidRoomCode(upper)) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Invalid Invite Link</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          This invite link is not valid. Check the link and try again.
        </p>
        <Link
          href="/"
          style={{
            marginTop: "12px",
            padding: "10px 24px",
            borderRadius: "12px",
            background: "var(--accent)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Go to Homepage
        </Link>
      </div>
    );
  }

  redirect(`/?join=${upper}`);
}
