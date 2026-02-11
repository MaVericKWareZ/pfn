import { Card, CardId } from "./types";

export interface IDeckManager {
  shuffle(seed?: number): void;
  draw(): Card | null;
  remaining(): number;
  reset(): void;
}

export class DeckManager implements IDeckManager {
  private cards: Card[];
  private originalCards: Card[];
  private currentIndex: number;

  constructor(cards: Card[]) {
    this.originalCards = [...cards];
    this.cards = [...cards];
    this.currentIndex = 0;
  }

  shuffle(seed?: number): void {
    const random = seed !== undefined ? this.seededRandom(seed) : Math.random;

    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }

    this.currentIndex = 0;
  }

  draw(): Card | null {
    if (this.currentIndex >= this.cards.length) {
      return null;
    }

    const card = this.cards[this.currentIndex];
    this.currentIndex++;
    return card;
  }

  remaining(): number {
    return this.cards.length - this.currentIndex;
  }

  reset(): void {
    this.cards = [...this.originalCards];
    this.currentIndex = 0;
  }

  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
      return currentSeed / 0x7fffffff;
    };
  }
}
