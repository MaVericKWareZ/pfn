"use client";

import { useEffect, useCallback, useReducer, useRef } from "react";
import { Socket } from "socket.io-client";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  ClientEvent,
  ServerEvent,
} from "@/lib/socket";
import {
  RoomState,
  GameStateData,
  Card,
  FeedbackData,
  TurnEndedData,
  GameEndedData,
  CardRevealedData,
  PlayerId,
  RoomCode,
  TeamId,
  GameState,
} from "@/types";

interface GameSocketState {
  isConnected: boolean;
  playerId: PlayerId | null;
  roomCode: RoomCode | null;
  roomState: RoomState | null;
  gameState: GameStateData | null;
  currentCard: Card | null;
  timerRemaining: number | null;
  feedback: FeedbackData | null;
  lastTurnEnded: TurnEndedData | null;
  gameEnded: GameEndedData | null;
  cardRevealed: CardRevealedData | null;
  error: string | null;
}

type GameSocketAction =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "SET_PLAYER_ID"; playerId: PlayerId }
  | { type: "SET_ROOM_CODE"; roomCode: RoomCode }
  | { type: "SET_ROOM_STATE"; roomState: RoomState }
  | { type: "SET_GAME_STATE"; gameState: GameStateData }
  | { type: "SET_CARD"; card: Card }
  | { type: "SET_TIMER"; remaining: number }
  | { type: "SET_FEEDBACK"; feedback: FeedbackData }
  | { type: "CLEAR_FEEDBACK" }
  | { type: "SET_TURN_ENDED"; data: TurnEndedData }
  | { type: "SET_GAME_ENDED"; data: GameEndedData }
  | { type: "SET_CARD_REVEALED"; data: CardRevealedData }
  | { type: "CLEAR_CARD_REVEALED" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" };

const initialState: GameSocketState = {
  isConnected: false,
  playerId: null,
  roomCode: null,
  roomState: null,
  gameState: null,
  currentCard: null,
  timerRemaining: null,
  feedback: null,
  lastTurnEnded: null,
  gameEnded: null,
  cardRevealed: null,
  error: null,
};

function reducer(
  state: GameSocketState,
  action: GameSocketAction,
): GameSocketState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, isConnected: true };
    case "DISCONNECTED":
      return { ...state, isConnected: false };
    case "SET_PLAYER_ID":
      return { ...state, playerId: action.playerId };
    case "SET_ROOM_CODE":
      return { ...state, roomCode: action.roomCode };
    case "SET_ROOM_STATE":
      return { ...state, roomState: action.roomState };
    case "SET_GAME_STATE":
      return {
        ...state,
        gameState: action.gameState,
        timerRemaining: action.gameState.timerRemaining,
      };
    case "SET_CARD":
      return { ...state, currentCard: action.card };
    case "SET_TIMER":
      return { ...state, timerRemaining: action.remaining };
    case "SET_FEEDBACK":
      return { ...state, feedback: action.feedback };
    case "CLEAR_FEEDBACK":
      return { ...state, feedback: null };
    case "SET_TURN_ENDED":
      return { ...state, lastTurnEnded: action.data, currentCard: null };
    case "SET_GAME_ENDED":
      return { ...state, gameEnded: action.data };
    case "SET_CARD_REVEALED":
      return { ...state, cardRevealed: action.data };
    case "CLEAR_CARD_REVEALED":
      return { ...state, cardRevealed: null };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useGameSocket() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      dispatch({ type: "CONNECTED" });
    });

    socket.on("disconnect", () => {
      dispatch({ type: "DISCONNECTED" });
    });

    socket.on(
      ServerEvent.ROOM_CREATED,
      (data: { roomCode: RoomCode; playerId: PlayerId }) => {
        console.log("[ROOM_CREATED] Received:", data);
        dispatch({ type: "SET_ROOM_CODE", roomCode: data.roomCode });
        dispatch({ type: "SET_PLAYER_ID", playerId: data.playerId });
        localStorage.setItem("pfn_playerId", data.playerId);
        localStorage.setItem("pfn_roomCode", data.roomCode);
      },
    );

    socket.on(
      ServerEvent.ROOM_JOINED,
      (data: { roomCode: RoomCode; playerId: PlayerId }) => {
        console.log("[ROOM_JOINED] Received:", data);
        dispatch({ type: "SET_ROOM_CODE", roomCode: data.roomCode });
        dispatch({ type: "SET_PLAYER_ID", playerId: data.playerId });
        localStorage.setItem("pfn_playerId", data.playerId);
        localStorage.setItem("pfn_roomCode", data.roomCode);
      },
    );

    socket.on(ServerEvent.ROOM_STATE, (data: RoomState) => {
      console.log("[ROOM_STATE] Received:", data);
      dispatch({ type: "SET_ROOM_STATE", roomState: data });

      // Also restore playerId from localStorage if we don't have it
      const savedPlayerId = localStorage.getItem("pfn_playerId");
      const savedRoomCode = localStorage.getItem("pfn_roomCode");
      if (savedPlayerId && savedRoomCode === data.code) {
        console.log(
          "[ROOM_STATE] Restoring playerId from localStorage:",
          savedPlayerId,
        );
        dispatch({ type: "SET_PLAYER_ID", playerId: savedPlayerId });
        dispatch({ type: "SET_ROOM_CODE", roomCode: savedRoomCode });
      }
    });

    socket.on(ServerEvent.GAME_STATE, (data: GameStateData) => {
      console.log("[GAME_STATE] Received:", data);
      dispatch({ type: "SET_GAME_STATE", gameState: data });
    });

    socket.on(ServerEvent.TURN_CARD, (data: { card: Card }) => {
      dispatch({ type: "SET_CARD", card: data.card });
    });

    socket.on(ServerEvent.TURN_TIMER, (data: { remaining: number }) => {
      dispatch({ type: "SET_TIMER", remaining: data.remaining });
    });

    socket.on(ServerEvent.FEEDBACK, (data: FeedbackData) => {
      dispatch({ type: "SET_FEEDBACK", feedback: data });
      setTimeout(() => dispatch({ type: "CLEAR_FEEDBACK" }), 800);
    });

    socket.on(ServerEvent.TURN_ENDED, (data: TurnEndedData) => {
      dispatch({ type: "SET_TURN_ENDED", data });
    });

    socket.on(ServerEvent.GAME_ENDED, (data: GameEndedData) => {
      dispatch({ type: "SET_GAME_ENDED", data });
    });

    socket.on(ServerEvent.CARD_REVEALED, (data: CardRevealedData) => {
      dispatch({ type: "SET_CARD_REVEALED", data });
      // Auto-clear after 3 seconds
      setTimeout(() => {
        dispatch({ type: "CLEAR_CARD_REVEALED" });
      }, 3000);
    });

    socket.on(ServerEvent.ROOM_ERROR, (data: { message: string }) => {
      dispatch({ type: "SET_ERROR", error: data.message });
      setTimeout(() => dispatch({ type: "CLEAR_ERROR" }), 3000);
    });

    return () => {
      // Don't remove event listeners on cleanup to prevent losing events during navigation
      // Listeners will persist with the singleton socket instance
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    console.log(
      "[CREATE_ROOM] Emitting ROOM_CREATE with playerName:",
      playerName,
      "Socket connected:",
      socketRef.current?.connected,
    );
    // Clear old room data before creating new room
    localStorage.removeItem("pfn_playerId");
    localStorage.removeItem("pfn_roomCode");
    dispatch({ type: "RESET" });

    if (socketRef.current?.connected) {
      socketRef.current.emit(ClientEvent.ROOM_CREATE, { playerName });
    } else {
      console.error("[CREATE_ROOM] Socket not connected!");
    }
  }, []);

  const joinRoom = useCallback((roomCode: RoomCode, playerName: string) => {
    socketRef.current?.emit(ClientEvent.ROOM_JOIN, { roomCode, playerName });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit(ClientEvent.ROOM_LEAVE, {});
    localStorage.removeItem("pfn_playerId");
    dispatch({ type: "RESET" });
  }, []);

  const assignTeam = useCallback(
    (playerId: PlayerId, teamId: TeamId) => {
      if (state.roomCode) {
        socketRef.current?.emit(ClientEvent.TEAM_ASSIGN, {
          roomCode: state.roomCode,
          playerId,
          teamId,
        });
      }
    },
    [state.roomCode],
  );

  const shuffleTeams = useCallback(() => {
    if (state.roomCode) {
      socketRef.current?.emit(ClientEvent.TEAM_SHUFFLE, {
        roomCode: state.roomCode,
      });
    }
  }, [state.roomCode]);

  const startGame = useCallback(
    (maxTurns?: number) => {
      if (state.roomCode) {
        socketRef.current?.emit(ClientEvent.GAME_START, {
          roomCode: state.roomCode,
          maxTurns,
        });
      }
    },
    [state.roomCode],
  );

  const startTurn = useCallback(() => {
    if (state.roomCode) {
      socketRef.current?.emit(ClientEvent.TURN_START, {
        roomCode: state.roomCode,
      });
    }
  }, [state.roomCode]);

  const markEasyCorrect = useCallback(() => {
    if (state.roomCode) {
      socketRef.current?.emit(ClientEvent.TURN_CORRECT_EASY, {
        roomCode: state.roomCode,
      });
    }
  }, [state.roomCode]);

  const markHardCorrect = useCallback(() => {
    if (state.roomCode) {
      socketRef.current?.emit(ClientEvent.TURN_CORRECT_HARD, {
        roomCode: state.roomCode,
      });
    }
  }, [state.roomCode]);

  const skipCard = useCallback(() => {
    if (state.roomCode) {
      socketRef.current?.emit(ClientEvent.TURN_SKIP, {
        roomCode: state.roomCode,
      });
    }
  }, [state.roomCode]);

  const pressNo = useCallback(() => {
    if (state.roomCode) {
      socketRef.current?.emit(ClientEvent.TURN_NO, {
        roomCode: state.roomCode,
      });
    }
  }, [state.roomCode]);

  const reconnect = useCallback((roomCode: RoomCode, playerId: PlayerId) => {
    socketRef.current?.emit(ClientEvent.PLAYER_RECONNECT, {
      roomCode,
      playerId,
    });
  }, []);

  const watchRoom = useCallback((roomCode: RoomCode) => {
    socketRef.current?.emit(ClientEvent.ROOM_WATCH, { roomCode });
  }, []);

  const endGame = useCallback(() => {
    if (state.roomCode) {
      socketRef.current?.emit(ClientEvent.GAME_END, {
        roomCode: state.roomCode,
      });
    }
  }, [state.roomCode]);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    assignTeam,
    shuffleTeams,
    startGame,
    endGame,
    startTurn,
    markEasyCorrect,
    markHardCorrect,
    skipCard,
    pressNo,
    reconnect,
    watchRoom,
  };
}
