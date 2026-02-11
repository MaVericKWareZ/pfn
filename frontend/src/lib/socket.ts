import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

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
  TURN_SCORE = "turn:score",
  TURN_ENDED = "turn:ended",
  CARD_REVEALED = "card:revealed",
  FEEDBACK = "feedback",
}
