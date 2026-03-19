import type * as Party from "partykit/server";
import {
  createInitialBotState,
  botMakeMove,
  BotGameState,
  generateBotName,
  generateBotElo,
} from "./bot-game";
import { createInitialState, applyMove, type EngineState } from "../src/lib/game-engine";

const isDev = process.env.NODE_ENV !== "production";
const log = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

const GAME_SIZE = 4;

interface Player {
  userId: string;
  username: string;
  elo: number;
  connectionId: string;
  /** Server-authoritative game state for this player */
  engineState: EngineState;
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
  mode: "ranked" | "friendly";
  botState?: BotGameState;
  botMoveInterval?: ReturnType<typeof setInterval>;
  nextSlowMoveAt?: number;
}

const BOT_MIN_MOVE_INTERVAL = 200;
const BOT_MAX_MOVE_INTERVAL = 800;
const BOT_SLOW_MOVE_INTERVAL = 1000;
const BOT_SLOW_MOVE_MIN_GAP = 15000;
const BOT_SLOW_MOVE_MAX_GAP = 20000;

const RANKED_DURATION = 5 * 60;
const FRIENDLY_DURATION = 5 * 60;
const DISCONNECT_TIMEOUT = 15000;

export default class GameServer implements Party.Server {
  private state: GameState = {
    players: new Map(),
    gameStarted: false,
    gameStartedAt: null,
    resultSent: false,
    mode: "ranked",
  };

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const stored = await this.room.storage.get<{
      players: [string, Player][];
      gameStarted: boolean;
      gameStartedAt?: number | null;
      resultSent?: boolean;
      mode?: "ranked" | "friendly";
      botState?: BotGameState;
    }>("gameState");

