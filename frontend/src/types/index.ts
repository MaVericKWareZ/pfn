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
  NO_PENALTY = "NO_PENALTY",
  CARD_COMPLETE = "CARD_COMPLETE",
  SKIP = "SKIP",
}

export interface Card {
  id: CardId;
  easyWord: string;
  hardPhrase: string;
}

export interface PlayerInfo {
  id: PlayerId;
  name: string;
  teamId: TeamId | null;
  role: PlayerRole;
  isConnected: boolean;
  isHost: boolean;
}

export interface TeamInfo {
  id: TeamId;
  name: string;
  playerIds: PlayerId[];
  score: number;
}

export interface TurnInfo {
  teamId: TeamId;
  poetId: PlayerId;
  judgeId: PlayerId;
  easyWordGuessed: boolean;
  hardPhraseGuessed: boolean;
  pointsEarned: number;
}

export interface RoomState {
  code: RoomCode;
  hostId: PlayerId;
  players: PlayerInfo[];
  teams: TeamInfo[];
  gameState: GameState;
}

export interface GameStateData {
  state: GameState;
  teams: TeamInfo[];
  players: PlayerInfo[];
  currentTurn: TurnInfo | null;
  turnNumber: number;
  timerRemaining: number | null;
}

export interface FeedbackData {
  type: "correct" | "no" | "skip" | "time_up";
  message: string;
  teamId?: TeamId;
}

export interface TurnEndedData {
  reason: TurnEndReason;
  pointsEarned: number;
  teamScore: number;
  card: Card;
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

export interface TeamSummary {
  id: TeamId;
  name: string;
  score: number;
  totalCardsAttempted: number;
  totalCardsCompleted: number;
  totalCardsSkipped: number;
}

export interface GameEndedData {
  winningTeamId: TeamId | null;
  winningTeamName: string | null;
  teams: TeamSummary[];
  roundStats: RoundStats[];
  totalRounds: number;
  gameDuration: number;
}

export interface CardRevealedData {
  card: Card;
  reason: "easy" | "hard" | "skip" | "no";
  pointsEarned: number;
}
