import { VibeItem } from '../types';

export const PREDEFINED_VIBES: VibeItem[] = [
  // Affection
  { id: 'loved', name: 'Loved', emoji: '❤️', category: 'affection' },
  { id: 'cuddle', name: 'Cuddle', emoji: '🥰', category: 'affection' },
  { id: 'kiss', name: 'Kiss', emoji: '😘', category: 'affection' },
  { id: 'miss_you', name: 'Miss You', emoji: '🥺', category: 'affection' },
  { id: 'need_hug', name: 'Need Hug', emoji: '🫂', category: 'affection' },

  // Energy & Fun
  { id: 'excited', name: 'Excited', emoji: '🔥', category: 'energy' },
  { id: 'happy', name: 'Happy', emoji: '😊', category: 'energy' },
  { id: 'playful', name: 'Playful', emoji: '😜', category: 'energy' },
  { id: 'silly', name: 'Silly', emoji: '🤪', category: 'energy' },

  // Calming & Rest
  { id: 'sleepy', name: 'Sleepy', emoji: '😴', category: 'rest' },
  { id: 'peaceful', name: 'Peaceful', emoji: '☁️', category: 'rest' },
  { id: 'tired', name: 'Tired', emoji: '🥱', category: 'rest' },
  { id: 'chill', name: 'Chill', emoji: '☕', category: 'rest' },

  // Work & Day
  { id: 'busy', name: 'Busy', emoji: '💻', category: 'day' },
  { id: 'focused', name: 'Focused', emoji: '🎯', category: 'day' },
  { id: 'hungry', name: 'Hungry', emoji: '🍕', category: 'day' },
  { id: 'thinking_of_you', name: 'Thinking of You', emoji: '💭', category: 'day' },
];

export const VIBE_MAP = new Map<string, VibeItem>(
  PREDEFINED_VIBES.map((vibe) => [vibe.id, vibe])
);

export function getVibeById(id: string): VibeItem | undefined {
  return VIBE_MAP.get(id);
}
