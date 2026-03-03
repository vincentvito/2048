import type * as Party from "partykit/server";
import { createInitialBotState, botMakeMove, BotGameState, generateBotName, generateBotElo } from "./bot-game";

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
  isBot?: boolean;
}

interface GameState {
  players: Map<string, Player>;
  gameStarted: boolean;
  gameStartedAt: number | null;
  resultSent: boolean;
  mode: 'ranked' | 'friendly';
  botState?: BotGameState;
  botMoveInterval?: ReturnType<typeof setInterval>;
}

// Bot move interval - make a move every 2-4 seconds (random)
const BOT_MIN_MOVE_INTERVAL = 2000;
const BOT_MAX_MOVE_INTERVAL = 4000;

const RANKED_DURATION = 5 * 60;    // 5 minutes
const FRIENDLY_DURATION = 5 * 60;  // 5 minutes (room code valid for 1 hour)

// Timeout before considering player disconnected
const DISCONNECT_TIMEOUT = 15000; // 15 seconds

export default class GameServer implements Party.Server {
  private state: GameState = {
    players: new Map(),
    gameStarted: false,
    gameStartedAt: null,
    resultSent: false,
    mode: 'ranked',
  };

  constructor(readonly room: Party.Room) {}

  // Load state on startup
  async onStart() {
    console.log(`[Game ${this.room.id}] onStart called`);
    const stored = await this.room.storage.get<{
      players: [string, Player][];
      gameStarted: boolean;
      gameStartedAt?: number | null;
      resultSent?: boolean;
      mode?: 'ranked' | 'friendly';
      botState?: BotGameState;
    }>("gameState");

    console.log(`[Game ${this.room.id}] Stored state:`, stored ? 'found' : 'none');

    if (stored) {
      this.state = {
        players: new Map(stored.players),
        gameStarted: stored.gameStarted,
        gameStartedAt: stored.gameStartedAt ?? null,
        resultSent: stored.resultSent || false,
        mode: stored.mode || 'ranked',
        botState: stored.botState,
      };

      // If this is a bot game, restart bot moves
      const isBotGame = this.room.id.startsWith('bot_');
      console.log(`[Game ${this.room.id}] isBotGame: ${isBotGame}, hasBotState: ${!!this.state.botState}, resultSent: ${this.state.resultSent}`);
      if (isBotGame && this.state.botState && !this.state.resultSent) {
        console.log(`[Game ${this.room.id}] Restarting bot moves...`);
        this.scheduleBotMove();
      }
    }
  }

  // Handle new connection
  async onConnect(connection: Party.Connection) {
    // Send current game state to reconnecting player
    const players = Array.from(this.state.players.values());

    if (players.length > 0) {
      const duration = this.state.mode === 'friendly' ? FRIENDLY_DURATION : RANKED_DURATION;
      // Compute remaining time if game is already in progress
      let timeRemaining: number | undefined;
      if (this.state.gameStartedAt) {
        const elapsed = Math.floor((Date.now() - this.state.gameStartedAt) / 1000);
        timeRemaining = Math.max(0, duration - elapsed);
      }
      connection.send(JSON.stringify({
        type: 'game_start',
        players: players.map(p => ({
          id: p.userId,
          username: p.username,
          elo: p.elo,
        })),
        duration,
        timeRemaining,
        mode: this.state.mode,
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
    data: { userId: string; username: string; elo: number; mode?: 'ranked' | 'friendly'; botOpponent?: { username: string; elo: number } },
    sender: Party.Connection
  ) {
    const { userId, username, elo } = data;

    // First player to join sets the game mode
    if (this.state.players.size === 0 && data.mode) {
      this.state.mode = data.mode;
    }

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

      // Send the player's own saved state back so they can restore their board
      if (existing.grid.length > 0) {
        sender.send(JSON.stringify({
          type: 'your_state',
          state: {
            grid: existing.grid,
            score: existing.score,
            gameOver: existing.gameOver,
            won: existing.won,
          },
        }));
      }
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
        isBot: false,
      };

      this.state.players.set(userId, player);
    }

    // Check if this is a bot game (room ID starts with "bot_")
    const isBotGame = this.room.id.startsWith('bot_');

    // If this is a bot game and we only have one human player, create the bot player
    if (isBotGame && this.state.players.size === 1) {
      // Generate bot info - use provided info or generate new
      const botName = data.botOpponent?.username || generateBotName();
      const botElo = data.botOpponent?.elo || generateBotElo(elo);
      await this.createBotPlayer(botName, botElo);
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
      isBot: false,
    }));

    // Start game when 2 players are connected
    if (playerCount === 2 && !this.state.gameStarted) {
      this.state.gameStarted = true;
      this.state.gameStartedAt = Date.now();

      const duration = this.state.mode === 'friendly' ? FRIENDLY_DURATION : RANKED_DURATION;
      this.room.broadcast(JSON.stringify({
        type: 'game_start',
        players: players.map(p => ({
          id: p.userId,
          username: p.username,
          elo: p.elo,
          isBot: p.isBot,
        })),
        duration,
        mode: this.state.mode,
      }));

      console.log(`[Game ${this.room.id}] Game started with ${players.map(p => p.username + (p.isBot ? ' (BOT)' : '')).join(' vs ')}`);

      // Start bot moves if this is a bot game
      if (isBotGame) {
        this.startBotMoves();
      }
    }

    await this.saveState();
  }

