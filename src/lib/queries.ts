// src/lib/queries.ts
import { supabase } from './supabase';
import type { Flashcard } from '../store/useFlashcards';

const mapRow = (r: any): Flashcard => ({
  id: r.id, index: r.idx, title: r.title,
  bullets: r.data?.bullets ?? [],
  children: r.data?.children ?? { false: null, true: null },
  parentId: r.data?.parentId ?? null,
  tags: r.data?.tags ?? []
});

export async function loadCards(workspaceId: string) {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('idx', { ascending: true });
  if (error) throw error;
  return data!.map(mapRow);
}

export async function upsertCard(workspaceId: string, card: Flashcard) {
  const row = {
    id: card.id,
    workspace_id: workspaceId,
    idx: card.index,
    title: card.title,
    data: {
      bullets: card.bullets,
      children: card.children,
      parentId: card.parentId,
      tags: card.tags ?? []
    }
  };
  const { error } = await supabase.from('flashcards').upsert(row);
  if (error) throw error;
}

export async function deleteCard(workspaceId: string, cardId: string) {
  const { error } = await supabase
    .from('flashcards')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', cardId);
  if (error) throw error;
}

export async function search(workspaceId: string, q: string) {
  if (/^\d+$/.test(q)) {
    const { data, error } = await supabase
      .from('flashcards').select('*')
      .eq('workspace_id', workspaceId)
      .eq('idx', Number(q));
    if (error) throw error;
    return data!.map(mapRow);
  }
  const { data, error } = await supabase.rpc('search_flashcards', { ws: workspaceId, q });
  if (error) throw error;
  return data!.map(mapRow);
}
