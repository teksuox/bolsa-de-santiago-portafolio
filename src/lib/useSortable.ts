import { useState, useMemo, useEffect } from 'react';

type SortDir = 'asc' | 'desc';

function loadPersisted(key: string): { k: string; d: SortDir } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.k === 'string' && (parsed.d === 'asc' || parsed.d === 'desc')) return parsed;
  } catch { /* ignore */ }
  return null;
}

function persist(key: string, k: string, d: SortDir) {
  try { localStorage.setItem(key, JSON.stringify({ k, d })); } catch { /* ignore */ }
}

export function useSortable<T>(data: T[], defaultKey?: string, storageKey?: string) {
  const persisted = storageKey ? loadPersisted(storageKey) : null;
  const [sortKey, setSortKey] = useState<string>(persisted?.k ?? defaultKey ?? '');
  const [sortDir, setSortDir] = useState<SortDir>(persisted?.d ?? 'asc');

  useEffect(() => {
    if (storageKey) persist(storageKey, sortKey, sortDir);
  }, [sortKey, sortDir, storageKey]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const resolveKey = (obj: any, key: string): any => {
    return key.split('.').reduce((acc, k) => (acc != null ? acc[k] : acc), obj);
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !data) return data;
    return [...data].sort((a: any, b: any) => {
      let aVal = resolveKey(a, sortKey);
      let bVal = resolveKey(b, sortKey);
      if (aVal == null) aVal = typeof bVal === 'string' ? '' : 0;
      if (bVal == null) bVal = typeof aVal === 'string' ? '' : 0;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  return { sortedData, sortKey, sortDir, toggleSort, getSortIcon };
}