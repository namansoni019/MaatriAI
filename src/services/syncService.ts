import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getUnsyncedMothers, markMotherSynced 
} from '../database/motherRepository';
import { 
  getUnsyncedVisits, markVisitSynced 
} from '../database/visitRepository';
import { 
  getUnsyncedNewborns, markNewbornSynced 
} from '../database/newbornRepository';
import { 
  getUnsyncedBreathScans, markBreathScanSynced 
} from '../database/breathScanRepository';

// Dummy API endpoint for demonstration
const API_BASE_URL = 'https://api.maatri.ai'; 

export interface SyncResult {
  success: boolean;
  mothersSynced: number;
  visitsSynced: number;
  newbornsSynced: number;
  breathScansSynced: number;
  errors: string[];
  syncedAt: string;
}

export const syncService = {
  
  async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable !== false;
    } catch (e) {
      return false;
    }
  },

  async syncAll(ashaId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      mothersSynced: 0,
      visitsSynced: 0,
      newbornsSynced: 0,
      breathScansSynced: 0,
      errors: [],
      syncedAt: new Date().toISOString()
    };

    const online = await this.isOnline();
    if (!online) {
      result.errors.push('No internet connection');
      return result;
    }

    try {
      // 1. Get all unsynced data
      const [mothers, visits, newborns, breathScans] = await Promise.all([
        getUnsyncedMothers(ashaId),
        getUnsyncedVisits(ashaId),
        getUnsyncedNewborns(ashaId),
        getUnsyncedBreathScans() // note: doesn't take ashaId in current implementation
      ]);

      const totalPending = mothers.length + visits.length + newborns.length + breathScans.length;
      if (totalPending === 0) {
        result.success = true;
        await AsyncStorage.setItem('last_sync_time', result.syncedAt);
        return result;
      }

      // 2. Mock API POST request (In a real app, use fetch to API_BASE_URL)
      // For now, we simulate a successful network request with a 1.5s delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      /* Example real API call:
      const response = await fetch(`${API_BASE_URL}/api/v1/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mothers, visits, newborns, breathScans })
      });
      if (!response.ok) throw new Error('Sync API failed');
      */

      // 3. On success, mark all as synced in SQLite
      await Promise.all([
        ...mothers.map(m => markMotherSynced(m.id)),
        ...visits.map(v => markVisitSynced(v.id)),
        ...newborns.map(n => markNewbornSynced(n.id)),
        ...breathScans.map(b => markBreathScanSynced(b.id))
      ]);

      result.mothersSynced = mothers.length;
      result.visitsSynced = visits.length;
      result.newbornsSynced = newborns.length;
      result.breathScansSynced = breathScans.length;
      result.success = true;

      // 4. Save last sync time
      await AsyncStorage.setItem('last_sync_time', result.syncedAt);

    } catch (error: any) {
      result.errors.push(error.message || 'Unknown sync error');
    }

    return result;
  },

  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('last_sync_time');
    } catch {
      return null;
    }
  },

  async getPendingSyncCount(ashaId: string): Promise<number> {
    try {
      const [mothers, visits, newborns, breathScans] = await Promise.all([
        getUnsyncedMothers(ashaId),
        getUnsyncedVisits(ashaId),
        getUnsyncedNewborns(ashaId),
        getUnsyncedBreathScans()
      ]);
      return mothers.length + visits.length + newborns.length + breathScans.length;
    } catch {
      return 0;
    }
  },

  startAutoSync(ashaId: string): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable !== false) {
        // Debounce or check if sync is needed before calling
        this.getPendingSyncCount(ashaId).then(count => {
          if (count > 0) {
            this.syncAll(ashaId).catch(console.error);
          }
        });
      }
    });
    
    return unsubscribe;
  }
};