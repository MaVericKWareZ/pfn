import { Injectable } from "@nestjs/common";
import { Card } from "../domain/types";
import * as basePackData from "./data/base-pack.json";
import * as expansionPackData from "./data/expansion-pack.json";
import * as originalPackData from "./data/original-pack.json";

export interface ContentPack {
  id: string;
  name: string;
  version: string;
  cards: Card[];
  metadata: {
    ageRating: "family" | "adult";
    category: string;
  };
}

export const CONTENT_PACK_REPOSITORY_TOKEN = "IContentPackRepository";

export interface IContentPackRepository {
  loadPack(pack: ContentPack): void;
  getCards(packId?: string): Card[];
  getAllCards(packIds?: string[]): Card[];
  getAvailablePacks(): ContentPack[];
}

@Injectable()
export class ContentPackRepository implements IContentPackRepository {
  private packs: Map<string, ContentPack> = new Map();
  private defaultPackId: string = "base";

  constructor() {
    this.loadDefaultPack();
    this.loadExpansionPack();
    this.loadOriginalPack();
  }

  loadPack(pack: ContentPack): void {
    this.packs.set(pack.id, pack);
  }

  getCards(packId?: string): Card[] {
    const id = packId ?? this.defaultPackId;
    const pack = this.packs.get(id);
    if (!pack) {
      throw new Error(`Content pack '${id}' not found`);
    }
    return pack.cards;
  }

  getAllCards(packIds?: string[]): Card[] {
    const packsToLoad = packIds 
      ? packIds.map(id => this.packs.get(id)).filter((p): p is ContentPack => !!p)
      : Array.from(this.packs.values());
      
    return packsToLoad.flatMap(pack => pack.cards);
  }

  getAvailablePacks(): ContentPack[] {
    return Array.from(this.packs.values());
  }

  private loadDefaultPack(): void {
    const basePack: ContentPack = {
      id: "base",
      name: "Base Game",
      version: "1.0.0",
      metadata: {
        ageRating: "family",
        category: "general",
      },
      cards: this.generateSampleCards(basePackData as Array<{ easy: string; hard: string }>, "base"),
    };

    this.loadPack(basePack);
  }

  private loadExpansionPack(): void {
    const expansionPack: ContentPack = {
      id: "expansion-1",
      name: "Expansion Pack 1",
      version: "1.0.0",
      metadata: {
        ageRating: "family",
        category: "general",
      },
      cards: this.generateSampleCards(expansionPackData as Array<{ easy: string; hard: string }>, "exp1"),
    };

    this.loadPack(expansionPack);
  }

  private loadOriginalPack(): void {
    const originalPack: ContentPack = {
      id: "original",
      name: "Original Pack",
      version: "1.0.0",
      metadata: {
        ageRating: "family",
        category: "general",
      },
      cards: this.generateSampleCards(originalPackData as Array<{ easy: string; hard: string }>, "orig"),
    };

    this.loadPack(originalPack);
  }

  private generateSampleCards(data: Array<{ easy: string; hard: string }>, prefix: string): Card[] {
    return data.map((item, index) => ({
      id: `${prefix}-card-${index + 1}`,
      easyWord: item.easy,
      hardPhrase: item.hard,
    }));
  }
}
