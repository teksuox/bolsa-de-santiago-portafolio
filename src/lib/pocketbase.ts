import PocketBase from 'pocketbase';
import { DBBackupData } from '../db';

const DEFAULT_PB_URL = 'http://localhost:8090';

export const pb = new PocketBase(DEFAULT_PB_URL);

// Auto-configure PocketBase URL from server (admins set it via env)
export async function autoConfigurePBUrl(): Promise<void> {
  try {
    const res = await fetch('/api/pocketbase-config');
    if (res.ok) {
      const config = await res.json();
      if (config.url) {
        // Test the URL first, fall back to common alternatives
        const tested = await findWorkingUrl(config.url);
        if (tested) {
          pb.baseUrl = tested;
          localStorage.setItem('pocketbase_url', tested);
          return;
        }
      }
    }
  } catch {
    // ignore
  }

  // Fallback: try stored URL, then common ports
  const stored = localStorage.getItem('pocketbase_url');
  const candidates = stored
    ? [stored, 'http://localhost:8091', 'http://localhost:8090']
    : ['http://localhost:8091', 'http://localhost:8090'];

  for (const url of candidates) {
    const ok = await checkPocketBaseHealth(url);
    if (ok) {
      pb.baseUrl = url;
      localStorage.setItem('pocketbase_url', url);
      return;
    }
  }
}

async function findWorkingUrl(url: string): Promise<string | null> {
  if (await checkPocketBaseHealth(url)) return url;
  // Try common alternatives
  for (const alt of ['http://localhost:8091', 'http://localhost:8090']) {
    if (alt !== url && await checkPocketBaseHealth(alt)) return alt;
  }
  return null;
}

// Keep updatePocketBaseUrl for backward compat but internally it's auto now
export function updatePocketBaseUrl(url: string) {
  localStorage.setItem('pocketbase_url', url);
  pb.baseUrl = url;
}

export async function checkPocketBaseHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const data = await response.json();
      return !!data;
    }
    return false;
  } catch (err) {
    console.warn('PocketBase health check failed:', err);
    return false;
  }
}

/**
 * Uploads local backup state to PocketBase
 */
export async function uploadPortfolioToPB(data: DBBackupData): Promise<any> {
  if (!pb.authStore.isValid || !pb.authStore.model) {
    throw new Error('Debes iniciar sesión en PocketBase para sincronizar.');
  }

  const userId = pb.authStore.model.id;

  // Search if a portfolio record already exists for the logged in user
  const records = await pb.collection('portafolios').getFullList({
    filter: `user = "${userId}"`,
    requestKey: null // disable auto-cancellation
  });

  if (records.length > 0) {
    const existing = records[0];
    // Update existing portfolio record
    return await pb.collection('portafolios').update(existing.id, {
      data: data
    }, {
      requestKey: null
    });
  } else {
    // Create new portfolio record
    return await pb.collection('portafolios').create({
      user: userId,
      data: data
    }, {
      requestKey: null
    });
  }
}

/**
 * Downloads backup state from PocketBase
 */
export async function downloadPortfolioFromPB(): Promise<DBBackupData | null> {
  if (!pb.authStore.isValid || !pb.authStore.model) {
    throw new Error('Debes iniciar sesión en PocketBase para sincronizar.');
  }

  const userId = pb.authStore.model.id;

  const records = await pb.collection('portafolios').getFullList({
    filter: `user = "${userId}"`,
    requestKey: null
  });

  if (records.length > 0) {
    return records[0].data as DBBackupData;
  }

  return null;
}
