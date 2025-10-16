// src/components/Sidebar.tsx
import React, { useMemo, useState } from 'react';
import { useFlashcards } from '../store/useFlashcards';

export default function Sidebar() {
  const { cards, selectedId, select } = useFlashcards();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!q) return cards;
    if (/^\d+$/.test(q)) return cards.filter(c => c.index === Number(q));
    const s = q.toLowerCase();
    return cards.filter(c =>
      c.title.toLowerCase().includes(s) ||
      c.bullets.some(b => b.text.toLowerCase().includes(s))
    );
  }, [cards, q]);

  return (
    <aside className="sidebar">
      <div className="searchbar">
        <input
          placeholder="Search index or text…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #0002' }}
        />
      </div>
      <div>
        {filtered.map(c => (
          <div
            key={c.id}
            className={`index-item${selectedId === c.id ? ' is-active' : ''}`}
            onClick={() => select(c.id)}
          >
            <div className="node-title">{c.index}. {c.title}</div>
            <div className="node-meta">{c.bullets.length} bullets</div>
          </div>
        ))}
      </div>
    </aside>
  );
}
