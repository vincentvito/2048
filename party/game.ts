import type * as Party from "partykit/server";

// Player state in a game room
interface Player {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
  grid: number[];
  score: number;
  gameOver: boolean;
  won: boolean;
  wantsRematch: boolean;
  forfeited: boolean;
  lastSeen: number;
}

interface GameState {
  players: Map<string, Player>;
  gameStarted: boolean;
  resultSent: boolean;
}

// Timeout before considering player disconnected
const DISCONNECT_TIMEOUT = 15000; // 15 seconds

export default class GameServer implements Party.Server {
  private state: GameState = {
    players: new Map(),
    gameStarted: false,
    resultSent: false,
  };

  // Enable hibernation for better scalability
  readonly options: Party.ServerOptions = {
    hibernate: true,
  };

  constructor(readonly room: Party.Room) {}

  // Load state on startup
  async onStart() {
    const stored = await this.room.storage.get<{
      players: [string, Player][];
      gameStarted: boolean;
      resultSent?: boolean;
    }>("gameState");

    if (stored) {
      this.state = {
        players: new Map(stored.players),
        gameStarted: stored.gameStarted,
        resultSent: stored.resultSent || false,
      };
    }
  }

  // Handle new connection
  async onConnect(connection: Party.Connection) {
    // Send current game state to reconnecting player
    const players = Array.from(this.state.players.values());

    if (players.length > 0) {
      connection.send(JSON.stringify({
        type: 'game_start',
        players: players.map(p => ({
          id: p.userId,
          username: p.username,
          elo: p.elo,
        })),
      }));

      // Send opponent state if exists
      for (const player of players) {
        if (player.connectionId !== connection.id) {
          connection.send(JSON.stringify({
            type: 'opponent_state',
            state: {
              grid: player.grid,
              score: player.score,
              gameOver: player.gameOver,
              won: player.won,
            },
            username: player.username,
            elo: player.elo,
          }));
        }
      }
    }
  }

