import type * as Party from "partykit/server";
import { generateBotName, generateBotElo } from "./bot-game";

// How long to wait for a human opponent before matching with a bot
const BOT_MATCH_TIMEOUT = 15000; // 15 seconds

// Waiting player in queue
interface WaitingPlayer {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
  joinedAt: number;
  botMatchScheduled?: boolean;
}

// Note: "userId" matches the field name sent from client as "userId"

export default class LobbyServer implements Party.Server {
  private waitingPlayers: WaitingPlayer[] = [];

  constructor(readonly room: Party.Room) {}

  // Load queue from storage on startup
  async onStart() {
    console.log(`[Lobby] onStart called for room: ${this.room.id}`);
    const stored = await this.room.storage.get<WaitingPlayer[]>("queue");
    console.log(`[Lobby] Loaded from storage:`, stored);
    if (stored && stored.length > 0) {
      // Filter out stale entries (older than 5 minutes)
      const now = Date.now();
      this.waitingPlayers = stored.filter(p => now - p.joinedAt < 300000);
      console.log(`[Lobby] After filtering stale: ${this.waitingPlayers.length} players`);
      await this.saveQueue();
    }
    console.log(`[Lobby] Ready with ${this.waitingPlayers.length} players in queue`);
  }

  // Handle new connection
  async onConnect(connection: Party.Connection) {
    console.log(`[Lobby] New connection: ${connection.id}`);
    // Don't send position here - wait for join_queue message
  }

  // Handle incoming messages
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);
      console.log(`[Lobby] Message from ${sender.id}: ${data.type}`);

      switch (data.type) {
        case 'join_queue':
          await this.handleJoinQueue(data, sender);
          break;
        case 'leave_queue':
          await this.handleLeaveQueue(sender);
          break;
      }
    } catch (e) {
      console.error(`[Lobby] Error processing message:`, e);
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  }

  private async handleJoinQueue(
    data: { userId: string; username: string; elo: number },
    sender: Party.Connection
  ) {
    const { userId, username, elo } = data;
    console.log(`[Lobby] handleJoinQueue called`);
    console.log(`[Lobby] Player: ${username} (${userId})`);
    console.log(`[Lobby] Current queue size: ${this.waitingPlayers.length}`);
    console.log(`[Lobby] Current queue:`, this.waitingPlayers.map(p => p.username));

    // Remove if already in queue (reconnection)
    this.waitingPlayers = this.waitingPlayers.filter(p => p.userId !== userId);

    // Check if there's someone waiting
    if (this.waitingPlayers.length > 0) {
      // Match with first waiting player
      const opponent = this.waitingPlayers.shift()!;
      const roomId = `game_${Date.now()}_${userId.slice(0, 8)}`;

      console.log(`[Lobby] Match found! ${username} vs ${opponent.username} -> ${roomId}`);

      // Notify the opponent
      const oppConnection = this.room.getConnection(opponent.connectionId);
      if (oppConnection) {
        oppConnection.send(JSON.stringify({
          type: 'matched',
          roomId,
          opponent: { username, elo },
        }));
      }

      // Notify the current player
      sender.send(JSON.stringify({
        type: 'matched',
        roomId,
        opponent: { username: opponent.username, elo: opponent.elo },
      }));

      await this.saveQueue();
    } else {
      // Add to waiting queue
      const player: WaitingPlayer = {
        userId,
        username,
        elo,
        connectionId: sender.id,
        joinedAt: Date.now(),
        botMatchScheduled: false,
      };
      this.waitingPlayers.push(player);

      console.log(`[Lobby] ${username} added to queue. New size: ${this.waitingPlayers.length}`);

      sender.send(JSON.stringify({
        type: 'waiting',
        position: 1,
      }));

      // Schedule bot match after 15 seconds if no human opponent found
      await this.room.storage.setAlarm(Date.now() + BOT_MATCH_TIMEOUT);
      player.botMatchScheduled = true;

      await this.saveQueue();
    }
  }

  // Handle alarm - match waiting player with a bot
  async onAlarm() {
    console.log(`[Lobby] Alarm fired, checking for waiting players`);

    // Process any players who have been waiting too long
    const now = Date.now();
    const playersToMatch: WaitingPlayer[] = [];

    for (const player of this.waitingPlayers) {
      if (now - player.joinedAt >= BOT_MATCH_TIMEOUT) {
        playersToMatch.push(player);
      }
    }

    for (const player of playersToMatch) {
      // Remove from waiting list
      this.waitingPlayers = this.waitingPlayers.filter(p => p.userId !== player.userId);

      // Generate bot opponent
      const botName = generateBotName();
      const botElo = generateBotElo(player.elo);
      const roomId = `bot_${Date.now()}_${player.userId.slice(0, 8)}`;

      console.log(`[Lobby] Bot match: ${player.username} vs ${botName} (ELO: ${botElo}) -> ${roomId}`);

      // Notify the player
      const conn = this.room.getConnection(player.connectionId);
      if (conn) {
        conn.send(JSON.stringify({
          type: 'matched',
          roomId,
          opponent: { username: botName, elo: botElo, isBot: true },
        }));
      }
    }

    // If there are still players waiting, schedule another alarm
    if (this.waitingPlayers.length > 0) {
      const oldestPlayer = this.waitingPlayers.reduce((oldest, p) =>
        p.joinedAt < oldest.joinedAt ? p : oldest
      );
      const timeUntilBotMatch = BOT_MATCH_TIMEOUT - (now - oldestPlayer.joinedAt);
      if (timeUntilBotMatch > 0) {
        await this.room.storage.setAlarm(now + timeUntilBotMatch);
      } else {
        // Immediate alarm for overdue players
        await this.room.storage.setAlarm(now + 100);
      }
    }

    await this.saveQueue();
  }

  private async handleLeaveQueue(sender: Party.Connection) {
    const before = this.waitingPlayers.length;
    this.waitingPlayers = this.waitingPlayers.filter(
      p => p.connectionId !== sender.id
    );

    if (this.waitingPlayers.length < before) {
      console.log(`[Lobby] Player left queue. New size: ${this.waitingPlayers.length}`);
      await this.saveQueue();
    }
  }

  // Handle disconnection
  async onClose(connection: Party.Connection) {
    console.log(`[Lobby] Connection closed: ${connection.id}`);
    await this.handleLeaveQueue(connection);
  }

  // Persist queue to storage
  private async saveQueue() {
    await this.room.storage.put("queue", this.waitingPlayers);
  }
}

LobbyServer satisfies Party.Worker;
