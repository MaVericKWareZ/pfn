export type PlayerId = string;
export type TeamId = string;
export type RoomCode = string;
export type CardId = string;

export enum GameState {
  LOBBY = "LOBBY",
  PLAYING = "PLAYING",
  TURN_ACTIVE = "TURN_ACTIVE",
  TURN_ENDED = "TURN_ENDED",
  GAME_OVER = "GAME_OVER",
}

export enum PlayerRole {
  POET = "POET",
  JUDGE = "JUDGE",
  GUESSER = "GUESSER",
  SPECTATOR = "SPECTATOR",
}

export enum TurnEndReason {
  TIME_UP = "TIME_UP",
}

export interface Card {
  id: CardId;
  easyWord: string;
  hardPhrase: string;
}

export interface Player {
  id: PlayerId;
  name: string;
  teamId: TeamId | null;
  role: PlayerRole;
  isConnected: boolean;
  isHost: boolean;
}

export interface Team {
  id: TeamId;
  name: string;
  playerIds: PlayerId[];
  score: number;
}

export interface CardAttempt {
  card: Card;
  easyWordGuessed: boolean;
  hardPhraseGuessed: boolean;
  pointsEarned: number;
  skipped: boolean;
}

export interface Turn {
  teamId: TeamId;
  poetId: PlayerId;
  judgeId: PlayerId;
  currentCard: Card;
  cardsAttempted: CardAttempt[];
  currentCardEasyGuessed: boolean;
  currentCardHardGuessed: boolean;
  startTime: number;
  endTime: number | null;
  endReason: TurnEndReason | null;
  pointsEarned: number;
}

export interface RoundStats {
  roundNumber: number;
  teamId: TeamId;
  teamName: string;
  poetName: string;
  cardsAttempted: number;
  cardsCompleted: number;
  cardsSkipped: number;
  pointsEarned: number;
  duration: number;
}

export interface GameSummary {
  winningTeamId: TeamId | null;
  winningTeamName: string | null;
  teams: Array<{
    id: TeamId;
    name: string;
    score: number;
    totalCardsAttempted: number;
    totalCardsCompleted: number;
    totalCardsSkipped: number;
  }>;
  roundStats: RoundStats[];
  totalRounds: number;
  gameDuration: number;
}

export interface GameConfig {
  turnDurationSeconds: number;
  roundsPerTeam: number;
  maxTurns?: number;
}

export interface GameSnapshot {
  state: GameState;
  teams: Team[];
  players: Player[];
  currentTurn: Turn | null;
  turnNumber: number;
  config: GameConfig;
  timerRemaining: number | null;
}

export interface RoomSnapshot {
  code: RoomCode;
  hostId: PlayerId;
  players: Player[];
  teams: Team[];
  gameState: GameState;
  game: GameSnapshot | null;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  turnDurationSeconds: 60,
  roundsPerTeam: 3,
};
