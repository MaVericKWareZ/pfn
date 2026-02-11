import { GameEngine } from "../game-engine";
import { DeckManager } from "../deck-manager";
import {
  GameState,
  TurnEndReason,
  Team,
  Player,
  Card,
  PlayerRole,
} from "../types";

describe("GameEngine - End Game Functionality", () => {
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

  describe("canEndGameManually", () => {
    it("should return false when no turns have been played", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(engine.canEndGameManually()).toBe(false);
    });

    it("should return false when teams have unequal turn counts", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      expect(engine.canEndGameManually()).toBe(false);
    });

    it("should return true when both teams have equal turn counts", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      // Team 1 turn
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      // Team 2 turn
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      expect(engine.canEndGameManually()).toBe(true);
    });

    it("should return true after multiple equal rounds", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      // 3 rounds for each team
      for (let i = 0; i < 6; i++) {
        engine.startTurn();
        engine.endTurn(TurnEndReason.TIME_UP);
      }

      expect(engine.canEndGameManually()).toBe(true);
    });
  });

  describe("endGameManually", () => {
    it("should throw error when teams have unequal turns", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();
      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      expect(() => engine.endGameManually()).toThrow(
        "Cannot end game manually: teams must have equal number of turns",
      );
    });

    it("should throw error when no turns have been played", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(() => engine.endGameManually()).toThrow(
        "Cannot end game manually: teams must have equal number of turns",
      );
    });

    it("should throw error when game is not in PLAYING or TURN_ENDED state", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      // In LOBBY state with no turns, it throws the equal turns error first
      expect(() => engine.endGameManually()).toThrow(
        "Cannot end game manually: teams must have equal number of turns",
      );
    });

    it("should successfully end game when conditions are met", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      // Team 1 turn
      engine.startTurn();
      engine.markHardPhraseGuessed();
      engine.endTurn(TurnEndReason.TIME_UP);

      // Team 2 turn
      engine.startTurn();
      engine.markEasyWordGuessed();
      engine.endTurn(TurnEndReason.TIME_UP);

      expect(engine.canEndGameManually()).toBe(true);

      engine.endGameManually();

      expect(engine.getState().state).toBe(GameState.GAME_OVER);
    });

    it("should allow ending game from TURN_ENDED state", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      expect(engine.getState().state).toBe(GameState.TURN_ENDED);

      engine.endGameManually();

      expect(engine.getState().state).toBe(GameState.GAME_OVER);
    });
  });

  describe("getGameSummary", () => {
    it("should throw error when game is not over", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      expect(() => engine.getGameSummary()).toThrow("Game is not over yet");
    });

    it("should return comprehensive game summary", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 60, roundsPerTeam: 2 };
      const engine = new GameEngine(teams, players, deckManager, config);

      engine.startGame();

      // Round 1 - Team 1
      engine.startTurn();
      engine.markHardPhraseGuessed(); // 3 points
      engine.endTurn(TurnEndReason.TIME_UP);

      // Round 1 - Team 2
      engine.startTurn();
      engine.markEasyWordGuessed(); // 1 point
      engine.endTurn(TurnEndReason.TIME_UP);

      // Round 2 - Team 1
      engine.startTurn();
      engine.skipCard(); // -1 point
      engine.endTurn(TurnEndReason.TIME_UP);

      // Round 2 - Team 2
      engine.startTurn();
      engine.markHardPhraseGuessed(); // 3 points
      engine.endTurn(TurnEndReason.TIME_UP);

      const summary = engine.getGameSummary();

      expect(summary.winningTeamId).toBe("team-2");
      expect(summary.winningTeamName).toBe("Team Beta");
      expect(summary.teams).toHaveLength(2);
      expect(summary.teams[0].score).toBe(2); // Team Alpha: 3 - 1
      expect(summary.teams[1].score).toBe(4); // Team Beta: 1 + 3
      expect(summary.roundStats).toHaveLength(4);
      expect(summary.totalRounds).toBe(4);
      expect(summary.gameDuration).toBeGreaterThanOrEqual(0);
    });

    it("should track round statistics correctly", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 60, roundsPerTeam: 1 };
      const engine = new GameEngine(teams, players, deckManager, config);

      engine.startGame();

      engine.startTurn();
      engine.markEasyWordGuessed(); // Completes card 1, draws card 2
      engine.markHardPhraseGuessed(); // Completes card 2, draws card 3
      engine.skipCard(); // Skips card 3, draws card 4
      engine.endTurn(TurnEndReason.TIME_UP);

      engine.startTurn();
      engine.endTurn(TurnEndReason.TIME_UP);

      const summary = engine.getGameSummary();
      const round1 = summary.roundStats[0];

      expect(round1.roundNumber).toBe(1);
      expect(round1.teamId).toBe("team-1");
      expect(round1.teamName).toBe("Team Alpha");
      expect(round1.cardsAttempted).toBe(3); // 2 completed + 1 skipped
      expect(round1.cardsCompleted).toBe(2);
      expect(round1.cardsSkipped).toBe(1);
      expect(round1.pointsEarned).toBe(3); // 1 (easy) + 3 (hard) - 1 (skip) = 3
      expect(round1.duration).toBeGreaterThanOrEqual(0);
    });

    it("should calculate team summaries correctly", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 60, roundsPerTeam: 2 };
      const engine = new GameEngine(teams, players, deckManager, config);

      engine.startGame();

      // Team 1 - Round 1
      engine.startTurn();
      engine.markHardPhraseGuessed(); // Completes card 1 (auto-marks easy too), draws card 2
      engine.endTurn(TurnEndReason.TIME_UP);

      // Team 2 - Round 1
      engine.startTurn();
      engine.skipCard(); // Skips card, draws next
      engine.endTurn(TurnEndReason.TIME_UP);

      // Team 1 - Round 2
      engine.startTurn();
      engine.markEasyWordGuessed(); // Completes card, draws next
      engine.endTurn(TurnEndReason.TIME_UP);

      // Team 2 - Round 2
      engine.startTurn();
      engine.markHardPhraseGuessed(); // Completes card, draws next
      engine.endTurn(TurnEndReason.TIME_UP);

      const summary = engine.getGameSummary();
      const team1Summary = summary.teams.find((t) => t.id === "team-1");
      const team2Summary = summary.teams.find((t) => t.id === "team-2");

      expect(team1Summary?.totalCardsAttempted).toBe(2); // 2 completed cards
      expect(team1Summary?.totalCardsCompleted).toBe(2);
      expect(team1Summary?.totalCardsSkipped).toBe(0);

      expect(team2Summary?.totalCardsAttempted).toBe(2); // 1 skipped + 1 completed
      expect(team2Summary?.totalCardsCompleted).toBe(1);
      expect(team2Summary?.totalCardsSkipped).toBe(1);
    });

    it("should handle tie games correctly", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const config = { turnDurationSeconds: 60, roundsPerTeam: 1 };
      const engine = new GameEngine(teams, players, deckManager, config);

      engine.startGame();

      engine.startTurn();
      engine.markHardPhraseGuessed();
      engine.endTurn(TurnEndReason.TIME_UP);

      engine.startTurn();
      engine.markHardPhraseGuessed();
      engine.endTurn(TurnEndReason.TIME_UP);

      const summary = engine.getGameSummary();

      // Both teams have 3 points, winner is determined by first team with max score
      expect(summary.teams[0].score).toBe(3);
      expect(summary.teams[1].score).toBe(3);
      expect(summary.winningTeamId).toBeTruthy();
    });
  });

  describe("integration with manual end game", () => {
    it("should generate summary after manual game end", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      engine.startTurn();
      engine.markHardPhraseGuessed();
      engine.endTurn(TurnEndReason.TIME_UP);

      engine.startTurn();
      engine.markEasyWordGuessed();
      engine.endTurn(TurnEndReason.TIME_UP);

      engine.endGameManually();

      const summary = engine.getGameSummary();

      expect(summary.totalRounds).toBe(2);
      expect(summary.roundStats).toHaveLength(2);
      expect(summary.winningTeamId).toBe("team-1");
      expect(summary.teams[0].score).toBe(3);
      expect(summary.teams[1].score).toBe(1);
    });

    it("should track completed turns correctly", () => {
      const teams = createMockTeams();
      const players = createMockPlayers();
      const deckManager = new DeckManager(createMockCards(20));
      const engine = new GameEngine(teams, players, deckManager);

      engine.startGame();

      for (let i = 0; i < 4; i++) {
        engine.startTurn();
        engine.endTurn(TurnEndReason.TIME_UP);
      }

      const state = engine.getState();
      expect(state.completedTurns).toHaveLength(4);
      expect(state.gameStartTime).toBeGreaterThan(0);
    });
  });
});
