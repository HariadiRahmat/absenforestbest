/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_PURNA_LINKS, PurnaDocumentationLink, PurnaLinksConfig } from '../types';

export const INITIAL_PURNA_LINKS: PurnaDocumentationLink[] = [
  {
    id: 'link_persami_2025',
    title: 'PERSAMI 6-7 September 2025',
    url: 'https://drive.google.com/drive/folders/1Z2yvYqxRHnEpzBENxTDBxwS318-_gQgr?usp=drive_link',
    description: 'Dokumentasi kegiatan PERSAMI 2025',
    order: 0,
  },
  {
    id: 'link_hut_saka_bayangkara',
    title: 'HUT Saka Bayangkara',
    url: 'https://drive.google.com/drive/folders/1en0KC5c6RbYvuD9l-AQk4T6DLqMTEQdt?usp=sharing',
    description: 'Arsip dokumentasi HUT Saka Bayangkara',
    order: 1,
  },
  {
    id: 'link_kpc_iii_2025',
    title: 'KPC III 2025',
    url: 'https://drive.google.com/drive/folders/1ug92Ck3S3A-0abK9izEP234ule_SVCgV?usp=share_link',
    description: 'Dokumentasi KPC III 2025',
    order: 2,
  },
  {
    id: 'link_bukber_2026',
    title: 'Bukber 2026',
    url: 'https://drive.google.com/drive/folders/1BeK4DZ1Hck3XYUlhFmTa6jYHmkoWwpje?usp=share_link',
    description: 'Dokumentasi buka bersama 2026',
    order: 3,
  },
];

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
  return { ...DEFAULT_PURNA_LINKS, links: [...INITIAL_PURNA_LINKS] };
}

export function resolvePurnaLinks(raw?: Record<string, unknown>): PurnaLinksConfig {
  if (!raw) return emptyPurnaLinksConfig();
  const normalized = normalizePurnaLinks(raw);
  if (normalized.links.length === 0) return emptyPurnaLinksConfig();
  return normalized;
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
