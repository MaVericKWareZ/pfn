import { Injectable } from "@nestjs/common";
import { Card } from "../domain/types";
import * as basePackData from "./data/base-pack.json";

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
  getAvailablePacks(): ContentPack[];
}

@Injectable()
export class ContentPackRepository implements IContentPackRepository {
  private packs: Map<string, ContentPack> = new Map();
  private defaultPackId: string = "base";

  constructor() {
    this.loadDefaultPack();
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
      cards: this.generateSampleCards(),
    };

    this.loadPack(basePack);
  }

  private generateSampleCards(): Card[] {
    const cardData = basePackData as Array<{ easy: string; hard: string }>;

    return cardData.map((data, index) => ({
      id: `card-${index + 1}`,
      easyWord: data.easy,
      hardPhrase: data.hard,
    }));
  }
}
