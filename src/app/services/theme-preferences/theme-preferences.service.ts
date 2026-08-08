import { Injectable, computed, signal } from '@angular/core';
import {
  ACCENT_OPTIONS,
  AccentId,
  AppPreferences,
  DEFAULT_PREFERENCES,
  DEFAULT_THEME_COLORS,
  THEME_COLOR_FIELDS,
  THEME_PRESETS,
  ThemeColorKey,
  ThemeColors
} from '../../models/user/app-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemePreferencesService {
  private readonly STORAGE_KEY = 'nimbus-preferences';
  private readonly LEGACY_STORAGE_KEYS = ['angcord-preferences'];

  private readonly cssVarMap: Record<ThemeColorKey, { hex: string; rgb: string }> = {
    dark: { hex: '--nimbus-dark', rgb: '--nimbus-dark-rgb' },
    darker: { hex: '--nimbus-darker', rgb: '--nimbus-darker-rgb' },
    medium: { hex: '--nimbus-medium', rgb: '--nimbus-medium-rgb' },
    lighter: { hex: '--nimbus-lighter', rgb: '--nimbus-lighter-rgb' },
    light: { hex: '--nimbus-light', rgb: '--nimbus-light-rgb' },
    blue: { hex: '--nimbus-blue', rgb: '--nimbus-blue-rgb' },
    blueDark: { hex: '--nimbus-blue-dark', rgb: '--nimbus-blue-dark-rgb' },
    text: { hex: '--nimbus-text', rgb: '--nimbus-text-rgb' },
    textLight: { hex: '--nimbus-text-light', rgb: '--nimbus-text-light-rgb' },
    textLighter: { hex: '--nimbus-text-lighter', rgb: '--nimbus-text-lighter-rgb' },
    textMuted: { hex: '--nimbus-text-muted', rgb: '--nimbus-text-muted-rgb' },
    textMutedLight: { hex: '--nimbus-text-muted-light', rgb: '--nimbus-text-muted-light-rgb' },
    hover: { hex: '--nimbus-hover', rgb: '--nimbus-hover-rgb' },
    border: { hex: '--nimbus-border', rgb: '--nimbus-border-rgb' }
  };

  private readonly prefsSignal = signal<AppPreferences>(this.cloneDefaults());

  readonly preferences = this.prefsSignal.asReadonly();
  readonly accentId = computed(() => this.prefsSignal().accentId);
  readonly customAccent = computed(() => this.prefsSignal().customAccent);
  readonly themePresetId = computed(() => this.prefsSignal().themePresetId);
  readonly colors = computed(() => this.prefsSignal().colors);
  readonly compactMode = computed(() => this.prefsSignal().compactMode);
  readonly reduceMotion = computed(() => this.prefsSignal().reduceMotion);
  readonly accentOptions = ACCENT_OPTIONS;
  readonly themePresets = THEME_PRESETS;
  readonly colorFields = THEME_COLOR_FIELDS;

  constructor() {
    this.prefsSignal.set(this.readStorage());
    this.apply(this.prefsSignal());
  }

  setThemePreset(id: string): void {
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (!preset) {
      return;
    }
    const colors = { ...preset.colors };
    this.patch({
      themePresetId: id,
      colors,
      accentId: this.matchAccentId(colors.blue),
      customAccent: colors.blue
    });
  }

  setAccent(id: AccentId): void {
    if (id === 'custom') {
      this.patch({
        accentId: 'custom',
        themePresetId: 'custom',
        colors: {
          ...this.prefsSignal().colors,
          blue: this.resolveAccentHex({ ...this.prefsSignal(), accentId: 'custom' }),
          blueDark: this.darkenHex(this.resolveAccentHex({ ...this.prefsSignal(), accentId: 'custom' }), 0.18)
        }
      });
      return;
    }

    const hex = ACCENT_OPTIONS.find((o) => o.id === id)?.hex || DEFAULT_THEME_COLORS.blue;
    this.patch({
      accentId: id,
      customAccent: hex,
      themePresetId: 'custom',
      colors: {
        ...this.prefsSignal().colors,
        blue: hex,
        blueDark: this.darkenHex(hex, 0.18)
      }
    });
  }

  setCustomAccent(hex: string): void {
    const normalized = this.normalizeHex(hex);
    const value = normalized || hex.trim() || DEFAULT_THEME_COLORS.blue;
    const applyHex = normalized || this.prefsSignal().colors.blue;
    this.patch({
      accentId: 'custom',
      customAccent: value,
      themePresetId: 'custom',
      colors: {
        ...this.prefsSignal().colors,
        blue: applyHex,
        blueDark: this.darkenHex(applyHex, 0.18)
      }
    });
  }

  setColor(key: ThemeColorKey, hex: string): void {
    const normalized = this.normalizeHex(hex);
    const value = normalized || hex.trim() || DEFAULT_THEME_COLORS[key];
    const nextColors = {
      ...this.prefsSignal().colors,
      [key]: normalized || this.prefsSignal().colors[key]
    };

    // Keep hex field editable while incomplete; only apply valid colors
    if (!normalized) {
      if (key === 'blue') {
        this.prefsSignal.update((prefs) => {
          const next = { ...prefs, accentId: 'custom' as AccentId, customAccent: value, themePresetId: 'custom' };
          this.writeStorage(next);
          return next;
        });
      }
      return;
    }

    const patch: Partial<AppPreferences> = {
      themePresetId: 'custom',
      colors: nextColors
    };

    if (key === 'blue') {
      patch.accentId = 'custom';
      patch.customAccent = value;
      if (!this.normalizeHex(this.prefsSignal().colors.blueDark)) {
        nextColors.blueDark = this.darkenHex(normalized, 0.18);
      }
    }

    this.patch(patch);
  }

  setCompactMode(enabled: boolean): void {
    this.patch({ compactMode: enabled });
  }

  setReduceMotion(enabled: boolean): void {
    this.patch({ reduceMotion: enabled });
  }

  reset(): void {
    const defaults = this.cloneDefaults();
    this.prefsSignal.set(defaults);
    this.writeStorage(defaults);
    this.apply(defaults);
  }

  resolveAccentHex(prefs: AppPreferences = this.prefsSignal()): string {
    if (prefs.accentId === 'custom') {
      return this.normalizeHex(prefs.customAccent) || prefs.colors.blue || DEFAULT_THEME_COLORS.blue;
    }
    return ACCENT_OPTIONS.find((o) => o.id === prefs.accentId)?.hex || prefs.colors.blue || DEFAULT_THEME_COLORS.blue;
  }

  colorValue(key: ThemeColorKey): string {
    return this.prefsSignal().colors[key] || DEFAULT_THEME_COLORS[key];
  }

  private patch(partial: Partial<AppPreferences>): void {
    const current = this.prefsSignal();
    const next: AppPreferences = {
      ...current,
      ...partial,
      colors: partial.colors ? { ...partial.colors } : { ...current.colors }
    };
    this.prefsSignal.set(next);
    this.writeStorage(next);
    this.apply(next);
  }

  private apply(prefs: AppPreferences): void {
    const root = document.documentElement;
    const colors = this.mergeColors(prefs.colors);

    (Object.keys(this.cssVarMap) as ThemeColorKey[]).forEach((key) => {
      const hex = this.normalizeHex(colors[key]) || DEFAULT_THEME_COLORS[key];
      const mapping = this.cssVarMap[key];
      root.style.setProperty(mapping.hex, hex);
      root.style.setProperty(mapping.rgb, this.hexToRgbChannels(hex));
    });

    // hover also used as solid in some places; keep rgba helper for legacy CSS
    root.style.setProperty('--nimbus-hover', `rgb(${this.hexToRgbChannels(colors.hover)} / 0.4)`);

    root.classList.toggle('theme-compact', prefs.compactMode);
    root.classList.toggle('theme-reduce-motion', prefs.reduceMotion);
  }

  private readStorage(): AppPreferences {
    try {
      let raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        for (const legacy of this.LEGACY_STORAGE_KEYS) {
          raw = localStorage.getItem(legacy);
          if (raw) {
            localStorage.setItem(this.STORAGE_KEY, raw);
            break;
          }
        }
      }
      if (!raw) {
        return this.cloneDefaults();
      }
      const parsed = JSON.parse(raw) as Partial<AppPreferences>;
      const accentId = ACCENT_OPTIONS.some((o) => o.id === parsed.accentId)
        ? (parsed.accentId as AccentId)
        : DEFAULT_PREFERENCES.accentId;

      let colors = this.mergeColors(parsed.colors);
      // Migrate older preference shape (accent-only)
      if (!parsed.colors) {
        const accent =
          accentId === 'custom'
            ? this.normalizeHex(parsed.customAccent || '') || DEFAULT_THEME_COLORS.blue
            : ACCENT_OPTIONS.find((o) => o.id === accentId)?.hex || DEFAULT_THEME_COLORS.blue;
        colors = {
          ...DEFAULT_THEME_COLORS,
          blue: accent,
          blueDark: this.darkenHex(accent, 0.18)
        };
      }

      const themePresetId =
        typeof parsed.themePresetId === 'string' &&
        (parsed.themePresetId === 'custom' || THEME_PRESETS.some((p) => p.id === parsed.themePresetId))
          ? parsed.themePresetId
          : parsed.colors
            ? 'custom'
            : 'classic';

      return {
        accentId,
        customAccent:
          this.normalizeHex(parsed.customAccent || '') || colors.blue || DEFAULT_PREFERENCES.customAccent,
        themePresetId,
        colors,
        compactMode: !!parsed.compactMode,
        reduceMotion: !!parsed.reduceMotion
      };
    } catch {
      return this.cloneDefaults();
    }
  }

  private writeStorage(prefs: AppPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore quota / private mode
    }
  }

  private mergeColors(partial?: Partial<ThemeColors> | null): ThemeColors {
    const merged = { ...DEFAULT_THEME_COLORS };
    if (!partial) {
      return merged;
    }
    (Object.keys(DEFAULT_THEME_COLORS) as ThemeColorKey[]).forEach((key) => {
      const value = this.normalizeHex(partial[key] || '');
      if (value) {
        merged[key] = value;
      }
    });
    return merged;
  }

  private matchAccentId(hex: string): AccentId {
    const normalized = this.normalizeHex(hex);
    if (!normalized) {
      return 'custom';
    }
    const match = ACCENT_OPTIONS.find((o) => o.id !== 'custom' && o.hex.toLowerCase() === normalized);
    return match?.id || 'custom';
  }

  private cloneDefaults(): AppPreferences {
    return {
      ...DEFAULT_PREFERENCES,
      colors: { ...DEFAULT_THEME_COLORS }
    };
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
