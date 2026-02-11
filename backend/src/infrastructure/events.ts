import {
  PlayerId,
  TeamId,
  RoomCode,
  GameState,
  PlayerRole,
  TurnEndReason,
  Card,
  RoundStats,
} from "../domain/types";

export enum ClientEvent {
  ROOM_CREATE = "room:create",
  ROOM_JOIN = "room:join",
  ROOM_LEAVE = "room:leave",
  TEAM_ASSIGN = "team:assign",
  TEAM_SHUFFLE = "team:shuffle",
  GAME_START = "game:start",
  GAME_END = "game:end",
  TURN_START = "turn:start",
  TURN_CORRECT_EASY = "turn:correct:easy",
  TURN_CORRECT_HARD = "turn:correct:hard",
  TURN_SKIP = "turn:skip",
  TURN_NO = "turn:no",
  PLAYER_RECONNECT = "player:reconnect",
  ROOM_WATCH = "room:watch",
}

export enum ServerEvent {
  ROOM_CREATED = "room:created",
  ROOM_JOINED = "room:joined",
  ROOM_STATE = "room:state",
  ROOM_ERROR = "room:error",
  PLAYER_JOINED = "player:joined",
  PLAYER_LEFT = "player:left",
  PLAYER_DISCONNECTED = "player:disconnected",
  PLAYER_RECONNECTED = "player:reconnected",
  TEAM_UPDATED = "team:updated",
  GAME_STARTED = "game:started",
  GAME_STATE = "game:state",
  GAME_ENDED = "game:ended",
  TURN_STARTED = "turn:started",
  TURN_CARD = "turn:card",
  TURN_TIMER = "turn:timer",
  TURN_TIMER_WARNING = "turn:timer:warning",
  TURN_SCORE = "turn:score",
  TURN_ENDED = "turn:ended",
  CARD_REVEALED = "card:revealed",
  FEEDBACK = "feedback",
}

export interface RoomCreatePayload {
  playerName: string;
}

export interface RoomJoinPayload {
  roomCode: RoomCode;
  playerName: string;
}

export interface RoomLeavePayload {
  roomCode: RoomCode;
}

export interface TeamAssignPayload {
  roomCode: RoomCode;
  playerId: PlayerId;
  teamId: TeamId;
}

export interface TeamShufflePayload {
  roomCode: RoomCode;
}

export interface GameStartPayload {
  roomCode: RoomCode;
  maxTurns?: number;
}

export interface GameEndPayload {
  roomCode: RoomCode;
}

export interface TurnStartPayload {
  roomCode: RoomCode;
}

export interface TurnActionPayload {
  roomCode: RoomCode;
}

export interface PlayerReconnectPayload {
  roomCode: RoomCode;
  playerId: PlayerId;
}

export interface RoomCreatedResponse {
  roomCode: RoomCode;
  playerId: PlayerId;
}

export interface RoomJoinedResponse {
  roomCode: RoomCode;
  playerId: PlayerId;
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

export interface RoomStateResponse {
  code: RoomCode;
  hostId: PlayerId;
  players: PlayerInfo[];
  teams: TeamInfo[];
  gameState: GameState;
}

export interface TurnInfo {
  teamId: TeamId;
  poetId: PlayerId;
  judgeId: PlayerId;
  easyWordGuessed: boolean;
  hardPhraseGuessed: boolean;
  pointsEarned: number;
}

export interface GameStateResponse {
  state: GameState;
  teams: TeamInfo[];
  players: PlayerInfo[];
  currentTurn: TurnInfo | null;
  turnNumber: number;
  timerRemaining: number | null;
}

export interface TurnStartedResponse {
  turn: TurnInfo;
  timerDuration: number;
}

export interface TurnCardResponse {
  card: Card;
}

export interface TurnTimerResponse {
  remaining: number;
}

export interface TurnScoreResponse {
  points: number;
  totalScore: number;
  type: "easy" | "hard" | "penalty" | "skip";
}

export interface TurnEndedResponse {
  reason: TurnEndReason;
  pointsEarned: number;
  teamScore: number;
  card: Card;
}

export interface GameEndedResponse {
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

export interface CardRevealedResponse {
  card: Card;
  reason: "easy" | "hard" | "skip" | "no";
  pointsEarned: number;
}

export interface FeedbackResponse {
  type: "correct" | "no" | "skip" | "time_up";
  message: string;
  teamId?: TeamId;
}

export interface ErrorResponse {
  message: string;
  code?: string;
}
