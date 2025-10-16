import React, { useEffect, useState } from "react";
import { Flashcard, useFlashcards } from "../store/useFlashcards";
import { upsertCard, deleteCard } from "../lib/queries";

/**
 * NodeCard
 * Renders inside a selected node overlay or detail panel.
 * Shows editable title, bullets, and child links.
 */
export default function NodeCard({
  card,
  workspaceId,
}: {
  card: Flashcard;
  workspaceId: string;
}) {
  const { cards, setCards } = useFlashcards();
  const [title, setTitle] = useState(card.title);
  const [bullets, setBullets] = useState(card.bullets);
  const [children, setChildren] = useState(card.children);
  const [saving, setSaving] = useState(false);

  // Keep local state in sync when a different card is selected
  useEffect(() => {
    setTitle(card.title);
    setBullets(card.bullets);
    setChildren(card.children);
  }, [card.id, card.title, card.bullets, card.children]);

  async function handleSave() {
    setSaving(true);
    const updated: Flashcard = { ...card, title, bullets, children };
    try {
      await upsertCard(workspaceId, updated);
      const next = cards.map((c) => (c.id === card.id ? updated : c));
      setCards(next);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete flashcard #${card.index}? This will also remove links to it.`)) return;
    try {
      // 1) Remove this card
      await deleteCard(workspaceId, card.id);

      // 2) Clean up parent references locally and persist those updates
      const updatedCards = cards
        .filter((c) => c.id !== card.id)
        .map((c) => {
          const nextChildren = {
            false: c.children.false === card.id ? null : c.children.false,
            true: c.children.true === card.id ? null : c.children.true,
          };
          return nextChildren.false !== c.children.false || nextChildren.true !== c.children.true
            ? { ...c, children: nextChildren }
            : c;
        });

      // Persist parent updates where needed
      const parentsToUpdate = updatedCards.filter((c, i) => c !== cards[i]);
      await Promise.all(
        parentsToUpdate.map((p) => upsertCard(workspaceId, p))
      );

      setCards(updatedCards);
    } catch (e) {
      console.error(e);
      alert('Failed to delete flashcard.');
    }
  }

  function updateBullet(i: number, field: "text" | "value", val: any) {
    const next = bullets.map((b, j) =>
      j === i ? { ...b, [field]: val } : b
    );
    setBullets(next);
  }

  function addBullet() {
    setBullets([...bullets, { text: "", value: false }]);
  }

  function removeBullet(i: number) {
    setBullets(bullets.filter((_, j) => j !== i));
  }

  return (
    <div className="node-card">
      <div className="node-card__inner">
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>
          #{card.index} – Flashcard
        </h3>

        <label className="node-card__field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
          />
        </label>

        <div className="node-card__section">
          <div className="node-card__section-header">
            <span>Description bullets</span>
            <button onClick={addBullet} className="node-card__add-btn">
              + Add
            </button>
          </div>

          <div className="node-card__bullets">
            {bullets.map((b, i) => (
              <div key={i} className="node-card__bullet">
                <input
                  type="checkbox"
                  checked={b.value}
                  onChange={(e) =>
                    updateBullet(i, "value", e.currentTarget.checked)
                  }
                  title="True / False flag"
                />
                <input
                  type="text"
                  value={b.text}
                  onChange={(e) => updateBullet(i, "text", e.target.value)}
                  placeholder="Bullet text..."
                />
                <button
                  onClick={() => removeBullet(i)}
                  className="node-card__remove-btn"
                  title="Delete bullet"
                >
                  ✕
                </button>
              </div>
            ))}
            {bullets.length === 0 && (
              <div className="node-card__hint">No bullets yet</div>
            )}
          </div>
        </div>

        <div className="node-card__section">
          <span>Children (relations)</span>
          <div className="node-card__children">
            <label>
              False →{" "}
              <input
                value={children.false ?? ""}
                onChange={(e) =>
                  setChildren({ ...children, false: e.target.value || null })
                }
                placeholder="child ID or blank"
              />
            </label>
            <label>
              True →{" "}
              <input
                value={children.true ?? ""}
                onChange={(e) =>
                  setChildren({ ...children, true: e.target.value || null })
                }
                placeholder="child ID or blank"
              />
            </label>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="node-card__save-btn"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          onClick={handleDelete}
          className="node-card__remove-btn"
          style={{ justifySelf: 'start' }}
          title="Delete this flashcard"
        >
          Delete flashcard
        </button>
      </div>
    </div>
  );
}
