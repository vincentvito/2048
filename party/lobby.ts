import type * as Party from "partykit/server";

// Waiting player in queue
interface WaitingPlayer {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
  joinedAt: number;
}

export default class LobbyServer implements Party.Server {
  private waitingPlayers: WaitingPlayer[] = [];

  constructor(readonly room: Party.Room) {}

  // Handle new connection
  onConnect(connection: Party.Connection) {
    // Send current queue position if reconnecting
    connection.send(JSON.stringify({
      type: 'waiting',
      position: this.waitingPlayers.length + 1,
    }));
  }

  // Handle incoming messages
  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join_queue':
          this.handleJoinQueue(data, sender);
          break;
        case 'leave_queue':
          this.handleLeaveQueue(sender);
          break;
      }
    } catch (e) {
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  }

  private handleJoinQueue(
    data: { userId: string; username: string; elo: number },
    sender: Party.Connection
  ) {
    const { userId, username, elo } = data;

    // Remove if already in queue (reconnection)
    this.waitingPlayers = this.waitingPlayers.filter(p => p.userId !== userId);

    // Check if there's someone waiting
    if (this.waitingPlayers.length > 0) {
      // Match with first waiting player
      const opponent = this.waitingPlayers.shift()!;
      const roomId = `game_${Date.now()}_${userId.slice(0, 8)}`;

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

      console.log(`[Lobby] Match created: ${roomId} - ${username} vs ${opponent.username}`);
    } else {
      // Add to waiting queue
      this.waitingPlayers.push({
        userId,
        username,
        elo,
        connectionId: sender.id,
        joinedAt: Date.now(),
      });

      sender.send(JSON.stringify({
        type: 'waiting',
        position: 1,
      }));

      console.log(`[Lobby] ${username} joined queue. Queue size: ${this.waitingPlayers.length}`);
    }
  }

  private handleLeaveQueue(sender: Party.Connection) {
    const before = this.waitingPlayers.length;
    this.waitingPlayers = this.waitingPlayers.filter(
      p => p.connectionId !== sender.id
    );

    if (this.waitingPlayers.length < before) {
      console.log(`[Lobby] Player left queue. Queue size: ${this.waitingPlayers.length}`);
    }
  }

  // Handle disconnection
  onClose(connection: Party.Connection) {
    this.handleLeaveQueue(connection);
  }
}

LobbyServer satisfies Party.Worker;
