import { useState, useMemo } from 'react';

type SortDir = 'asc' | 'desc';

export function useSortable<T>(data: T[], defaultKey?: string) {
  const [sortKey, setSortKey] = useState<string>(defaultKey || '');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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