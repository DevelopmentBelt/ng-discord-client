import { Injectable, computed, signal } from '@angular/core';
import {
  ACCENT_OPTIONS,
  AccentId,
  AppPreferences,
  DEFAULT_PREFERENCES
} from '../../models/user/app-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemePreferencesService {
  private readonly STORAGE_KEY = 'angcord-preferences';

  private readonly prefsSignal = signal<AppPreferences>({ ...DEFAULT_PREFERENCES });

  readonly preferences = this.prefsSignal.asReadonly();
  readonly accentId = computed(() => this.prefsSignal().accentId);
  readonly customAccent = computed(() => this.prefsSignal().customAccent);
  readonly compactMode = computed(() => this.prefsSignal().compactMode);
  readonly reduceMotion = computed(() => this.prefsSignal().reduceMotion);
  readonly accentOptions = ACCENT_OPTIONS;

  constructor() {
    this.prefsSignal.set(this.readStorage());
    this.apply(this.prefsSignal());
  }

  setAccent(id: AccentId): void {
    this.patch({ accentId: id });
  }

  setCustomAccent(hex: string): void {
    const normalized = this.normalizeHex(hex);
    // Keep the typed value so the hex field stays editable while incomplete
    this.patch({
      accentId: 'custom',
      customAccent: normalized || hex.trim() || DEFAULT_PREFERENCES.customAccent
    });
  }

  setCompactMode(enabled: boolean): void {
    this.patch({ compactMode: enabled });
  }

  setReduceMotion(enabled: boolean): void {
    this.patch({ reduceMotion: enabled });
  }

  reset(): void {
    this.patch({ ...DEFAULT_PREFERENCES });
  }

  resolveAccentHex(prefs: AppPreferences = this.prefsSignal()): string {
    if (prefs.accentId === 'custom') {
      return this.normalizeHex(prefs.customAccent) || DEFAULT_PREFERENCES.customAccent;
    }
    return ACCENT_OPTIONS.find((o) => o.id === prefs.accentId)?.hex || DEFAULT_PREFERENCES.customAccent;
  }

  private patch(partial: Partial<AppPreferences>): void {
    const next = { ...this.prefsSignal(), ...partial };
    this.prefsSignal.set(next);
    this.writeStorage(next);
    this.apply(next);
  }

  private apply(prefs: AppPreferences): void {
    const root = document.documentElement;
    const accent =
      prefs.accentId === 'custom'
        ? this.normalizeHex(prefs.customAccent) || DEFAULT_PREFERENCES.customAccent
        : this.resolveAccentHex(prefs);
    const dark = this.darkenHex(accent, 0.18);
    const rgb = this.hexToRgbChannels(accent);

    root.style.setProperty('--discord-blue', accent);
    root.style.setProperty('--discord-blue-dark', dark);
    root.style.setProperty('--discord-blue-rgb', rgb);
    root.style.setProperty('--discord-blue-dark-rgb', this.hexToRgbChannels(dark));

    root.classList.toggle('theme-compact', prefs.compactMode);
    root.classList.toggle('theme-reduce-motion', prefs.reduceMotion);
  }

  private readStorage(): AppPreferences {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_PREFERENCES };
      }
      const parsed = JSON.parse(raw) as Partial<AppPreferences>;
      const accentId = ACCENT_OPTIONS.some((o) => o.id === parsed.accentId)
        ? (parsed.accentId as AccentId)
        : DEFAULT_PREFERENCES.accentId;
      return {
        accentId,
        customAccent: this.normalizeHex(parsed.customAccent || '') || DEFAULT_PREFERENCES.customAccent,
        compactMode: !!parsed.compactMode,
        reduceMotion: !!parsed.reduceMotion
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  private writeStorage(prefs: AppPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore quota / private mode
    }
  }

  private normalizeHex(value: string): string | null {
    const v = (value || '').trim();
    const short = /^#([0-9a-fA-F]{3})$/;
    const full = /^#([0-9a-fA-F]{6})$/;
    if (full.test(v)) {
      return v.toLowerCase();
    }
    const m = v.match(short);
    if (m) {
      const [r, g, b] = m[1].split('');
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return null;
  }

  private hexToRgbChannels(hex: string): string {
    const normalized = this.normalizeHex(hex) || '#5865f2';
    const n = parseInt(normalized.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `${r} ${g} ${b}`;
  }

  private darkenHex(hex: string, amount: number): string {
    const normalized = this.normalizeHex(hex) || '#5865f2';
    const n = parseInt(normalized.slice(1), 16);
    const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
    const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
    const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
}