    if (stored) {
      this.state = {
        players: new Map(stored.players),
        gameStarted: stored.gameStarted,
        gameStartedAt: stored.gameStartedAt ?? null,
        resultSent: stored.resultSent || false,
        mode: stored.mode || "ranked",
        botState: stored.botState,
      };

      const isBotGame = this.room.id.startsWith("bot_");
      if (isBotGame && this.state.botState && !this.state.resultSent) {
        this.scheduleBotMove();
      }
    }
  }

  async onConnect(connection: Party.Connection) {
    void connection;
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "join":
          await this.handleJoin(data, sender);
          break;
        case "move":
          await this.handleMove(data, sender);
          break;
        case "state_update":
          // Legacy: accept state_update but don't trust it for scoring
          await this.handleLegacyStateUpdate(data, sender);
          break;
        case "request_rematch":
          await this.handleRematchRequest(sender);
          break;
        case "forfeit":
          await this.handleForfeit(sender);
          break;
        case "timer_expired":
          await this.handleTimerExpired(sender);
          break;
        case "heartbeat":
          this.handleHeartbeat(sender);
          break;
      }
    } catch (e) {
      console.error("[Game] Message error:", e);
      sender.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  }

  private async handleJoin(
    data: {
      userId: string;
      username: string;
      elo: number;
      mode?: "ranked" | "friendly";
      botOpponent?: { username: string; elo: number };
    },
    sender: Party.Connection
  ) {
    const { userId, username, elo } = data;

    if (this.state.players.size === 0 && data.mode) {
      this.state.mode = data.mode;
    }

    const existing = this.state.players.get(userId);

    if (existing) {
      existing.connectionId = sender.id;
      existing.lastSeen = Date.now();

      this.broadcastToOthers(sender.id, {
        type: "opponent_connected",
        connected: true,
      });

      // Send the player's server-authoritative state back for reconnection
      if (existing.engineState.grid.some((v) => v !== 0)) {
        sender.send(
          JSON.stringify({
            type: "your_state",
            state: {
              grid: existing.engineState.grid,
              score: existing.engineState.score,
              gameOver: existing.engineState.gameOver,
              won: existing.engineState.won,
            },
          })
        );
      }

      if (this.state.gameStarted) {
        const players = Array.from(this.state.players.values());
        const duration = this.state.mode === "friendly" ? FRIENDLY_DURATION : RANKED_DURATION;
        let timeRemaining: number | undefined;
        if (this.state.gameStartedAt) {
          const elapsed = Math.floor((Date.now() - this.state.gameStartedAt) / 1000);
          timeRemaining = Math.max(0, duration - elapsed);
        }

        sender.send(
          JSON.stringify({
            type: "game_start",
            players: players.map((p) => ({
              id: p.userId,
              username: p.username,
              elo: p.elo,
              isBot: p.isBot,
            })),
            duration,
            timeRemaining,
            mode: this.state.mode,
          })
        );

        const opponent = players.find((p) => p.userId !== existing.userId);
        if (opponent) {
          sender.send(
            JSON.stringify({
              type: "opponent_state",
              state: {
                grid: opponent.engineState.grid,
                score: opponent.engineState.score,
                gameOver: opponent.engineState.gameOver,
                won: opponent.engineState.won,
              },
              username: opponent.username,
              elo: opponent.elo,
              isBot: opponent.isBot,
            })
          );
        }
      }
    } else {
      // Create server-authoritative initial board for this player
      const initialState = createInitialState(GAME_SIZE);

      const player: Player = {
        userId,
        username,
        elo,
        connectionId: sender.id,
        engineState: initialState,
        wantsRematch: false,
        forfeited: false,
        lastSeen: Date.now(),
        isBot: false,
      };

      this.state.players.set(userId, player);
    }

    const isBotGame = this.room.id.startsWith("bot_");

    if (isBotGame && this.state.players.size === 1) {
      const botName = data.botOpponent?.username || generateBotName();
      const botElo = data.botOpponent?.elo || generateBotElo(elo);
      await this.createBotPlayer(botName, botElo);
    }

    const players = Array.from(this.state.players.values());
    const playerCount = players.length;

    this.room.broadcast(
      JSON.stringify({
        type: "player_joined",
        playerId: userId,
        username,
        elo,
        playerCount,
        isBot: false,
      })
    );

    if (playerCount === 2 && !this.state.gameStarted) {
      this.state.gameStarted = true;
      this.state.gameStartedAt = Date.now();

      const duration = this.state.mode === "friendly" ? FRIENDLY_DURATION : RANKED_DURATION;
      this.room.broadcast(
        JSON.stringify({
          type: "game_start",
          players: players.map((p) => ({
            id: p.userId,
            username: p.username,
            elo: p.elo,
            isBot: p.isBot,
          })),
          duration,
          mode: this.state.mode,
        })
      );

      // Send each player their initial board + opponent's initial state
      for (const player of players) {
        if (!player.isBot) {
          const conn = this.room.getConnection(player.connectionId);
          if (conn) {
            conn.send(
              JSON.stringify({
                type: "your_initial_state",
                state: {
                  grid: player.engineState.grid,
                  score: player.engineState.score,
                  gameOver: player.engineState.gameOver,
                  won: player.engineState.won,
                },
              })
            );

            // Send the opponent's initial state so both boards render immediately
            const opponent = players.find((p) => p.userId !== player.userId);
            if (opponent) {
              conn.send(
                JSON.stringify({
                  type: "opponent_state",
                  state: {
                    grid: opponent.engineState.grid,
                    score: opponent.engineState.score,
                    gameOver: opponent.engineState.gameOver,
                    won: opponent.engineState.won,
                  },
                  username: opponent.username,
                  elo: opponent.elo,
                  isBot: opponent.isBot,
                })
              );
            }
          }
        }
      }

      log(
        `[Game ${this.room.id}] Started: ${players.map((p) => p.username + (p.isBot ? " (BOT)" : "")).join(" vs ")}`
      );

      if (isBotGame) {
        this.startBotMoves();
      }
    }

    await this.saveState();
  }

  private async createBotPlayer(botName: string, botElo: number) {
    const botUserId = `bot_${Date.now()}`;
    this.state.botState = createInitialBotState(botElo);

    const botPlayer: Player = {
      userId: botUserId,
      username: botName,
      elo: botElo,
      connectionId: "bot",
      engineState: {
        grid: [...this.state.botState.grid],
        score: this.state.botState.score,
        gameOver: this.state.botState.gameOver,
        won: this.state.botState.won,
        size: GAME_SIZE,
      },
      wantsRematch: false,
      forfeited: false,
      lastSeen: Date.now(),
      isBot: true,
    };

    this.state.players.set(botUserId, botPlayer);

    this.room.broadcast(
      JSON.stringify({
        type: "player_joined",
        playerId: botUserId,
        username: botName,
        elo: botElo,
        playerCount: 2,
        isBot: true,
      })
    );

    log(`[Game ${this.room.id}] Bot created: ${botName} (ELO: ${botElo})`);
  }

  private startBotMoves() {
    const firstSlowGap =
      BOT_SLOW_MOVE_MIN_GAP + Math.random() * (BOT_SLOW_MOVE_MAX_GAP - BOT_SLOW_MOVE_MIN_GAP);
    this.state.nextSlowMoveAt = Date.now() + firstSlowGap;
    this.scheduleBotMove();
  }

  private async scheduleBotMove() {
    if (this.state.resultSent) return;

    const now = Date.now();
    let delay: number;

    if (this.state.nextSlowMoveAt && now >= this.state.nextSlowMoveAt) {
      delay = BOT_SLOW_MOVE_INTERVAL;
      const nextGap =
        BOT_SLOW_MOVE_MIN_GAP + Math.random() * (BOT_SLOW_MOVE_MAX_GAP - BOT_SLOW_MOVE_MIN_GAP);
      this.state.nextSlowMoveAt = now + nextGap;
    } else {
      delay =
        BOT_MIN_MOVE_INTERVAL + Math.random() * (BOT_MAX_MOVE_INTERVAL - BOT_MIN_MOVE_INTERVAL);
    }

    await this.room.storage.setAlarm(now + delay);
  }

  private lastAlarmTime = 0;
  async onAlarm() {
    const now = Date.now();
    this.lastAlarmTime = now;

    const playersToRemove: string[] = [];

    for (const [id, player] of this.state.players) {
      if (player.isBot) continue;
      const connection = this.room.getConnection(player.connectionId);
      if (!connection && now - player.lastSeen > DISCONNECT_TIMEOUT) {
        playersToRemove.push(id);
      }
    }

    for (const id of playersToRemove) {
      const player = this.state.players.get(id);
      if (player) {
        this.state.players.delete(id);
        this.room.broadcast(
          JSON.stringify({
            type: "player_left",
            playerId: id,
          })
        );
        log(`[Game] ${player.username} removed (timeout)`);
      }
    }

    if (this.state.botState && !this.state.resultSent && this.state.gameStarted) {
      await this.performBotMove();
    }

    await this.saveState();
  }

  private async performBotMove() {
    if (!this.state.botState || this.state.botState.gameOver || this.state.botState.won) {
      return;
    }

    let botPlayer: Player | undefined;
    for (const player of this.state.players.values()) {
      if (player.isBot) {
        botPlayer = player;
        break;
      }
    }

    if (!botPlayer) return;

    this.state.botState = botMakeMove(this.state.botState);

    // Sync bot's engine state
    botPlayer.engineState = {
      grid: [...this.state.botState.grid],
      score: this.state.botState.score,
      gameOver: this.state.botState.gameOver,
      won: this.state.botState.won,
      size: GAME_SIZE,
    };

    this.room.broadcast(
      JSON.stringify({
        type: "opponent_state",
        state: {
          grid: botPlayer.engineState.grid,
          score: botPlayer.engineState.score,
          gameOver: botPlayer.engineState.gameOver,
          won: botPlayer.engineState.won,
        },
        username: botPlayer.username,
        elo: botPlayer.elo,
        isBot: true,
      })
    );

    await this.tryResolveMatch(botPlayer.engineState.won ? "2048" : "score");

    if (!this.state.resultSent && !this.state.botState.gameOver && !this.state.botState.won) {
      await this.scheduleBotMove();
    }
  }

  /**
   * Server-authoritative move handler.
   * Client sends only the direction; server computes the new state.
   */
  private async handleMove(data: { direction: number }, sender: Party.Connection) {
    const direction = data.direction;
    if (typeof direction !== "number" || direction < 0 || direction > 3) return;
    if (!this.state.gameStarted || this.state.players.size < 2) return;

    let player: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        player = p;
        break;
      }
    }

    if (!player || player.engineState.gameOver || player.engineState.won) return;

    // Compute new state server-side
    const newState = applyMove(player.engineState, direction);
    if (newState === player.engineState) return; // Move didn't change anything

    player.engineState = newState;
    player.lastSeen = Date.now();

    // Send authoritative state back to the mover
    sender.send(
      JSON.stringify({
        type: "your_game_state",
        state: {
          grid: newState.grid,
          score: newState.score,
          gameOver: newState.gameOver,
          won: newState.won,
        },
      })
    );

    // Broadcast to opponent
    this.broadcastToOthers(sender.id, {
      type: "opponent_state",
      state: {
        grid: newState.grid,
        score: newState.score,
        gameOver: newState.gameOver,
        won: newState.won,
      },
      username: player.username,
      elo: player.elo,
    });

    await this.tryResolveMatch(newState.won ? "2048" : "score");
    await this.saveState();
  }

  /**
   * Legacy state_update handler — kept for backward compatibility during transition.
   * Does NOT update the server-authoritative engine state.
   * Only relays to opponent for display purposes.
   */
  private async handleLegacyStateUpdate(
    data: { state: { grid: number[]; score: number; gameOver: boolean; won: boolean } },
    sender: Party.Connection
  ) {
    let player: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        player = p;
        break;
      }
    }

    if (!player) return;
    player.lastSeen = Date.now();

    // Relay to opponent for display, but don't update server state
    this.broadcastToOthers(sender.id, {
      type: "opponent_state",
      state: data.state,
      username: player.username,
      elo: player.elo,
    });
  }

  private async tryResolveMatch(reason: "score" | "2048" | "timer") {
    if (this.state.resultSent) return;

    const players = Array.from(this.state.players.values());
    if (players.length !== 2) return;

    const [p1, p2] = players;
    const someoneWon2048 = p1.engineState.won || p2.engineState.won;
    const p1RanOutOfMoves = p1.engineState.gameOver && !p1.engineState.won;
    const p2RanOutOfMoves = p2.engineState.gameOver && !p2.engineState.won;

    if (!someoneWon2048 && !p1RanOutOfMoves && !p2RanOutOfMoves && reason !== "timer") return;

    this.state.resultSent = true;

    let winnerId: string | null = null;
    let actualReason: "score" | "2048" | "timer" | "no_moves" = reason;

    if (someoneWon2048) {
      winnerId = p1.engineState.won ? p1.userId : p2.userId;
      actualReason = "2048";
    } else if (p1RanOutOfMoves && !p2RanOutOfMoves) {
      winnerId = p2.userId;
      actualReason = "no_moves";
    } else if (p2RanOutOfMoves && !p1RanOutOfMoves) {
      winnerId = p1.userId;
      actualReason = "no_moves";
    } else if (p1RanOutOfMoves && p2RanOutOfMoves) {
      if (p1.engineState.score > p2.engineState.score) winnerId = p1.userId;
      else if (p2.engineState.score > p1.engineState.score) winnerId = p2.userId;
      actualReason = "no_moves";
    } else {
      if (p1.engineState.score > p2.engineState.score) winnerId = p1.userId;
      else if (p2.engineState.score > p1.engineState.score) winnerId = p2.userId;
    }

    for (const player of players) {
      const opponent = players.find((p) => p.userId !== player.userId)!;
      const outcome: "win" | "loss" | "tie" =
        winnerId === null ? "tie" : winnerId === player.userId ? "win" : "loss";

      const conn = this.room.getConnection(player.connectionId);
      if (conn) {
        conn.send(
          JSON.stringify({
            type: "game_result",
            outcome,
            yourScore: player.engineState.score,
            opponentScore: opponent.engineState.score,
            reason: actualReason,
          })
        );
      }
    }

    log(
      `[Game] Match resolved: ${winnerId ? `winner=${winnerId}` : "tie"} (${actualReason}) ${p1.username}=${p1.engineState.score} vs ${p2.username}=${p2.engineState.score}`
    );
  }

  private async handleTimerExpired(sender: Party.Connection) {
    if (this.state.resultSent) return;
    await this.tryResolveMatch("timer");
    await this.saveState();
  }

  private async handleRematchRequest(sender: Party.Connection) {
    let player: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        player = p;
        break;
      }
    }

    if (!player) return;

    player.wantsRematch = true;

    const isBotGame = this.room.id.startsWith("bot_");
    if (isBotGame) {
      for (const p of this.state.players.values()) {
        if (p.isBot) {
          p.wantsRematch = true;
        }
      }
    }

    const players = Array.from(this.state.players.values());
    const allWantRematch = players.length === 2 && players.every((p) => p.wantsRematch);

    if (allWantRematch) {
      for (const p of players) {
        if (p.isBot) {
          this.state.botState = createInitialBotState(p.elo);
          p.engineState = {
            grid: [...this.state.botState.grid],
            score: this.state.botState.score,
            gameOver: this.state.botState.gameOver,
            won: this.state.botState.won,
            size: GAME_SIZE,
          };
        } else {
          // Generate a fresh server-authoritative board
          p.engineState = createInitialState(GAME_SIZE);
        }
        p.wantsRematch = false;
        p.forfeited = false;
      }
      this.state.resultSent = false;
      this.state.gameStartedAt = Date.now();

      this.room.broadcast(JSON.stringify({ type: "rematch_start" }));

      const duration = this.state.mode === "friendly" ? FRIENDLY_DURATION : RANKED_DURATION;
      this.room.broadcast(
        JSON.stringify({
          type: "game_start",
          players: players.map((p) => ({
            id: p.userId,
            username: p.username,
            elo: p.elo,
            isBot: p.isBot,
          })),
          duration,
          mode: this.state.mode,
        })
      );

      // Send fresh initial boards to human players
      for (const p of players) {
        if (!p.isBot) {
          const conn = this.room.getConnection(p.connectionId);
          if (conn) {
            conn.send(
              JSON.stringify({
                type: "your_initial_state",
                state: {
                  grid: p.engineState.grid,
                  score: p.engineState.score,
                  gameOver: p.engineState.gameOver,
                  won: p.engineState.won,
                },
              })
            );

            const opponent = players.find((op) => op.userId !== p.userId);
            if (opponent) {
              conn.send(
                JSON.stringify({
                  type: "opponent_state",
                  state: {
                    grid: opponent.engineState.grid,
                    score: opponent.engineState.score,
                    gameOver: opponent.engineState.gameOver,
                    won: opponent.engineState.won,
                  },
                  username: opponent.username,
                  elo: opponent.elo,
                  isBot: opponent.isBot,
                })
              );
            }
          }
        }
      }

      log(`[Game ${this.room.id}] Rematch started`);

      if (isBotGame) {
        this.startBotMoves();
      }
    } else {
      this.broadcastToOthers(sender.id, {
        type: "rematch_requested",
        by: "opponent",
      });
    }

    await this.saveState();
  }

  private async handleForfeit(sender: Party.Connection) {
    let player: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        player = p;
        break;
      }
    }

    if (!player) return;

    player.forfeited = true;

    this.broadcastToOthers(sender.id, {
      type: "opponent_forfeited",
    });

    log(`[Game ${this.room.id}] ${player.username} forfeited`);

    if (!this.state.resultSent) {
      this.state.resultSent = true;
      const players = Array.from(this.state.players.values());

      for (const p of players) {
        const opponent = players.find((op) => op.userId !== p.userId);
        const isForfeitingPlayer = p.userId === player.userId;
        const outcome: "win" | "loss" = isForfeitingPlayer ? "loss" : "win";

        const conn = this.room.getConnection(p.connectionId);
        if (conn) {
          conn.send(
            JSON.stringify({
              type: "game_result",
              outcome,
              yourScore: p.engineState.score,
              opponentScore: opponent?.engineState.score ?? 0,
              reason: "forfeit",
            })
          );
        }
      }
    }

    await this.saveState();
  }

  private handleHeartbeat(sender: Party.Connection) {
    for (const p of this.state.players.values()) {
      if (p.connectionId === sender.id) {
        p.lastSeen = Date.now();
        break;
      }
    }
  }

  async onClose(connection: Party.Connection) {
    let disconnectedPlayer: Player | undefined;
    for (const p of this.state.players.values()) {
      if (p.connectionId === connection.id) {
        disconnectedPlayer = p;
        break;
      }
    }

    if (!disconnectedPlayer) return;

    this.broadcastToOthers(connection.id, {
      type: "opponent_connected",
      connected: false,
    });

    await this.room.storage.setAlarm(Date.now() + DISCONNECT_TIMEOUT);
  }

  private broadcastToOthers(senderId: string, message: object) {
    const msgStr = JSON.stringify(message);
    for (const conn of this.room.getConnections()) {
      if (conn.id !== senderId) {
        conn.send(msgStr);
      }
    }
  }

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
