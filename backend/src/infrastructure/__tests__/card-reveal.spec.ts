import { GameEngine } from "../../domain/game-engine";
import { DeckManager } from "../../domain/deck-manager";
import { Card, Player, Team, PlayerRole } from "../../domain/types";

describe("Card Reveal Functionality", () => {
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

  it("should track the current card before marking easy word guessed", () => {
    const teams = createMockTeams();
    const players = createMockPlayers();
    const deckManager = new DeckManager(createMockCards(10));
    const engine = new GameEngine(teams, players, deckManager);

    engine.startGame();
    engine.startTurn();

    const state = engine.getState();
    const cardBeforeGuess = state.currentTurn?.currentCard;

    expect(cardBeforeGuess).toBeDefined();
    expect(cardBeforeGuess?.easyWord).toBeDefined();

    engine.markEasyWordGuessed();

    const stateAfter = engine.getState();
    const cardAfterGuess = stateAfter.currentTurn?.currentCard;

    // Card should change after guess
    expect(cardAfterGuess?.id).not.toBe(cardBeforeGuess?.id);
    expect(cardAfterGuess?.easyWord).toBeDefined();
  });

  it("should track the current card before marking hard phrase guessed", () => {
    const teams = createMockTeams();
    const players = createMockPlayers();
    const deckManager = new DeckManager(createMockCards(10));
    const engine = new GameEngine(teams, players, deckManager);

    engine.startGame();
    engine.startTurn();

    const state = engine.getState();
    const cardBeforeGuess = state.currentTurn?.currentCard;

    expect(cardBeforeGuess).toBeDefined();
    expect(cardBeforeGuess?.hardPhrase).toBeDefined();

    engine.markHardPhraseGuessed();

    const stateAfter = engine.getState();
    const cardAfterGuess = stateAfter.currentTurn?.currentCard;

    // Card should change after guess
    expect(cardAfterGuess?.id).not.toBe(cardBeforeGuess?.id);
    expect(cardAfterGuess?.hardPhrase).toBeDefined();
  });

  it("should track the current card before skipping", () => {
    const teams = createMockTeams();
    const players = createMockPlayers();
    const deckManager = new DeckManager(createMockCards(10));
    const engine = new GameEngine(teams, players, deckManager);

    engine.startGame();
    engine.startTurn();

    const state = engine.getState();
    const cardBeforeSkip = state.currentTurn?.currentCard;

    expect(cardBeforeSkip).toBeDefined();
    expect(cardBeforeSkip?.easyWord).toBeDefined();

    const result = engine.skipCard();

    expect(result.newCard).toBeDefined();
    expect(result.newCard?.id).not.toBe(cardBeforeSkip?.id);
    expect(result.newCard?.easyWord).toBeDefined();
  });

  it("should save completed cards in cardsAttempted array", () => {
    const teams = createMockTeams();
    const players = createMockPlayers();
    const deckManager = new DeckManager(createMockCards(10));
    const engine = new GameEngine(teams, players, deckManager);

    engine.startGame();
    engine.startTurn();

    const firstCard = engine.getState().currentTurn?.currentCard;
    engine.markEasyWordGuessed();

    const secondCard = engine.getState().currentTurn?.currentCard;
    engine.markHardPhraseGuessed();

    engine.skipCard();

    const state = engine.getState();
    const cardsAttempted = state.currentTurn?.cardsAttempted;

    expect(cardsAttempted).toHaveLength(3);
    expect(cardsAttempted?.[0].card.id).toBe(firstCard?.id);
    expect(cardsAttempted?.[0].easyWordGuessed).toBe(true);
    expect(cardsAttempted?.[0].skipped).toBe(false);

    expect(cardsAttempted?.[1].card.id).toBe(secondCard?.id);
    expect(cardsAttempted?.[1].hardPhraseGuessed).toBe(true);
    expect(cardsAttempted?.[1].skipped).toBe(false);

    expect(cardsAttempted?.[2].skipped).toBe(true);
  });

  it("should handle multiple card transitions in a single turn", () => {
    const teams = createMockTeams();
    const players = createMockPlayers();
    const deckManager = new DeckManager(createMockCards(10));
    const engine = new GameEngine(teams, players, deckManager);

    engine.startGame();
    engine.startTurn();

    const cards: string[] = [];

    // Track first card
    cards.push(engine.getState().currentTurn?.currentCard?.id || "");
    engine.markEasyWordGuessed();

    // Track second card
    cards.push(engine.getState().currentTurn?.currentCard?.id || "");
    engine.markHardPhraseGuessed();

    // Track third card
    cards.push(engine.getState().currentTurn?.currentCard?.id || "");
    engine.skipCard();

    // Track fourth card
    cards.push(engine.getState().currentTurn?.currentCard?.id || "");

    // All cards should be different
    const uniqueCards = new Set(cards);
    expect(uniqueCards.size).toBe(4);
  });
});
