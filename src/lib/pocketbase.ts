import PocketBase from 'pocketbase';
import { DBBackupData } from '../db';

// Get URL from localStorage or use Docker container's standard pocketbase address
const DEFAULT_PB_URL = typeof window !== 'undefined' 
  ? (localStorage.getItem('pocketbase_url') || 'http://localhost:8090') 
  : 'http://localhost:8090';

export const pb = new PocketBase(DEFAULT_PB_URL);

// Update URL dynamically if customized in settings
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
