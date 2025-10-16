// src/components/Toolbar.tsx
import React, { useState } from 'react';
import { useFlashcards, type Flashcard } from '../store/useFlashcards';
import { upsertCard } from '../lib/queries';

export default function Toolbar({ workspaceId, theme, onToggleTheme }: { workspaceId: string; theme?: 'light' | 'dark'; onToggleTheme?: () => void }) {
  const { cards, setCards, selectedId } = useFlashcards();
  const [creating, setCreating] = useState(false);

  async function createCard() {
    setCreating(true);
    const nextIndex = (cards.at(-1)?.index ?? 0) + 1;
    const id = `card_${String(nextIndex).padStart(4,'0')}`;
    const draft: Flashcard = {
      id, index: nextIndex, title: 'Untitled',
      bullets: [{ text: 'New point', value: false }],
      children: { false: null, true: null },
      parentId: null
    };
    await upsertCard(workspaceId, draft);
    setCards([...cards, draft]);
    setCreating(false);
  }

  return (
    <div className="toolbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <button onClick={createCard} disabled={creating} className="node-card__save-btn">+ New Flashcard</button>
        <span style={{ opacity:.7 }}>
          {selectedId ? `Selected: ${selectedId}` : 'Select a node to edit'}
        </span>
      </div>
      <div style={{ marginLeft: 'auto' }}>
        {onToggleTheme && (
          <button onClick={onToggleTheme} className="node-card__save-btn">
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
        )}
      </div>
    </div>
  );
}
