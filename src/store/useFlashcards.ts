// src/store/useFlashcards.ts
import { create } from 'zustand';

export type Bullet = { text: string; value: boolean };
export type Flashcard = {
  id: string;
  index: number;
  title: string;
  bullets: Bullet[];
  children: { false: string | null; true: string | null };
  parentId: string | null;
  tags?: string[];
};

type State = {
  cards: Flashcard[];
  selectedId: string | null;
  setCards: (c: Flashcard[]) => void;
  select: (id: string | null) => void;
};

export const useFlashcards = create<State>((set) => ({
  cards: [],
  selectedId: null,
  setCards: (cards) => set({ cards }),
  select: (id) => set({ selectedId: id }),
}));
