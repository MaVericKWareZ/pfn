import { DeckManager } from "../deck-manager";
import { Card } from "../types";

describe("DeckManager", () => {
  const createMockCards = (count: number): Card[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `card-${i}`,
      easyWord: `word${i}`,
      hardPhrase: `phrase ${i}`,
    }));
  };

  describe("constructor", () => {
    it("should initialize with provided cards", () => {
      const cards = createMockCards(10);
      const deckManager = new DeckManager(cards);

      expect(deckManager.remaining()).toBe(10);
    });

    it("should handle empty deck", () => {
      const deckManager = new DeckManager([]);

      expect(deckManager.remaining()).toBe(0);
    });
  });

  describe("shuffle", () => {
    it("should shuffle cards randomly without seed", () => {
      const cards = createMockCards(10);
      const deckManager = new DeckManager(cards);

      deckManager.shuffle();

      expect(deckManager.remaining()).toBe(10);
    });

    it("should produce deterministic shuffle with same seed", () => {
      const cards = createMockCards(10);
      const deck1 = new DeckManager([...cards]);
      const deck2 = new DeckManager([...cards]);

      deck1.shuffle(12345);
      deck2.shuffle(12345);

      const cards1 = [];
      const cards2 = [];

      for (let i = 0; i < 10; i++) {
        cards1.push(deck1.draw());
        cards2.push(deck2.draw());
      }

      expect(cards1).toEqual(cards2);
    });

    it("should produce different shuffle with different seed", () => {
      const cards = createMockCards(10);
      const deck1 = new DeckManager([...cards]);
      const deck2 = new DeckManager([...cards]);

      deck1.shuffle(12345);
      deck2.shuffle(54321);

      const cards1 = [];
      const cards2 = [];

      for (let i = 0; i < 10; i++) {
        cards1.push(deck1.draw());
        cards2.push(deck2.draw());
      }

      expect(cards1).not.toEqual(cards2);
    });

    it("should reset current index on shuffle", () => {
      const cards = createMockCards(5);
      const deckManager = new DeckManager(cards);

      deckManager.draw();
      deckManager.draw();
      expect(deckManager.remaining()).toBe(3);

      deckManager.shuffle();
      expect(deckManager.remaining()).toBe(5);
    });
  });

  describe("draw", () => {
    it("should draw cards in sequence", () => {
      const cards = createMockCards(3);
      const deckManager = new DeckManager(cards);
      deckManager.shuffle(42);

      const card1 = deckManager.draw();
      const card2 = deckManager.draw();
      const card3 = deckManager.draw();

      expect(card1).toBeTruthy();
      expect(card2).toBeTruthy();
      expect(card3).toBeTruthy();
      expect(card1?.id).not.toBe(card2?.id);
      expect(card2?.id).not.toBe(card3?.id);
    });

    it("should return null when deck is exhausted", () => {
      const cards = createMockCards(2);
      const deckManager = new DeckManager(cards);

      deckManager.draw();
      deckManager.draw();
      const emptyDraw = deckManager.draw();

      expect(emptyDraw).toBeNull();
    });

    it("should decrement remaining count on each draw", () => {
      const cards = createMockCards(5);
      const deckManager = new DeckManager(cards);

      expect(deckManager.remaining()).toBe(5);
      deckManager.draw();
      expect(deckManager.remaining()).toBe(4);
      deckManager.draw();
      expect(deckManager.remaining()).toBe(3);
    });
  });

  describe("remaining", () => {
    it("should return correct count of remaining cards", () => {
      const cards = createMockCards(10);
      const deckManager = new DeckManager(cards);

      expect(deckManager.remaining()).toBe(10);

      for (let i = 0; i < 5; i++) {
        deckManager.draw();
      }

      expect(deckManager.remaining()).toBe(5);
    });

    it("should return 0 when deck is empty", () => {
      const cards = createMockCards(2);
      const deckManager = new DeckManager(cards);

      deckManager.draw();
      deckManager.draw();

      expect(deckManager.remaining()).toBe(0);
    });
  });

  describe("reset", () => {
    it("should restore original cards", () => {
      const cards = createMockCards(5);
      const deckManager = new DeckManager(cards);

      deckManager.draw();
      deckManager.draw();
      expect(deckManager.remaining()).toBe(3);

      deckManager.reset();
      expect(deckManager.remaining()).toBe(5);
    });

    it("should restore original order after shuffle", () => {
      const cards = createMockCards(3);
      const deckManager = new DeckManager(cards);

      const originalFirst = deckManager.draw();
      deckManager.reset();

      deckManager.shuffle(999);
      deckManager.reset();

      const restoredFirst = deckManager.draw();
      expect(restoredFirst).toEqual(originalFirst);
    });

    it("should allow drawing again after reset", () => {
      const cards = createMockCards(2);
      const deckManager = new DeckManager(cards);

      deckManager.draw();
      deckManager.draw();
      expect(deckManager.draw()).toBeNull();

      deckManager.reset();
      expect(deckManager.draw()).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle single card deck", () => {
      const cards = createMockCards(1);
      const deckManager = new DeckManager(cards);

      expect(deckManager.remaining()).toBe(1);
      const card = deckManager.draw();
      expect(card).toBeTruthy();
      expect(deckManager.remaining()).toBe(0);
      expect(deckManager.draw()).toBeNull();
    });

    it("should handle large deck", () => {
      const cards = createMockCards(1000);
      const deckManager = new DeckManager(cards);

      expect(deckManager.remaining()).toBe(1000);
      deckManager.shuffle();

      for (let i = 0; i < 1000; i++) {
        expect(deckManager.draw()).toBeTruthy();
      }

      expect(deckManager.draw()).toBeNull();
    });

    it("should maintain card integrity through shuffle and reset cycles", () => {
      const cards = createMockCards(5);
      const deckManager = new DeckManager(cards);

      for (let cycle = 0; cycle < 3; cycle++) {
        deckManager.shuffle(cycle);
        const drawnCards = [];

        for (let i = 0; i < 5; i++) {
          drawnCards.push(deckManager.draw());
        }

        expect(drawnCards.every((c) => c !== null)).toBe(true);
        expect(new Set(drawnCards.map((c) => c?.id)).size).toBe(5);

        deckManager.reset();
      }
    });
  });
});
