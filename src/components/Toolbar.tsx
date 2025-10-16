// src/components/Toolbar.tsx
import React, { useState } from 'react';
import { useFlashcards, type Flashcard } from '../store/useFlashcards';
import { upsertCard } from '../lib/queries';
import { supabase } from '../lib/supabase';

export default function Toolbar({ workspaceId, workspaceName, theme, onToggleTheme }: { workspaceId: string; workspaceName?: string; theme?: 'light' | 'dark'; onToggleTheme?: () => void }) {
  const { cards, setCards, selectedId } = useFlashcards();
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function createCard() {
    setCreating(true);
    const nextIndex = (cards.at(-1)?.index ?? 0) + 1;
    const id = `card_${String(nextIndex).padStart(4,'0')}`;
    const draft: Flashcard = {
      id, index: nextIndex, title: 'Untitled',
      bullets: [{ text: 'New point', value: false }],
      children: { false: null, true: null },
      parentId: null,
      tags: [],
      bgColor: undefined
    };
    await upsertCard(workspaceId, draft);
    setCards([...cards, draft]);
    setCreating(false);
  }

  return (
    <div className="toolbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <button onClick={createCard} disabled={creating} className="btn btn-success">+ New Flashcard</button>
        <span style={{ opacity:.7 }} className="hide-on-mobile">
          {selectedId ? `Selected: ${selectedId}` : 'Select a node to edit'}
        </span>
      </div>

      {workspaceName && (
          <span className="badge badge-outlined" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ opacity: 0.8 }}>Current Workspace:</span>
            <span >{workspaceName}</span>
          </span>
        )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        {onToggleTheme && (
          <button onClick={onToggleTheme} className="btn btn-primary btn-outlined hide-on-mobile">
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="btn btn-danger hide-on-mobile"
          style={{ marginLeft: 8 }}
        >
          Log out
        </button>

        {/* Mobile: hamburger menu */}
        <button
          className="btn btn-outlined show-on-mobile"
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
        {menuOpen && (
          <div className="menu-dropdown show-on-mobile" role="menu">
            {onToggleTheme && (
              <button onClick={() => { setMenuOpen(false); onToggleTheme?.(); }} className="btn btn-primary btn-outlined" role="menuitem">
                {theme === 'dark' ? 'Light theme' : 'Dark theme'}
              </button>
            )}
            <button onClick={() => { setMenuOpen(false); void supabase.auth.signOut(); }} className="btn btn-danger" role="menuitem">
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
