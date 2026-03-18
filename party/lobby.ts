import type * as Party from "partykit/server";
import { generateBotName, generateBotElo } from "./bot-game";

const isDev = process.env.NODE_ENV !== "production";
const log = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

const BOT_MATCH_TIMEOUT = 15000;

interface WaitingPlayer {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
  joinedAt: number;
  botMatchScheduled?: boolean;
}

export default class LobbyServer implements Party.Server {
  private waitingPlayers: WaitingPlayer[] = [];

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const stored = await this.room.storage.get<WaitingPlayer[]>("queue");
    if (stored && stored.length > 0) {
      const now = Date.now();
      this.waitingPlayers = stored.filter((p) => now - p.joinedAt < 300000);
      await this.saveQueue();
    }
    log(`[Lobby] Ready with ${this.waitingPlayers.length} players in queue`);
  }

  async onConnect(_connection: Party.Connection) {
    // Wait for join_queue message
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "join_queue":
          await this.handleJoinQueue(data, sender);
          break;
        case "leave_queue":
          await this.handleLeaveQueue(sender);
          break;
      }
    } catch (e) {
      console.error("[Lobby] Message error:", e);
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  }

  private async handleJoinQueue(
    data: { userId: string; username: string; elo: number },
    sender: Party.Connection
  ) {
    const { userId, username, elo } = data;

    // Remove if already in queue (reconnection)
    this.waitingPlayers = this.waitingPlayers.filter((p) => p.userId !== userId);

    if (this.waitingPlayers.length > 0) {
      const opponent = this.waitingPlayers.shift()!;
      const roomId = `game_${Date.now()}_${userId.slice(0, 8)}`;

      log(`[Lobby] Match: ${username} vs ${opponent.username} -> ${roomId}`);

      const oppConnection = this.room.getConnection(opponent.connectionId);
      if (oppConnection) {
        oppConnection.send(
          JSON.stringify({
            type: "matched",
            roomId,
            opponent: { username, elo },
          })
        );
      }

      sender.send(
        JSON.stringify({
          type: "matched",
          roomId,
          opponent: { username: opponent.username, elo: opponent.elo },
        })
      );

      await this.saveQueue();
    } else {
      const player: WaitingPlayer = {
        userId,
        username,
        elo,
        connectionId: sender.id,
        joinedAt: Date.now(),
        botMatchScheduled: false,
      };
      this.waitingPlayers.push(player);

      sender.send(
        JSON.stringify({
          type: "waiting",
          position: 1,
        })
      );

      await this.room.storage.setAlarm(Date.now() + BOT_MATCH_TIMEOUT);
      player.botMatchScheduled = true;

      await this.saveQueue();
    }
  }

  async onAlarm() {
    const now = Date.now();

    const playersToMatch: WaitingPlayer[] = [];
    for (const player of this.waitingPlayers) {
      if (now - player.joinedAt >= BOT_MATCH_TIMEOUT) {
        playersToMatch.push(player);
      }
    }

    for (const player of playersToMatch) {
      this.waitingPlayers = this.waitingPlayers.filter((p) => p.userId !== player.userId);

      const botName = generateBotName();
      const botElo = generateBotElo(player.elo);
      const roomId = `bot_${Date.now()}_${player.userId.slice(0, 8)}`;

      log(`[Lobby] Bot match: ${player.username} vs ${botName} (ELO: ${botElo})`);

      const conn = this.room.getConnection(player.connectionId);
      if (conn) {
        conn.send(
          JSON.stringify({
            type: "matched",
            roomId,
            opponent: { username: botName, elo: botElo, isBot: true },
          })
        );
      }
    }

    if (this.waitingPlayers.length > 0) {
      const oldestPlayer = this.waitingPlayers.reduce((oldest, p) =>
        p.joinedAt < oldest.joinedAt ? p : oldest
      );
      const timeUntilBotMatch = BOT_MATCH_TIMEOUT - (now - oldestPlayer.joinedAt);
      if (timeUntilBotMatch > 0) {
        await this.room.storage.setAlarm(now + timeUntilBotMatch);
      } else {
        await this.room.storage.setAlarm(now + 100);
      }
    }

    await this.saveQueue();
  }

  private async handleLeaveQueue(sender: Party.Connection) {
    const before = this.waitingPlayers.length;
    this.waitingPlayers = this.waitingPlayers.filter((p) => p.connectionId !== sender.id);

    if (this.waitingPlayers.length < before) {
      log(`[Lobby] Player left queue. Size: ${this.waitingPlayers.length}`);
      await this.saveQueue();
    }
  }

  async onClose(connection: Party.Connection) {
    await this.handleLeaveQueue(connection);
  }

  private async saveQueue() {
    await this.room.storage.put("queue", this.waitingPlayers);
  }
}

LobbyServer satisfies Party.Worker;
