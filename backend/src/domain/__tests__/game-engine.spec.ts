import { GameEngine } from "../game-engine";
import { DeckManager } from "../deck-manager";
import { ScoringEngine } from "../scoring-engine";
import {
  GameState,
  PlayerRole,
  TurnEndReason,
  Team,
  Player,
  Card,
  DEFAULT_GAME_CONFIG,
} from "../types";

describe("GameEngine", () => {
  const createMockCards = (count: number): Card[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `card-${i}`,
      easyWord: `word${i}`,
      hardPhrase: `phrase ${i}`,
    }));
  };

  const createMockTeams = (): Team[] => [
    { id: "team-1", name: "Team Alpha", playerIds: ["p1", "p2"], score: 0 },
    { id: "team-2", name: "Team Beta", playerIds: ["p3", "p4"], score: 0 },
  ];

  const createMockPlayers = (): Map<string, Player> => {
    const players = new Map();
    players.set("p1", {
      id: "p1",
      name: "Player 1",
      teamId: "team-1",
      role: PlayerRole.SPECTATOR,
      isConnected: true,
      isHost: true,
    });
    players.set("p2", {
      id: "p2",
      name: "Player 2",
      teamId: "team-1",
      role: PlayerRole.SPECTATOR,
      isConnected: true,
      isHost: false,
    });
    players.set("p3", {
      id: "p3",
      name: "Player 3",
      teamId: "team-2",
      role: PlayerRole.SPECTATOR,
      isConnected: true,
      isHost: false,
    });
    players.set("p4", {
      id: "p4",
      name: "Player 4",
      teamId: "team-2",
      role: PlayerRole.SPECTATOR,
      isConnected: true,
      isHost: false,
    });
    return players;
  };

  describe("constructor", () => {
    it("should initialize in LOBBY state", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      const state = engine.getState();
      expect(state.state).toBe(GameState.LOBBY);
      expect(state.turnNumber).toBe(0);
      expect(state.currentTurn).toBeNull();
    });

    it("should initialize with provided teams and players", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      const state = engine.getState();
      expect(state.teams).toEqual(teams);
      expect(state.players).toEqual(players);
    });

    it("should use default config if not provided", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      const state = engine.getState();
      expect(state.config).toEqual(DEFAULT_GAME_CONFIG);
    });

    it("should use custom config if provided", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const customConfig = { turnDurationSeconds: 60, roundsPerTeam: 5 };
      const engine = new GameEngine(teams, players, deckManager, customConfig);

      const state = engine.getState();
      expect(state.config).toEqual(customConfig);
    });
  });

  describe("startGame", () => {
    it("should transition from LOBBY to PLAYING", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      const state = engine.getState();
      expect(state.state).toBe(GameState.PLAYING);
    });

    it("should throw error if not in LOBBY state", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(() => engine.startGame()).toThrow(
        "Game can only be started from LOBBY state",
      );
    });

    it("should throw error if less than 2 teams", () => {
      const teams = [
        { id: "team-1", name: "Solo Team", playerIds: ["p1"], score: 0 },
      ];
      const players = new Map();
      players.set("p1", {
        id: "p1",
        name: "Player 1",
        teamId: "team-1",
        role: PlayerRole.SPECTATOR,
        isConnected: true,
        isHost: true,
      });
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      expect(() => engine.startGame()).toThrow(
        "At least 2 teams are required to start",
      );
    });

    it("should throw error if team has no players", () => {
      const teams = [
        { id: "team-1", name: "Team Alpha", playerIds: ["p1"], score: 0 },
        { id: "team-2", name: "Team Beta", playerIds: [], score: 0 },
      ];
      const players = new Map();
      players.set("p1", {
        id: "p1",
        name: "Player 1",
        teamId: "team-1",
        role: PlayerRole.SPECTATOR,
        isConnected: true,
        isHost: true,
      });
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      expect(() => engine.startGame()).toThrow("Team Team Beta has no players");
    });

    it("should shuffle deck on game start", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const cards = createMockCards(10);
      const deckManager = new DeckManager(cards);
      const shuffleSpy = jest.spyOn(deckManager, "shuffle");
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(shuffleSpy).toHaveBeenCalled();
    });
  });

  describe("startTurn", () => {
    it("should create a new turn with correct structure", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      const turn = engine.startTurn();

      expect(turn).toMatchObject({
        teamId: expect.any(String),
        poetId: expect.any(String),
        judgeId: expect.any(String),
        currentCard: expect.objectContaining({
          id: expect.any(String),
          easyWord: expect.any(String),
          hardPhrase: expect.any(String),
        }),
        cardsAttempted: [],
        currentCardEasyGuessed: false,
        currentCardHardGuessed: false,
        startTime: expect.any(Number),
        endTime: null,
        endReason: null,
        pointsEarned: 0,
      });
    });

    it("should transition to TURN_ACTIVE state", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();

      const state = engine.getState();
      expect(state.state).toBe(GameState.TURN_ACTIVE);
    });

    it("should assign poet from active team", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      const turn = engine.startTurn();

      expect(teams[0].playerIds).toContain(turn.poetId);
    });

    it("should assign judge from opposing team", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      const turn = engine.startTurn();

      expect(teams[1].playerIds).toContain(turn.judgeId);
    });

    it("should assign roles to players correctly", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      const turn = engine.startTurn();

      const state = engine.getState();
      const poet = state.players.get(turn.poetId);
      const judge = state.players.get(turn.judgeId);

      expect(poet?.role).toBe(PlayerRole.POET);
      expect(judge?.role).toBe(PlayerRole.JUDGE);
    });

    it("should increment turn number", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      expect(engine.getState().turnNumber).toBe(0);

      engine.startTurn();
      expect(engine.getState().turnNumber).toBe(1);
    });

    it("should throw error if not in valid state", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      expect(() => engine.startTurn()).toThrow(
        "Cannot start turn in current state",
      );
    });

    it("should rotate poet within team across turns", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      const turn1 = engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      const turn3 = engine.startTurn();

      expect(turn3.poetId).not.toBe(turn1.poetId);
    });
  });

  describe("markEasyWordGuessed", () => {
    it("should award 1 point for easy word", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      const points = engine.markEasyWordGuessed();

      expect(points).toBe(1);
    });

    it("should update turn state and draw new card", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.markEasyWordGuessed();

      const state = engine.getState();
      // After easy word guessed, new card is drawn so current card flags reset
      expect(state.currentTurn?.currentCardEasyGuessed).toBe(false);
      expect(state.currentTurn?.currentCardHardGuessed).toBe(false);
      // But the completed card should be in cardsAttempted
      expect(state.currentTurn?.cardsAttempted).toHaveLength(1);
      expect(state.currentTurn?.cardsAttempted[0].easyWordGuessed).toBe(true);
      expect(state.currentTurn?.pointsEarned).toBe(1);
    });

    it("should award points on new card after auto-draw", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.markEasyWordGuessed(); // Card 1 completed, card 2 drawn
      const secondPoints = engine.markEasyWordGuessed(); // Card 2 easy word

      // Second call should award points for the new card
      expect(secondPoints).toBe(1);
      const state = engine.getState();
      expect(state.currentTurn?.cardsAttempted).toHaveLength(2);
      expect(state.currentTurn?.pointsEarned).toBe(2);
    });

    it("should throw error if no active turn", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(() => engine.markEasyWordGuessed()).toThrow("No active turn");
    });
  });

  describe("markHardPhraseGuessed", () => {
    it("should award 3 points for hard phrase", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      const points = engine.markHardPhraseGuessed();

      expect(points).toBe(3);
    });

    it("should mark hard phrase and draw new card", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.markHardPhraseGuessed();

      const state = engine.getState();
      // After hard phrase guessed, new card is drawn so current card flags reset
      expect(state.currentTurn?.currentCardEasyGuessed).toBe(false);
      expect(state.currentTurn?.currentCardHardGuessed).toBe(false);
      // But the completed card should be in cardsAttempted
      expect(state.currentTurn?.cardsAttempted).toHaveLength(1);
      expect(state.currentTurn?.cardsAttempted[0].easyWordGuessed).toBe(false);
      expect(state.currentTurn?.cardsAttempted[0].hardPhraseGuessed).toBe(true);
      expect(state.currentTurn?.pointsEarned).toBe(3); // hard phrase only = 3
    });

    it("should not double-count easy word if already guessed", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      // Mark easy first - completes card 1, draws card 2
      engine.markEasyWordGuessed();
      // Then mark hard on card 2
      engine.markHardPhraseGuessed();

      const state = engine.getState();
      expect(state.currentTurn?.pointsEarned).toBe(4); // 1 (easy on card 1) + 3 (hard on card 2)
    });

    it("should handle multiple cards with different scoring", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      // Mark easy - this draws new card (card 1 complete)
      engine.markEasyWordGuessed();

      const state = engine.getState();
      // First card completed with easy word only
      expect(state.currentTurn?.cardsAttempted).toHaveLength(1);
      expect(state.currentTurn?.cardsAttempted[0].easyWordGuessed).toBe(true);
      expect(state.currentTurn?.cardsAttempted[0].hardPhraseGuessed).toBe(
        false,
      );
      expect(state.currentTurn?.pointsEarned).toBe(1);

      // Now mark hard on the NEW card that was auto-drawn (card 2)
      const secondPoints = engine.markHardPhraseGuessed();
      // This should give 3 points for the new card
      expect(secondPoints).toBe(3);
      expect(state.currentTurn?.cardsAttempted).toHaveLength(2);
      expect(state.currentTurn?.pointsEarned).toBe(4); // 1 (easy on card 1) + 3 (hard on card 2)
    });
  });

  describe("skipCard", () => {
    it("should deduct 1 point for skip", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      const result = engine.skipCard();

      expect(result.points).toBe(-1);
    });

    it("should update turn points after skip", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.markEasyWordGuessed();
      engine.skipCard();

      const state = engine.getState();
      expect(state.currentTurn?.pointsEarned).toBe(0);
    });

    it("should allow negative total points from multiple skips", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.skipCard();
      engine.skipCard();

      const state = engine.getState();
      expect(state.currentTurn?.pointsEarned).toBe(-2);
    });
  });

  describe("skipCard (continued)", () => {
    it("should provide new card after skip", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      const turn = engine.startTurn();
      const originalCard = turn.currentCard;
      const result = engine.skipCard();

      expect(result.newCard).toBeTruthy();
      expect(result.newCard?.id).not.toBe(originalCard.id);
    });

    it("should reset guessed flags on new card", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.markEasyWordGuessed();
      engine.skipCard();

      const state = engine.getState();
      expect(state.currentTurn?.currentCardEasyGuessed).toBe(false);
      expect(state.currentTurn?.currentCardHardGuessed).toBe(false);
    });

    it("should track skipped card in cardsAttempted", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.skipCard();

      const state = engine.getState();
      expect(state.currentTurn?.cardsAttempted).toHaveLength(1);
      expect(state.currentTurn?.cardsAttempted[0].skipped).toBe(true);
    });
  });

  describe("endTurn", () => {
    it("should transition to TURN_ENDED state", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      const state = engine.getState();
      expect(state.state).toBe(GameState.TURN_ENDED);
    });

    it("should set end time and reason", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      const turn = engine.endTurn(TurnEndReason.TIME_UP);

      expect(turn.endTime).toBeTruthy();
      expect(turn.endReason).toBe(TurnEndReason.TIME_UP);
    });

    it("should add points to team score", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.markEasyWordGuessed(); // +1, draws new card
      engine.markHardPhraseGuessed(); // +3
      engine.endTurn(TurnEndReason.TIME_UP);

      const state = engine.getState();
      const team = state.teams.find((t) => t.id === "team-1");
      expect(team?.score).toBe(4); // 1 + 3 = 4
    });

    it("should reset player roles", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      const state = engine.getState();
      for (const player of state.players.values()) {
        expect(player.role).toBe(PlayerRole.SPECTATOR);
      }
    });

    it("should rotate to next team", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      const turn1 = engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      const turn2 = engine.startTurn();
      expect(turn2.teamId).not.toBe(turn1.teamId);
    });

    it("should throw error if no active turn", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(() => engine.endTurn(TurnEndReason.TIME_UP)).toThrow(
        "No active turn to end",
      );
    });
  });

  describe("isGameOver", () => {
    it("should return false at game start", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(engine.isGameOver()).toBe(false);
    });

    it("should return true when all teams complete required rounds", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 90, roundsPerTeam: 2 };
      const engine = new GameEngine(teams, players, deckManager, config);

      engine.startGame();

      for (let i = 0; i < 4; i++) {
        engine.startTurn();
        engine.endTurn(TurnEndReason.TIME_UP);
      }

      expect(engine.isGameOver()).toBe(true);
    });

    it("should transition to GAME_OVER state when game ends", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 90, roundsPerTeam: 1 };
      const engine = new GameEngine(teams, players, deckManager, config);

      engine.startGame();
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      const state = engine.getState();
      expect(state.state).toBe(GameState.GAME_OVER);
    });
  });

  describe("getWinningTeam", () => {
    it("should return null if game not over", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(10));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(engine.getWinningTeam()).toBeNull();
    });

    it("should return team with highest score", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 90, roundsPerTeam: 1 };
      const engine = new GameEngine(teams, players, deckManager, config);

      engine.startGame();
      engine.startTurn();
      engine.markHardPhraseGuessed();
      engine.endTurn(TurnEndReason.TIME_UP);

      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      const winner = engine.getWinningTeam();
      expect(winner?.id).toBe("team-1");
      expect(winner?.score).toBe(3);
    });
  });

  describe("full game flow", () => {
    it("should complete a full game successfully", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 90, roundsPerTeam: 2 };
      const engine = new GameEngine(teams, players, deckManager, config);

      expect(engine.getState().state).toBe(GameState.LOBBY);

      engine.startGame();
      expect(engine.getState().state).toBe(GameState.PLAYING);

      for (let round = 0; round < 4; round++) {
        engine.startTurn();
        expect(engine.getState().state).toBe(GameState.TURN_ACTIVE);

        if (round % 2 === 0) {
          engine.markEasyWordGuessed();
        }

        engine.endTurn(TurnEndReason.TIME_UP);
      }

      expect(engine.getState().state).toBe(GameState.GAME_OVER);
      expect(engine.isGameOver()).toBe(true);
      expect(engine.getWinningTeam()).toBeTruthy();
    });
  });
});
