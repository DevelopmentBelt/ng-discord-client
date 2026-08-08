export type ProfileCardId =
  | 'classic'
  | 'midnight'
  | 'aurora'
  | 'ember'
  | 'ocean'
  | 'neon'
  | 'forest'
  | 'sunset';
export type AvatarEffectId = 'none' | 'ring' | 'glow' | 'pulse' | 'rainbow' | 'holo';

export interface ProfileCardOption {
  id: ProfileCardId;
  label: string;
  description: string;
}

export interface AvatarEffectOption {
  id: AvatarEffectId;
  label: string;
  description: string;
}

export const PROFILE_CARDS: ProfileCardOption[] = [
  { id: 'classic', label: 'Classic', description: 'Clean slate' },
  { id: 'midnight', label: 'Midnight', description: 'Deep indigo night' },
  { id: 'aurora', label: 'Aurora', description: 'Cool northern glow' },
  { id: 'ember', label: 'Ember', description: 'Warm firelight' },
  { id: 'ocean', label: 'Ocean', description: 'Teal depths' },
  { id: 'neon', label: 'Neon', description: 'Electric edge' },
  { id: 'forest', label: 'Forest', description: 'Mossy greens' },
  { id: 'sunset', label: 'Sunset', description: 'Peach to violet' }
];

export const AVATAR_EFFECTS: AvatarEffectOption[] = [
  { id: 'none', label: 'None', description: 'No effect' },
  { id: 'ring', label: 'Ring', description: 'Soft accent ring' },
  { id: 'glow', label: 'Glow', description: 'Ambient halo' },
  { id: 'pulse', label: 'Pulse', description: 'Gentle beat' },
  { id: 'rainbow', label: 'Prism', description: 'Shifting border' },
  { id: 'holo', label: 'Holo', description: 'Iridescent sheen' }
];