  // Handle messages
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'join':
          await this.handleJoin(data, sender);
          break;
        case 'state_update':
          await this.handleStateUpdate(data, sender);
          break;
        case 'request_rematch':
          await this.handleRematchRequest(sender);
          break;
        case 'forfeit':
          await this.handleForfeit(sender);
          break;
        case 'timer_expired':
          await this.handleTimerExpired(sender);
          break;
        case 'heartbeat':
          this.handleHeartbeat(sender);
          break;
      }
    } catch (e) {
      console.error('[Game] Message error:', e);
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  }

  private async handleJoin(
    data: { userId: string; username: string; elo: number },
    sender: Party.Connection
  ) {
    const { userId, username, elo } = data;

    // Check if player already exists (reconnection)
    const existing = this.state.players.get(userId);

    if (existing) {
      // Update connection ID for reconnected player
      existing.connectionId = sender.id;
      existing.lastSeen = Date.now();

      // Notify opponent of reconnection
      this.broadcastToOthers(sender.id, {
        type: 'opponent_connected',
        connected: true,
      });
    } else {
      // New player joining
      const player: Player = {
        userId: userId,
        username,
        elo,
        connectionId: sender.id,
        grid: [],
        score: 0,
        gameOver: false,
        won: false,
        wantsRematch: false,
        forfeited: false,
        lastSeen: Date.now(),
      };

      this.state.players.set(userId, player);
    }

    // Notify all players
    const players = Array.from(this.state.players.values());
    const playerCount = players.length;

    this.room.broadcast(JSON.stringify({
      type: 'player_joined',
      playerId: userId,
      username,
      elo,
      playerCount,
    }));

    // Start game when 2 players are connected
    if (playerCount === 2 && !this.state.gameStarted) {
      this.state.gameStarted = true;

      this.room.broadcast(JSON.stringify({
        type: 'game_start',
        players: players.map(p => ({
          id: p.userId,
          username: p.username,
          elo: p.elo,
        })),
      }));

      console.log(`[Game ${this.room.id}] Game started with ${players.map(p => p.username).join(' vs ')}`);
    }

    await this.saveState();
  }

  private async handleStateUpdate(
    data: { state: { grid: number[]; score: number; gameOver: boolean; won: boolean } },
    sender: Party.Connection
  ) {
    // Find player by connection ID
    let player: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        player = p;
        break;
      }
    }

    if (!player) {
      console.log(`[Game ${this.room.id}] state_update from unknown connection ${sender.id}`);
      console.log(`[Game ${this.room.id}] Known players:`, Array.from(this.state.players.values()).map(p => ({ id: p.userId, connId: p.connectionId })));
      return;
    }

    console.log(`[Game ${this.room.id}] ${player.username} score: ${data.state.score}`);

    // Update player state
    player.grid = data.state.grid;
    player.score = data.state.score;
    player.gameOver = data.state.gameOver;
    player.won = data.state.won;
    player.lastSeen = Date.now();

    // Broadcast to opponent
    this.broadcastToOthers(sender.id, {
      type: 'opponent_state',
      state: data.state,
      username: player.username,
      elo: player.elo,
    });

    // Check if match should resolve (someone finished or won 2048)
    if (data.state.gameOver || data.state.won) {
      await this.tryResolveMatch(data.state.won ? '2048' : 'score');
    }

    await this.saveState();
  }

  private async tryResolveMatch(reason: 'score' | '2048' | 'timer') {
    if (this.state.resultSent) return;

    const players = Array.from(this.state.players.values());
    if (players.length !== 2) return;

    const [p1, p2] = players;
    const someoneWon2048 = p1.won || p2.won;
    const anyDone = (p1.gameOver || p1.won) || (p2.gameOver || p2.won);

    // Match resolves when: someone won 2048, any player ran out of moves, or timer expired
    if (!someoneWon2048 && !anyDone && reason !== 'timer') return;

    this.state.resultSent = true;

    // Determine winner
    let winnerId: string | null = null;
    let actualReason = reason;

    if (someoneWon2048) {
      winnerId = p1.won ? p1.userId : p2.userId;
      actualReason = '2048';
    } else {
      // Score comparison
      if (p1.score > p2.score) winnerId = p1.userId;
      else if (p2.score > p1.score) winnerId = p2.userId;
      // else null = tie
    }

    // Send personalized result to each player
    for (const player of players) {
      const opponent = players.find(p => p.userId !== player.userId)!;
      const outcome: 'win' | 'loss' | 'tie' =
        winnerId === null ? 'tie' : winnerId === player.userId ? 'win' : 'loss';

      const conn = this.room.getConnection(player.connectionId);
      if (conn) {
        conn.send(JSON.stringify({
          type: 'game_result',
          outcome,
          yourScore: player.score,
          opponentScore: opponent.score,
          reason: actualReason,
        }));
      }
    }

    console.log(`[Game ${this.room.id}] Match resolved: ${winnerId ? `winner=${winnerId}` : 'tie'} (${actualReason}) scores: ${p1.username}=${p1.score} vs ${p2.username}=${p2.score}`);
  }

  private async handleTimerExpired(sender: Party.Connection) {
    // Only process if result hasn't been sent yet
    if (this.state.resultSent) return;

    console.log(`[Game ${this.room.id}] Timer expired signal received`);
    await this.tryResolveMatch('timer');
    await this.saveState();
  }

  private async handleRematchRequest(sender: Party.Connection) {
    // Find player
    let player: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        player = p;
        break;
      }
    }

    if (!player) return;

    player.wantsRematch = true;

    // Check if both want rematch
    const players = Array.from(this.state.players.values());
    const allWantRematch = players.length === 2 && players.every(p => p.wantsRematch);

    if (allWantRematch) {
      // Reset game state for both players
      for (const p of players) {
        p.grid = [];
        p.score = 0;
        p.gameOver = false;
        p.won = false;
        p.wantsRematch = false;
        p.forfeited = false;
      }
      this.state.resultSent = false;

      this.room.broadcast(JSON.stringify({ type: 'rematch_start' }));
      console.log(`[Game ${this.room.id}] Rematch started`);
    } else {
      // Notify opponent that rematch was requested
      this.broadcastToOthers(sender.id, {
        type: 'rematch_requested',
        by: 'opponent',
      });
    }

    await this.saveState();
  }

  private async handleForfeit(sender: Party.Connection) {
    // Find player
    let player: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        player = p;
        break;
      }
    }

    if (!player) return;

    player.forfeited = true;

    // Notify opponent
    this.broadcastToOthers(sender.id, {
      type: 'opponent_forfeited',
    });

    console.log(`[Game ${this.room.id}] ${player.username} forfeited`);
    await this.saveState();
  }

  private handleHeartbeat(sender: Party.Connection) {
    // Update last seen for the player
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        p.lastSeen = Date.now();
        break;
      }
    }
  }

  // Handle disconnection
  async onClose(connection: Party.Connection) {
    // Find the player who disconnected
    let disconnectedPlayer: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === connection.id) {
        disconnectedPlayer = p;
        break;
      }
    }

    if (!disconnectedPlayer) return;

    // Notify opponent of disconnect
    this.broadcastToOthers(connection.id, {
      type: 'opponent_connected',
      connected: false,
    });

    // Set alarm to clean up if they don't reconnect
    await this.room.storage.setAlarm(Date.now() + DISCONNECT_TIMEOUT);
  }

  // Handle alarm (cleanup disconnected players)
  async onAlarm() {
    const now = Date.now();
    const playersToRemove: string[] = [];

    for (const [id, player] of this.state.players) {
      // Check if connection is still active
      const connection = this.room.getConnection(player.connectionId);
      if (!connection && now - player.lastSeen > DISCONNECT_TIMEOUT) {
        playersToRemove.push(id);
      }
    }

    for (const id of playersToRemove) {
      const player = this.state.players.get(id);
      if (player) {
        this.state.players.delete(id);

        this.room.broadcast(JSON.stringify({
          type: 'player_left',
          playerId: id,
        }));

        console.log(`[Game] ${player.username} removed (timeout)`);
      }
    }

    await this.saveState();
  }

  // Broadcast to all except sender
  private broadcastToOthers(senderId: string, message: object) {
    const msgStr = JSON.stringify(message);
    for (const conn of this.room.getConnections()) {
      if (conn.id !== senderId) {
        conn.send(msgStr);
      }
    }
  }

  // Save state to storage
  private async saveState() {
    await this.room.storage.put("gameState", {
      players: Array.from(this.state.players.entries()),
      gameStarted: this.state.gameStarted,
      resultSent: this.state.resultSent,
    });
  }
}

GameServer satisfies Party.Worker;
