// Shared message types for PartyKit communication

// Game mode
export type GameMode = 'ranked' | 'friendly';

// Player info
export interface PlayerInfo {
  userId: string;
  username: string;
  elo: number;
}

// Game state as sent over WebSocket
export interface GameStateMessage {
  grid: number[];
  score: number;
  gameOver: boolean;
  won: boolean;
}

// ============ Lobby Messages (Client -> Server) ============

export type LobbyClientMessage =
  | { type: 'join_queue'; userId: string; username: string; elo: number }
  | { type: 'leave_queue' };

// ============ Lobby Messages (Server -> Client) ============

export type LobbyServerMessage =
  | { type: 'waiting'; position: number }
  | { type: 'matched'; roomId: string; opponent: { username: string; elo: number } }
  | { type: 'error'; message: string };

// ============ Game Messages (Client -> Server) ============

export type GameClientMessage =
  | { type: 'join'; userId: string; username: string; elo: number; mode?: GameMode }
  | { type: 'state_update'; state: GameStateMessage }
  | { type: 'request_rematch' }
  | { type: 'forfeit' }
  | { type: 'heartbeat' }
  | { type: 'timer_expired' };

// ============ Game Messages (Server -> Client) ============

export type GameServerMessage =
  | { type: 'player_joined'; playerId: string; username: string; elo: number; playerCount: number }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_start'; players: Array<{ id: string; username: string; elo: number }>; duration: number; mode: GameMode }
  | { type: 'opponent_state'; state: GameStateMessage; username: string; elo: number }
  | { type: 'opponent_connected'; connected: boolean }
  | { type: 'rematch_requested'; by: 'local' | 'opponent' }
  | { type: 'rematch_start' }
  | { type: 'opponent_forfeited' }
  | { type: 'game_result'; outcome: 'win' | 'loss' | 'tie'; yourScore: number; opponentScore: number; reason: 'score' | '2048' | 'forfeit' | 'timer' }
  | { type: 'error'; message: string };
