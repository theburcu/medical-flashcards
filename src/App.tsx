import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import NodeCard from './components/NodeCard';
import { useFlashcards } from './store/useFlashcards';
import { loadCards, loadWorkspaceName } from './lib/queries';
import './styles/_tokens.scss';
import './styles/app.scss';

export default function App({ workspaceId }: { workspaceId: string }) {
  const { setCards, cards, selectedId } = useFlashcards();
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadCards(workspaceId).then(setCards).catch(console.error);
    loadWorkspaceName(workspaceId).then(setWorkspaceName).catch(() => setWorkspaceName(null));
  }, [workspaceId, setCards]);

  const selected = selectedId != null ? cards.find(c => String(c.id) === String(selectedId)) : null;

  return (
    <div className="app">
      <Toolbar
        workspaceId={workspaceId}
        workspaceName={workspaceName ?? 'Workspace'}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
      <Sidebar />
      {/* Canvas gets the center column */}
      <div className="canvas-wrap">
        <Canvas />
      </div>
      {/* Inspector column shows when a node is selected */}
      <aside className="inspector">
        {selected ? (
          <NodeCard key={selected.id} card={selected} workspaceId={workspaceId} />
        ) : (
          <div className="inspector__empty">
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              Select a flashcard from the list or canvas to edit details here.
            </div>
          </div>
        )}
      </aside>

      
    </div>
  );
}
