import type * as Party from "partykit/server";

// Waiting player in queue
interface WaitingPlayer {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
  joinedAt: number;
}

// Note: "userId" matches the field name sent from client as "userId"

export default class LobbyServer implements Party.Server {
  private waitingPlayers: WaitingPlayer[] = [];

  constructor(readonly room: Party.Room) {}

  // Load queue from storage on startup
  async onStart() {
    const stored = await this.room.storage.get<WaitingPlayer[]>("queue");
    if (stored) {
      // Filter out stale entries (older than 2 minutes)
      const now = Date.now();
      this.waitingPlayers = stored.filter(p => now - p.joinedAt < 120000);
      await this.saveQueue();
    }
    console.log(`[Lobby] Started with ${this.waitingPlayers.length} players in queue`);
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
    console.log(`[Lobby] ${username} joining queue. Current size: ${this.waitingPlayers.length}`);

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
      this.waitingPlayers.push({
        userId,
        username,
        elo,
        connectionId: sender.id,
        joinedAt: Date.now(),
      });

      console.log(`[Lobby] ${username} added to queue. New size: ${this.waitingPlayers.length}`);

      sender.send(JSON.stringify({
        type: 'waiting',
        position: 1,
      }));

      await this.saveQueue();
    }
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