  private async createBotPlayer(botName: string, botElo: number) {
    const botUserId = `bot_${Date.now()}`;

    // Initialize bot game state with ELO (affects difficulty)
    this.state.botState = createInitialBotState(botElo);

    const botPlayer: Player = {
      userId: botUserId,
      username: botName,
      elo: botElo,
      connectionId: 'bot', // Special connection ID for bot
      grid: this.state.botState.grid,
      score: this.state.botState.score,
      gameOver: this.state.botState.gameOver,
      won: this.state.botState.won,
      wantsRematch: false,
      forfeited: false,
      lastSeen: Date.now(),
      isBot: true,
    };

    this.state.players.set(botUserId, botPlayer);

    // Notify the human player about the bot joining
    this.room.broadcast(JSON.stringify({
      type: 'player_joined',
      playerId: botUserId,
      username: botName,
      elo: botElo,
      playerCount: 2,
      isBot: true,
    }));

    console.log(`[Game ${this.room.id}] Bot player created: ${botName} (ELO: ${botElo})`);
  }

  private startBotMoves() {
    // Schedule periodic bot moves using alarm
    this.scheduleBotMove();
  }

  private async scheduleBotMove() {
    if (this.state.resultSent) return;

    // Random delay between moves
    const delay = BOT_MIN_MOVE_INTERVAL + Math.random() * (BOT_MAX_MOVE_INTERVAL - BOT_MIN_MOVE_INTERVAL);
    await this.room.storage.setAlarm(Date.now() + delay);
  }

