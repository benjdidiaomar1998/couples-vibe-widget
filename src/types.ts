export type VibeCategory = 'affection' | 'positive' | 'energy' | 'comfort' | 'emotion' | 'mood';

export interface VibeItem {
  id: string;
  name: string;
  emoji: string;
  category: VibeCategory;
}

export interface UserVibeState {
  vibes: string[]; // array of vibe IDs
  updatedAt: number;
}

export interface CoupleMemberData {
  uid: string;
  displayName: string;
  avatarBg: string;
}

export interface VibeHistoryEvent {
  id: string;
  senderId: string;
  senderName: string;
  vibes: string[];
  timestamp: number;
}

export interface CoupleData {
  id: string;
  members: Record<string, boolean>;
  membersData: Record<string, CoupleMemberData>;
  currentVibes: Record<string, UserVibeState>;
  vibeHistory: VibeHistoryEvent[];
  createdAt: number;
}

export interface PairingCodeInfo {
  code: string;
  creatorId: string;
  creatorName: string;
  expiresAt: number;
  used: boolean;
}

export interface AuthState {
  user: {
    uid: string;
    displayName: string;
    coupleId?: string;
    avatarBg: string;
  } | null;
  partner: CoupleMemberData | null;
  couple: CoupleData | null;
}
