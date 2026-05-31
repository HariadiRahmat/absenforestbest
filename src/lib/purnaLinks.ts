/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_PURNA_LINKS, PurnaDocumentationLink, PurnaLinksConfig } from '../types';

export function normalizePurnaLinks(raw: Record<string, unknown>): PurnaLinksConfig {
  const linksRaw = Array.isArray(raw.links) ? raw.links : [];
  const links: PurnaDocumentationLink[] = linksRaw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === 'string' ? row.title.trim().slice(0, 80) : '';
      const url = typeof row.url === 'string' ? row.url.trim().slice(0, 500) : '';
      if (!title || !url) return null;
      return {
        id: typeof row.id === 'string' && row.id ? row.id : `link_${index}_${Date.now()}`,
        title,
        url,
        description: typeof row.description === 'string' ? row.description.trim().slice(0, 200) : undefined,
        order: typeof row.order === 'number' ? row.order : index,
      };
    })
    .filter((item): item is PurnaDocumentationLink => item !== null)
    .sort((a, b) => a.order - b.order);

  return {
    links,
    updatedAt: raw.updatedAt,
  };
}

export function emptyPurnaLinksConfig(): PurnaLinksConfig {
  return { ...DEFAULT_PURNA_LINKS, links: [] };
}

export function newPurnaLink(order: number): PurnaDocumentationLink {
  return {
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    url: '',
    description: '',
    order,
  };
}
