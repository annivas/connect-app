import { supabase } from '../../lib/supabase';
import { Collection } from '../../types';
import { ICollectionsRepository } from '../types';
import { adaptSharedObject, adaptCollection } from './adapters';

export const supabaseCollectionsRepository: ICollectionsRepository = {
  async getCollections(): Promise<Collection[]> {
    // RLS handles visibility (creator, collaborator, or public)
    const { data: collections, error } = await supabase
      .from('collections')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch collections: ${error.message}`);
    if (!collections.length) return [];

    const collectionIds = collections.map((c) => c.id);

    // Parallel-fetch items and collaborators
    const [itemsResult, collabResult] = await Promise.all([
      supabase
        .from('shared_objects')
        .select('*')
        .in('collection_id', collectionIds)
        .order('shared_at', { ascending: false }),
      supabase
        .from('collection_collaborators')
        .select('*')
        .in('collection_id', collectionIds),
    ]);

    if (itemsResult.error) throw new Error(`Failed to fetch collection items: ${itemsResult.error.message}`);
    if (collabResult.error) throw new Error(`Failed to fetch collaborators: ${collabResult.error.message}`);

    // Group by collection_id
    const itemsByCollection = new Map<string, typeof itemsResult.data>();
    for (const item of itemsResult.data) {
      const existing = itemsByCollection.get(item.collection_id!) ?? [];
      existing.push(item);
      itemsByCollection.set(item.collection_id!, existing);
    }

    const collabsByCollection = new Map<string, string[]>();
    for (const collab of collabResult.data) {
      const existing = collabsByCollection.get(collab.collection_id) ?? [];
      existing.push(collab.user_id);
      collabsByCollection.set(collab.collection_id, existing);
    }

    return collections.map((collection) =>
      adaptCollection({
        collection,
        items: (itemsByCollection.get(collection.id) ?? []).map(adaptSharedObject),
        collaboratorIds: collabsByCollection.get(collection.id) ?? [],
      })
    );
  },
};
