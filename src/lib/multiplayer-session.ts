export interface MultiplayerSession {
  roomId: string;
  gameMode: 'ranked' | 'friendly';
  friendRoomCode?: string;
}

/** Save active match info to the database. */
export async function saveMultiplayerSession(
  userId: string,
  session: MultiplayerSession
): Promise<void> {
  try {
    await fetch('/api/active-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
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
export async function getMultiplayerSession(
  userId: string
): Promise<MultiplayerSession | null> {
  try {
    const res = await fetch(`/api/active-match?userId=${encodeURIComponent(userId)}`);
    const { data } = await res.json();
    return data as MultiplayerSession | null;
  } catch {
    return null;
  }
}

/** Clear active match info in the database. */
export async function clearMultiplayerSession(userId: string): Promise<void> {
  try {
    await fetch(`/api/active-match?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
  } catch {
    // best-effort
  }
}
