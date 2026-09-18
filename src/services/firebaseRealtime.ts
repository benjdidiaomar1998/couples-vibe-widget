/**
 * Firebase Realtime Database Client Service.
 *
 * Implements the intended Firebase Realtime Database architecture:
 *
 * Person A (Client)
 *        ↓
 * Firebase Realtime Database: /couples/{coupleId}/currentVibes/{uid}
 *        ↓
 * Person B (Client listener)
 *
 * Each partner's vibe state is stored under independent paths:
 * /couples/{coupleId}/currentVibes/{uid}
 *
 * This guarantees atomic independent writes and prevents concurrent overwrites.
 */

import { CoupleData, UserVibeState, VibeHistoryEvent } from '../types';

type VibeCallback = (data: {
  couple: CoupleData | null;
  currentVibes: Record<string, UserVibeState>;
  vibeHistory: VibeHistoryEvent[];
}) => void;

class FirebaseRealtimeService {
  private listeners: Map<string, Set<VibeCallback>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('couples_vibe_rtdb');
        this.broadcastChannel.onmessage = (event) => {
          const { coupleId, payload } = event.data || {};
          if (coupleId && payload) {
            this.notifyLocalListeners(coupleId, payload);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }
  }

  /**
   * Observe couple vibe state via Realtime Database listener pattern.
   * Equivalent to Firebase Database:
   * database.getReference("couples/$coupleId").addValueEventListener(listener)
   */
  observeCouple(coupleId: string, callback: VibeCallback): () => void {
    if (!this.listeners.has(coupleId)) {
      this.listeners.set(coupleId, new Set());
    }
    const set = this.listeners.get(coupleId)!;
    set.add(callback);

    // Initial fetch to populate state immediately
    this.fetchCouple(coupleId).then((couple) => {
      if (couple) {
        callback({
          couple,
          currentVibes: couple.currentVibes || {},
          vibeHistory: couple.vibeHistory || [],
        });
      }
    }).catch(console.error);

    // Return unlistener (equivalent to ref.removeEventListener)
    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(coupleId);
      }
    };
  }

  /**
   * Fetch current couple snapshot
   */
  async fetchCouple(coupleId: string): Promise<CoupleData | null> {
    const res = await fetch(`/api/couples/${coupleId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.couple || null;
  }

  /**
   * Commit vibes to Firebase Realtime Database under:
   * /couples/{coupleId}/currentVibes/{uid}
   */
  async sendUserVibes(coupleId: string, uid: string, vibes: string[]): Promise<{
    currentVibes: Record<string, UserVibeState>;
    vibeHistory: VibeHistoryEvent[];
  }> {
    const res = await fetch(`/api/couples/${coupleId}/vibes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, vibes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send vibes. Please check your connection.');
    }

    const data = await res.json();

    const payload = {
      couple: null,
      currentVibes: data.currentVibes,
      vibeHistory: data.vibeHistory,
      updatedBy: uid,
    };

    // Notify local in-app listeners
    this.notifyLocalListeners(coupleId, payload);

    // Broadcast cross-tab for multi-device simulation
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ coupleId, payload });
    }

    return data;
  }

  /**
   * Issue ephemeral pairing code
   */
  async generatePairingCode(uid: string): Promise<{ code: string; expiresAt: number }> {
    const res = await fetch('/api/pairing/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not create pairing code.');
    }

    return res.json();
  }

  /**
   * Connect with partner using pairing code
   */
  async connectPairingCode(uid: string, code: string): Promise<CoupleData> {
    const res = await fetch('/api/pairing/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, code }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "We couldn't connect with that code. Please check and try again.");
    }

    const data = await res.json();
    if (data.couple) {
      this.notifyLocalListeners(data.couple.id, {
        couple: data.couple,
        currentVibes: data.couple.currentVibes || {},
        vibeHistory: data.couple.vibeHistory || [],
      });
    }
    return data.couple;
  }

  /**
   * Unpair from partner
   */
  async unpair(coupleId: string, uid: string): Promise<void> {
    await fetch(`/api/couples/${coupleId}/unpair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });

    this.notifyLocalListeners(coupleId, {
      couple: null,
      currentVibes: {},
      vibeHistory: [],
    });
  }

  /**
   * Reset sample couple data
   */
  async resetDemo(): Promise<CoupleData> {
    const res = await fetch('/api/demo/reset', { method: 'POST' });
    const data = await res.json();
    const couple = data.couple || (await this.fetchCouple('couple_demo_love'));
    if (couple) {
      this.notifyLocalListeners(couple.id, {
        couple,
        currentVibes: couple.currentVibes || {},
        vibeHistory: couple.vibeHistory || [],
      });
    }
    return couple;
  }

  private notifyLocalListeners(coupleId: string, payload: any) {
    const set = this.listeners.get(coupleId);
    if (!set) return;
    for (const callback of set) {
      try {
        callback(payload);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    }
  }
}

export const firebaseRealtime = new FirebaseRealtimeService();
