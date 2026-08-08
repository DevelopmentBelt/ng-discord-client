export type AccentId = 'blurple' | 'emerald' | 'rose' | 'amber' | 'violet' | 'cyan' | 'coral' | 'custom';

export interface AccentOption {
  id: AccentId;
  label: string;
  description: string;
  /** Hex accent used for presets (ignored for custom) */
  hex: string;
}

export interface AppPreferences {
  accentId: AccentId;
  customAccent: string;
  compactMode: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  accentId: 'blurple',
  customAccent: '#5865f2',
  compactMode: false,
  reduceMotion: false
};

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'blurple', label: 'Blurple', description: 'Classic Angcord', hex: '#5865f2' },
  { id: 'emerald', label: 'Emerald', description: 'Fresh green', hex: '#23a559' },
  { id: 'rose', label: 'Rose', description: 'Soft pink', hex: '#eb459e' },
  { id: 'amber', label: 'Amber', description: 'Warm gold', hex: '#f0b232' },
  { id: 'violet', label: 'Violet', description: 'Deep purple', hex: '#9b59b6' },
  { id: 'cyan', label: 'Cyan', description: 'Cool teal', hex: '#1abc9c' },
  { id: 'coral', label: 'Coral', description: 'Bright orange', hex: '#f04747' },
  { id: 'custom', label: 'Custom', description: 'Pick your own', hex: '#5865f2' }
];

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export interface PresenceOption {
  id: PresenceStatus;
  label: string;
  description: string;
}

export const PRESENCE_OPTIONS: PresenceOption[] = [
  { id: 'online', label: 'Online', description: 'Looks like you\'re around' },
  { id: 'idle', label: 'Idle', description: 'Away for a bit' },
  { id: 'dnd', label: 'Do Not Disturb', description: 'Mute notifications vibe' },
  { id: 'invisible', label: 'Invisible', description: 'Appear offline' }
];
