export type AccentId = 'blurple' | 'emerald' | 'rose' | 'amber' | 'violet' | 'cyan' | 'coral' | 'custom';

export type ThemeColorKey =
  | 'dark'
  | 'darker'
  | 'medium'
  | 'lighter'
  | 'light'
  | 'blue'
  | 'blueDark'
  | 'text'
  | 'textLight'
  | 'textLighter'
  | 'textMuted'
  | 'textMutedLight'
  | 'hover'
  | 'border';

export interface ThemeColors {
  dark: string;
  darker: string;
  medium: string;
  lighter: string;
  light: string;
  blue: string;
  blueDark: string;
  text: string;
  textLight: string;
  textLighter: string;
  textMuted: string;
  textMutedLight: string;
  hover: string;
  border: string;
}

export interface ThemeColorField {
  key: ThemeColorKey;
  label: string;
  description: string;
  group: 'surfaces' | 'accent' | 'text' | 'chrome';
}

export interface AccentOption {
  id: AccentId;
  label: string;
  description: string;
  /** Hex accent used for presets (ignored for custom) */
  hex: string;
}

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  colors: ThemeColors;
}

export interface AppPreferences {
  accentId: AccentId;
  customAccent: string;
  themePresetId: string;
  colors: ThemeColors;
  compactMode: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_THEME_COLORS: ThemeColors = {
  dark: '#202225',
  darker: '#1e1f23',
  medium: '#2f3136',
  lighter: '#36393f',
  light: '#40444b',
  blue: '#5865f2',
  blueDark: '#404eed',
  text: '#b5b9c0',
  textLight: '#dcddde',
  textLighter: '#ffffff',
  textMuted: '#949ba4',
  textMutedLight: '#afafaf',
  hover: '#4f545c',
  border: '#202225'
};

export const THEME_COLOR_FIELDS: ThemeColorField[] = [
  { key: 'darker', label: 'App background', description: 'Outermost chrome', group: 'surfaces' },
  { key: 'dark', label: 'Server rail', description: 'Leftmost server bar', group: 'surfaces' },
  { key: 'medium', label: 'Side panels', description: 'Channels / members', group: 'surfaces' },
  { key: 'lighter', label: 'Main surface', description: 'Chat & modals', group: 'surfaces' },
  { key: 'light', label: 'Elevated surface', description: 'Inputs & hovers', group: 'surfaces' },
  { key: 'blue', label: 'Accent', description: 'Buttons & links', group: 'accent' },
  { key: 'blueDark', label: 'Accent hover', description: 'Pressed / hover accent', group: 'accent' },
  { key: 'textLighter', label: 'Headings', description: 'Brightest text', group: 'text' },
  { key: 'textLight', label: 'Primary text', description: 'Body copy', group: 'text' },
  { key: 'text', label: 'Secondary text', description: 'Supporting labels', group: 'text' },
  { key: 'textMuted', label: 'Muted text', description: 'Hints & captions', group: 'text' },
  { key: 'textMutedLight', label: 'Soft muted', description: 'Timestamps etc.', group: 'text' },
  { key: 'hover', label: 'Hover tint', description: 'Interactive wash', group: 'chrome' },
  { key: 'border', label: 'Borders', description: 'Dividers & outlines', group: 'chrome' }
];

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Original Nimbus dark',
    colors: { ...DEFAULT_THEME_COLORS }
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep navy night',
    colors: {
      dark: '#0b1220',
      darker: '#070b14',
      medium: '#111827',
      lighter: '#1f2937',
      light: '#374151',
      blue: '#6366f1',
      blueDark: '#4f46e5',
      text: '#9ca3af',
      textLight: '#e5e7eb',
      textLighter: '#f9fafb',
      textMuted: '#6b7280',
      textMutedLight: '#9ca3af',
      hover: '#4b5563',
      border: '#0b1220'
    }
  },
  {
    id: 'oled',
    label: 'OLED',
    description: 'Near-black contrast',
    colors: {
      dark: '#000000',
      darker: '#000000',
      medium: '#0a0a0a',
      lighter: '#121212',
      light: '#1c1c1c',
      blue: '#5865f2',
      blueDark: '#404eed',
      text: '#b3b3b3',
      textLight: '#e0e0e0',
      textLighter: '#ffffff',
      textMuted: '#8a8a8a',
      textMutedLight: '#a0a0a0',
      hover: '#2a2a2a',
      border: '#1a1a1a'
    }
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Cool steel greys',
    colors: {
      dark: '#1e293b',
      darker: '#0f172a',
      medium: '#334155',
      lighter: '#475569',
      light: '#64748b',
      blue: '#38bdf8',
      blueDark: '#0ea5e9',
      text: '#cbd5e1',
      textLight: '#e2e8f0',
      textLighter: '#f8fafc',
      textMuted: '#94a3b8',
      textMutedLight: '#a8b3c4',
      hover: '#64748b',
      border: '#1e293b'
    }
  },
  {
    id: 'ember',
    label: 'Ember',
    description: 'Warm charcoal & amber',
    colors: {
      dark: '#1c1410',
      darker: '#120d0a',
      medium: '#2a1d16',
      lighter: '#3a281c',
      light: '#4a3426',
      blue: '#f59e0b',
      blueDark: '#d97706',
      text: '#d6c3b0',
      textLight: '#f0e4d6',
      textLighter: '#fff7ed',
      textMuted: '#b89a7d',
      textMutedLight: '#c9ad93',
      hover: '#5c4030',
      border: '#1c1410'
    }
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Mossy green dark',
    colors: {
      dark: '#0f1a14',
      darker: '#0a120e',
      medium: '#16241c',
      lighter: '#1e3328',
      light: '#2a4636',
      blue: '#22c55e',
      blueDark: '#16a34a',
      text: '#b7cfc0',
      textLight: '#d9ebe1',
      textLighter: '#f0fdf4',
      textMuted: '#8eaa98',
      textMutedLight: '#a3bbae',
      hover: '#2f4d3c',
      border: '#0f1a14'
    }
  },
  {
    id: 'rose',
    label: 'Rosewood',
    description: 'Soft dusk pink',
    colors: {
      dark: '#1a1216',
      darker: '#120c10',
      medium: '#261820',
      lighter: '#332028',
      light: '#452b36',
      blue: '#f472b6',
      blueDark: '#ec4899',
      text: '#d8b8c6',
      textLight: '#f1d7e3',
      textLighter: '#fdf2f8',
      textMuted: '#b890a3',
      textMutedLight: '#c9a4b5',
      hover: '#4d3140',
      border: '#1a1216'
    }
  },
  {
    id: 'soft',
    label: 'Soft Light',
    description: 'Lighter grey workspace',
    colors: {
      dark: '#d4d7dc',
      darker: '#c5c9d0',
      medium: '#e3e5e8',
      lighter: '#ebedef',
      light: '#f2f3f5',
      blue: '#5865f2',
      blueDark: '#4752c4',
      text: '#4e5058',
      textLight: '#2e3035',
      textLighter: '#060607',
      textMuted: '#6d6f78',
      textMutedLight: '#5c5e66',
      hover: '#b5bac1',
      border: '#c5c9d0'
    }
  }
];

export const DEFAULT_PREFERENCES: AppPreferences = {
  accentId: 'blurple',
  customAccent: DEFAULT_THEME_COLORS.blue,
  themePresetId: 'classic',
  colors: { ...DEFAULT_THEME_COLORS },
  compactMode: false,
  reduceMotion: false
};

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'blurple', label: 'Blurple', description: 'Classic Nimbus', hex: '#5865f2' },
  { id: 'emerald', label: 'Emerald', description: 'Fresh green', hex: '#23a559' },
  { id: 'rose', label: 'Rose', description: 'Soft pink', hex: '#eb459e' },
  { id: 'amber', label: 'Amber', description: 'Warm gold', hex: '#f0b232' },
  { id: 'violet', label: 'Violet', description: 'Deep purple', hex: '#9b59b6' },
  { id: 'cyan', label: 'Cyan', description: 'Cool teal', hex: '#1abc9c' },
  { id: 'coral', label: 'Coral', description: 'Bright coral', hex: '#f04747' },
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
