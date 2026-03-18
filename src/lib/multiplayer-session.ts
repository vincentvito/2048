export interface MultiplayerSession {
  roomId: string;
  gameMode: "ranked" | "friendly";
  friendRoomCode?: string;
}

/** Save active match info to the database. */
export async function saveMultiplayerSession(session: MultiplayerSession): Promise<void> {
  try {
    await fetch("/api/active-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: session.roomId,
        gameMode: session.gameMode,
        friendRoomCode: session.friendRoomCode,
      }),
    });
  } catch {
    // best-effort
  }
}

/** Fetch active match info from the database. */
export async function getMultiplayerSession(): Promise<MultiplayerSession | null> {
  try {
    const res = await fetch("/api/active-match");
    const { data } = await res.json();
    return data as MultiplayerSession | null;
  } catch {
    return null;
  }
}

/** Clear active match info in the database. */
export async function clearMultiplayerSession(): Promise<void> {
  try {
    await fetch("/api/active-match", {
      method: "DELETE",
    });
  } catch {
    // best-effort
  }
}
