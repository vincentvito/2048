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
      <div className="invite-error-page">
        <h1 className="invite-error-title">Invalid Invite Link</h1>
        <p className="invite-error-desc">
          This invite link is not valid. Check the link and try again.
        </p>
        <Link href="/" className="invite-error-cta">
          Go to Homepage
        </Link>
      </div>
    );
  }

  redirect(`/?join=${upper}`);
}
