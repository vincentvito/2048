/**
 * Standard ELO rating system for ranked 2048 multiplayer.
 *
 * K-factor: 32 for new players (<30 games), 16 for established players.
 * Expected score formula: 1 / (1 + 10^((opponentElo - myElo) / 400))
 * New ELO = oldElo + K * (actualScore - expectedScore)
 *
 * Win = 1.0, Loss = 0.0, Tie = 0.5
 * Starting ELO: 1200
 * Minimum ELO: 100
 */

export const DEFAULT_ELO = 1200;
export const MIN_ELO = 100;

const K_NEW_PLAYER = 32;
const K_ESTABLISHED = 16;
const NEW_PLAYER_THRESHOLD = 30;

export interface EloResult {
  newPlayerElo: number;
  newOpponentElo: number;
  playerDelta: number;
  opponentDelta: number;
}

const OUTCOME_SCORES: Record<"win" | "loss" | "tie", number> = {
  win: 1.0,
  loss: 0.0,
  tie: 0.5,
};

function getKFactor(gamesPlayed: number): number {
  return gamesPlayed < NEW_PLAYER_THRESHOLD ? K_NEW_PLAYER : K_ESTABLISHED;
}

function expectedScore(myElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
}

function clampElo(elo: number): number {
  return Math.max(MIN_ELO, Math.round(elo));
}

export function calculateElo(
  playerElo: number,
  opponentElo: number,
  outcome: "win" | "loss" | "tie",
  playerGames: number = 0,
  opponentGames: number = 0
): EloResult {
  const playerK = getKFactor(playerGames);
  const opponentK = getKFactor(opponentGames);

  const playerExpected = expectedScore(playerElo, opponentElo);
  const opponentExpected = expectedScore(opponentElo, playerElo);

  const playerActual = OUTCOME_SCORES[outcome];
  const opponentActual = 1 - playerActual;

  const rawPlayerDelta = playerK * (playerActual - playerExpected);
  const rawOpponentDelta = opponentK * (opponentActual - opponentExpected);

  const newPlayerElo = clampElo(playerElo + rawPlayerDelta);
  const newOpponentElo = clampElo(opponentElo + rawOpponentDelta);

  return {
    newPlayerElo,
    newOpponentElo,
    playerDelta: newPlayerElo - playerElo,
    opponentDelta: newOpponentElo - opponentElo,
  };
}

export interface EloRank {
  name: string;
  color: string;
}

export function getEloRank(elo: number): EloRank {
  if (elo >= 1900) return { name: "Diamond", color: "#b9f2ff" };
  if (elo >= 1600) return { name: "Platinum", color: "#e5e4e2" };
  if (elo >= 1300) return { name: "Gold", color: "#ffd700" };
  if (elo >= 1000) return { name: "Silver", color: "#c0c0c0" };
  return { name: "Bronze", color: "#cd7f32" };
}