  async onAlarm() {
    console.log(`[Game] Alarm fired!`);
    // Check if this is a bot move alarm or a disconnect timeout
    const now = Date.now();

    // First, handle disconnected players (existing logic)
    const playersToRemove: string[] = [];

    for (const [id, player] of this.state.players) {
      if (player.isBot) continue; // Skip bots for disconnect check

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

    // Now handle bot moves
    if (this.state.botState && !this.state.resultSent && this.state.gameStarted) {
      await this.performBotMove();
    }

    await this.saveState();
  }

  private async performBotMove() {
    console.log(`[Bot] performBotMove called - checking state...`);
    if (!this.state.botState || this.state.botState.gameOver || this.state.botState.won) {
      console.log(`[Bot] Skipping move - botState: ${!!this.state.botState}, gameOver: ${this.state.botState?.gameOver}, won: ${this.state.botState?.won}`);
      return;
    }

    // Find the bot player
    let botPlayer: Player | undefined;
    for (const player of this.state.players.values()) {
      if (player.isBot) {
        botPlayer = player;
        break;
      }
    }

    if (!botPlayer) return;

    // Log state before move
    const beforeGrid = [...this.state.botState.grid];
    const beforeScore = this.state.botState.score;

    // Make a bot move
    this.state.botState = botMakeMove(this.state.botState);

    // Update bot player state
    botPlayer.grid = this.state.botState.grid;
    botPlayer.score = this.state.botState.score;
    botPlayer.gameOver = this.state.botState.gameOver;
    botPlayer.won = this.state.botState.won;

    // Log the move with grid visualization
    const formatGrid = (g: number[]) => {
      const rows = [];
      for (let r = 0; r < 4; r++) {
        rows.push(g.slice(r * 4, r * 4 + 4).map(v => v.toString().padStart(4)).join(' '));
      }
      return rows.join('\n');
    };

    console.log(`[Bot] ELO: ${this.state.botState.elo} | Score: ${beforeScore} -> ${botPlayer.score} (+${botPlayer.score - beforeScore})`);
    console.log(`[Bot] Grid:\n${formatGrid(botPlayer.grid)}`);

    // Broadcast bot state to human player
    this.room.broadcast(JSON.stringify({
      type: 'opponent_state',
      state: {
        grid: botPlayer.grid,
        score: botPlayer.score,
        gameOver: botPlayer.gameOver,
        won: botPlayer.won,
      },
      username: botPlayer.username,
      elo: botPlayer.elo,
      isBot: true,
    }));

    // Check if match should resolve
    await this.tryResolveMatch(botPlayer.won ? '2048' : 'score');

    // Schedule next bot move if game is not over
    if (!this.state.resultSent && !this.state.botState.gameOver && !this.state.botState.won) {
      await this.scheduleBotMove();
    }
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

    // Check if match should resolve on every state update
    // (active player may have overtaken a done player's score)
    await this.tryResolveMatch(data.state.won ? '2048' : 'score');

    await this.saveState();
  }

  private async tryResolveMatch(reason: 'score' | '2048' | 'timer') {
    if (this.state.resultSent) return;

    const players = Array.from(this.state.players.values());
    if (players.length !== 2) return;

    const [p1, p2] = players;
    const someoneWon2048 = p1.won || p2.won;
    const p1Done = p1.gameOver || p1.won;
    const p2Done = p2.gameOver || p2.won;
    const bothDone = p1Done && p2Done;

    // Active player overtook done player's score → instant win
    const overtook = (p1Done && !p2Done && p2.score > p1.score) ||
                     (p2Done && !p1Done && p1.score > p2.score);

    // Match resolves when:
    // - Someone reached 2048 (instant win)
    // - Timer expired (compare scores)
    // - Both players ran out of moves (compare scores)
    // - Active player's score exceeded done player's score (instant win)
    if (!someoneWon2048 && !bothDone && reason !== 'timer' && !overtook) return;

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

    console.log(`[Game] Match resolved: ${winnerId ? `winner=${winnerId}` : 'tie'} (${actualReason}) scores: ${p1.username}=${p1.score} vs ${p2.username}=${p2.score}`);
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

    // Check if this is a bot game - if so, auto-accept rematch
    const isBotGame = this.room.id.startsWith('bot_');
    if (isBotGame) {
      // Find bot player and auto-accept
      for (const p of this.state.players.values()) {
        if (p.isBot) {
          p.wantsRematch = true;
        }
      }
    }

    // Check if both want rematch
    const players = Array.from(this.state.players.values());
    const allWantRematch = players.length === 2 && players.every(p => p.wantsRematch);

    if (allWantRematch) {
      // Reset game state for both players
      for (const p of players) {
        if (p.isBot) {
          // Reset bot state (preserve ELO for difficulty)
          this.state.botState = createInitialBotState(p.elo);
          p.grid = this.state.botState.grid;
          p.score = this.state.botState.score;
          p.gameOver = this.state.botState.gameOver;
          p.won = this.state.botState.won;
        } else {
          p.grid = [];
          p.score = 0;
          p.gameOver = false;
          p.won = false;
        }
        p.wantsRematch = false;
        p.forfeited = false;
      }
      this.state.resultSent = false;
      this.state.gameStartedAt = Date.now();

      // Send rematch_start to trigger UI reset
      this.room.broadcast(JSON.stringify({ type: 'rematch_start' }));

      // Also send game_start to restart the timer
      const duration = this.state.mode === 'friendly' ? FRIENDLY_DURATION : RANKED_DURATION;
      this.room.broadcast(JSON.stringify({
        type: 'game_start',
        players: players.map(p => ({
          id: p.userId,
          username: p.username,
          elo: p.elo,
          isBot: p.isBot,
        })),
        duration,
        mode: this.state.mode,
      }));

      console.log(`[Game ${this.room.id}] Rematch started`);

      // Restart bot moves for bot games
      if (isBotGame) {
        this.startBotMoves();
      }
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
      gameStartedAt: this.state.gameStartedAt,
      resultSent: this.state.resultSent,
      mode: this.state.mode,
      botState: this.state.botState,
    });
  }
}

GameServer satisfies Party.Worker;
