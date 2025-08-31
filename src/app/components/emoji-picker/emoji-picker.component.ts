import { ChangeDetectionStrategy, Component, input, output, signal, WritableSignal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: Emoji[];
}

export interface Emoji {
  id: string;
  name: string;
  char: string;
  category: string;
  keywords: string[];
}

@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrls: ['./emoji-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EmojiPickerComponent implements OnInit, OnDestroy {
  // Input Signals
  isOpen = input.required<boolean>();
  position = input<'top' | 'bottom'>('bottom');
  
  // Output Signals
  emojiSelected = output<Emoji>();
  closed = output<void>();

  // Internal state
  searchQuery: WritableSignal<string> = signal('');
  selectedCategory: WritableSignal<string> = signal('smileys');
  filteredEmojis: WritableSignal<Emoji[]> = signal([]);
  
  // Emoji data
  emojiCategories: WritableSignal<EmojiCategory[]> = signal([]);
  allEmojis: WritableSignal<Emoji[]> = signal([]);

  // Computed values
  filteredCategories = computed(() => {
    const query = this.searchQuery();
    if (!query.trim()) {
      return this.emojiCategories();
    }
    
    const filtered = this.allEmojis().filter(emoji => 
      emoji.name.toLowerCase().includes(query.toLowerCase()) ||
      emoji.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
    );
    
    return this.groupEmojisByCategory(filtered);
  });

  constructor() {
    // Debug effect to monitor isOpen changes
    effect(() => {
      const isOpenValue = this.isOpen();
      console.log('🔍 EmojiPicker isOpen changed to:', isOpenValue);
    });
  }

  ngOnInit(): void {
    console.log('🎨 EmojiPickerComponent initialized');
    console.log('Initial isOpen value:', this.isOpen());
    console.log('Initial position value:', this.position());
    this.initializeEmojis();
    this.setupKeyboardListeners();
  }

  ngOnDestroy(): void {
    this.removeKeyboardListeners();
  }

  private initializeEmojis(): void {
    console.log('📱 Initializing emojis...');
    const categories: EmojiCategory[] = [
      {
        id: 'smileys',
        name: 'Smileys & Emotion',
        icon: '😀',
        emojis: [
          { id: 'grinning', name: 'grinning face', char: '😀', category: 'smileys', keywords: ['face', 'grin', 'happy'] },
          { id: 'grin', name: 'grinning face with big eyes', char: '😃', category: 'smileys', keywords: ['face', 'grin', 'happy', 'joy'] },
          { id: 'joy', name: 'face with tears of joy', char: '😂', category: 'smileys', keywords: ['face', 'joy', 'tears', 'laugh'] },
          { id: 'smile', name: 'grinning face with smiling eyes', char: '😊', category: 'smileys', keywords: ['face', 'smile', 'happy'] },
          { id: 'sweat_smile', name: 'grinning face with sweat', char: '😅', category: 'smileys', keywords: ['face', 'sweat', 'grin'] },
          { id: 'laughing', name: 'grinning squinting face', char: '😆', category: 'smileys', keywords: ['face', 'laugh', 'squint'] },
          { id: 'wink', name: 'winking face', char: '😉', category: 'smileys', keywords: ['face', 'wink', 'eye'] },
          { id: 'blush', name: 'smiling face with smiling eyes', char: '😊', category: 'smileys', keywords: ['face', 'smile', 'blush'] },
          { id: 'yum', name: 'face savoring food', char: '😋', category: 'smileys', keywords: ['face', 'food', 'yum'] },
          { id: 'sunglasses', name: 'smiling face with sunglasses', char: '😎', category: 'smileys', keywords: ['face', 'sunglasses', 'cool'] }
        ]
      },
      {
        id: 'gestures',
        name: 'Gestures & Body Parts',
        icon: '👍',
        emojis: [
          { id: 'thumbsup', name: 'thumbs up', char: '👍', category: 'gestures', keywords: ['thumbs', 'up', 'like', 'approve'] },
          { id: 'thumbsdown', name: 'thumbs down', char: '👎', category: 'gestures', keywords: ['thumbs', 'down', 'dislike'] },
          { id: 'clap', name: 'clapping hands', char: '👏', category: 'gestures', keywords: ['clap', 'hands', 'applause'] },
          { id: 'wave', name: 'waving hand', char: '👋', category: 'gestures', keywords: ['wave', 'hand', 'hello', 'goodbye'] },
          { id: 'pray', name: 'folded hands', char: '🙏', category: 'gestures', keywords: ['pray', 'hands', 'please', 'hope'] },
          { id: 'ok_hand', name: 'OK hand', char: '👌', category: 'gestures', keywords: ['ok', 'hand', 'perfect'] },
          { id: 'v', name: 'victory hand', char: '✌️', category: 'gestures', keywords: ['victory', 'peace', 'hand'] },
          { id: 'point_up', name: 'backhand index pointing up', char: '👆', category: 'gestures', keywords: ['point', 'up', 'finger'] },
          { id: 'point_down', name: 'backhand index pointing down', char: '👇', category: 'gestures', keywords: ['point', 'down', 'finger'] },
          { id: 'point_left', name: 'backhand index pointing left', char: '👈', category: 'gestures', keywords: ['point', 'left', 'finger'] }
        ]
      },
      {
        id: 'animals',
        name: 'Animals & Nature',
        icon: '🐶',
        emojis: [
          { id: 'dog', name: 'dog face', char: '🐶', category: 'animals', keywords: ['dog', 'face', 'pet'] },
          { id: 'cat', name: 'cat face', char: '🐱', category: 'animals', keywords: ['cat', 'face', 'pet'] },
          { id: 'heart', name: 'red heart', char: '❤️', category: 'animals', keywords: ['heart', 'love', 'red'] },
          { id: 'sparkles', name: 'sparkles', char: '✨', category: 'animals', keywords: ['sparkles', 'shine', 'magic'] },
          { id: 'star', name: 'star', char: '⭐', category: 'animals', keywords: ['star', 'shine', 'night'] },
          { id: 'fire', name: 'fire', char: '🔥', category: 'animals', keywords: ['fire', 'hot', 'burn'] },
          { id: 'rainbow', name: 'rainbow', char: '🌈', category: 'animals', keywords: ['rainbow', 'color', 'sky'] },
          { id: 'sun', name: 'sun', char: '☀️', category: 'animals', keywords: ['sun', 'bright', 'day'] },
          { id: 'moon', name: 'full moon', char: '🌕', category: 'animals', keywords: ['moon', 'night', 'full'] },
          { id: 'cloud', name: 'cloud', char: '☁️', category: 'animals', keywords: ['cloud', 'sky', 'weather'] }
        ]
      },
      {
        id: 'food',
        name: 'Food & Drink',
        icon: '🍕',
        emojis: [
          { id: 'pizza', name: 'pizza', char: '🍕', category: 'food', keywords: ['pizza', 'food', 'cheese'] },
          { id: 'hamburger', name: 'hamburger', char: '🍔', category: 'food', keywords: ['hamburger', 'food', 'burger'] },
          { id: 'coffee', name: 'hot beverage', char: '☕', category: 'food', keywords: ['coffee', 'hot', 'drink'] },
          { id: 'beer', name: 'beer mug', char: '🍺', category: 'food', keywords: ['beer', 'drink', 'alcohol'] },
          { id: 'wine', name: 'wine glass', char: '🍷', category: 'food', keywords: ['wine', 'drink', 'alcohol'] },
          { id: 'cake', name: 'birthday cake', char: '🎂', category: 'food', keywords: ['cake', 'birthday', 'celebration'] },
          { id: 'ice_cream', name: 'soft ice cream', char: '🍦', category: 'food', keywords: ['ice cream', 'dessert', 'cold'] },
          { id: 'cookie', name: 'cookie', char: '🍪', category: 'food', keywords: ['cookie', 'dessert', 'sweet'] },
          { id: 'apple', name: 'red apple', char: '🍎', category: 'food', keywords: ['apple', 'fruit', 'red'] },
          { id: 'banana', name: 'banana', char: '🍌', category: 'food', keywords: ['banana', 'fruit', 'yellow'] }
        ]
      },
      {
        id: 'activities',
        name: 'Activities',
        icon: '⚽',
        emojis: [
          { id: 'soccer', name: 'soccer ball', char: '⚽', category: 'activities', keywords: ['soccer', 'football', 'sport'] },
          { id: 'basketball', name: 'basketball', char: '🏀', category: 'activities', keywords: ['basketball', 'sport', 'ball'] },
          { id: 'tennis', name: 'tennis', char: '🎾', category: 'activities', keywords: ['tennis', 'sport', 'ball'] },
          { id: 'music', name: 'musical note', char: '🎵', category: 'activities', keywords: ['music', 'note', 'sound'] },
          { id: 'guitar', name: 'guitar', char: '🎸', category: 'activities', keywords: ['guitar', 'music', 'instrument'] },
          { id: 'game', name: 'video game', char: '🎮', category: 'activities', keywords: ['game', 'video', 'controller'] },
          { id: 'movie', name: 'movie camera', char: '🎬', category: 'activities', keywords: ['movie', 'camera', 'film'] },
          { id: 'party', name: 'party popper', char: '🎉', category: 'activities', keywords: ['party', 'celebration', 'popper'] },
          { id: 'gift', name: 'wrapped gift', char: '🎁', category: 'activities', keywords: ['gift', 'present', 'wrapped'] },
          { id: 'balloon', name: 'balloon', char: '🎈', category: 'activities', keywords: ['balloon', 'party', 'celebration'] }
        ]
      },
      {
        id: 'travel',
        name: 'Travel & Places',
        icon: '✈️',
        emojis: [
          { id: 'airplane', name: 'airplane', char: '✈️', category: 'travel', keywords: ['airplane', 'plane', 'travel'] },
          { id: 'car', name: 'automobile', char: '🚗', category: 'travel', keywords: ['car', 'automobile', 'vehicle'] },
          { id: 'train', name: 'locomotive', char: '🚂', category: 'travel', keywords: ['train', 'locomotive', 'transport'] },
          { id: 'ship', name: 'ship', char: '🚢', category: 'travel', keywords: ['ship', 'boat', 'sea'] },
          { id: 'house', name: 'house', char: '🏠', category: 'travel', keywords: ['house', 'home', 'building'] },
          { id: 'office', name: 'office building', char: '🏢', category: 'travel', keywords: ['office', 'building', 'work'] },
          { id: 'school', name: 'school', char: '🏫', category: 'travel', keywords: ['school', 'education', 'building'] },
          { id: 'hospital', name: 'hospital', char: '🏥', category: 'travel', keywords: ['hospital', 'medical', 'building'] },
          { id: 'hotel', name: 'hotel', char: '🏨', category: 'travel', keywords: ['hotel', 'accommodation', 'building'] },
          { id: 'church', name: 'church', char: '⛪', category: 'travel', keywords: ['church', 'religion', 'building'] }
        ]
      },
      {
        id: 'objects',
        name: 'Objects',
        icon: '💡',
        emojis: [
          { id: 'bulb', name: 'light bulb', char: '💡', category: 'objects', keywords: ['light bulb', 'idea', 'light'] },
          { id: 'phone', name: 'mobile phone', char: '📱', category: 'objects', keywords: ['phone', 'mobile', 'call'] },
          { id: 'computer', name: 'laptop computer', char: '💻', category: 'objects', keywords: ['computer', 'laptop', 'work'] },
          { id: 'book', name: 'open book', char: '📖', category: 'objects', keywords: ['book', 'read', 'knowledge'] },
          { id: 'pencil', name: 'pencil', char: '✏️', category: 'objects', keywords: ['pencil', 'write', 'draw'] },
          { id: 'scissors', name: 'scissors', char: '✂️', category: 'objects', keywords: ['scissors', 'cut', 'tool'] },
          { id: 'clock', name: 'clock face', char: '🕐', category: 'objects', keywords: ['clock', 'time', 'hour'] },
          { id: 'key', name: 'key', char: '🔑', category: 'objects', keywords: ['key', 'lock', 'security'] },
          { id: 'lock', name: 'lock', char: '🔒', category: 'objects', keywords: ['lock', 'security', 'closed'] },
          { id: 'unlock', name: 'unlock', char: '🔓', category: 'objects', keywords: ['unlock', 'open', 'access'] }
        ]
      },
      {
        id: 'symbols',
        name: 'Symbols',
        icon: '💕',
        emojis: [
          { id: 'heart_eyes', name: 'smiling face with heart-eyes', char: '😍', category: 'symbols', keywords: ['heart', 'eyes', 'love', 'smile'] },
          { id: 'broken_heart', name: 'broken heart', char: '💔', category: 'symbols', keywords: ['broken', 'heart', 'sad'] },
          { id: 'two_hearts', name: 'two hearts', char: '💕', category: 'symbols', keywords: ['two', 'hearts', 'love'] },
          { id: 'sparkling_heart', name: 'sparkling heart', char: '💖', category: 'symbols', keywords: ['sparkling', 'heart', 'love'] },
          { id: 'check', name: 'check mark', char: '✅', category: 'symbols', keywords: ['check', 'mark', 'correct'] },
          { id: 'x', name: 'cross mark', char: '❌', category: 'symbols', keywords: ['cross', 'mark', 'wrong'] },
          { id: 'warning', name: 'warning sign', char: '⚠️', category: 'symbols', keywords: ['warning', 'sign', 'caution'] },
          { id: 'info', name: 'information', char: 'ℹ️', category: 'symbols', keywords: ['information', 'info', 'help'] },
          { id: 'recycle', name: 'recycling symbol', char: '♻️', category: 'symbols', keywords: ['recycle', 'environment', 'green'] },
          { id: 'peace', name: 'peace symbol', char: '☮️', category: 'symbols', keywords: ['peace', 'symbol', 'harmony'] }
        ]
      }
    ];

    this.emojiCategories.set(categories);
    
    // Flatten all emojis for search
    const allEmojis = categories.flatMap(cat => cat.emojis);
    this.allEmojis.set(allEmojis);
    
    // Set initial filtered emojis
    this.filteredEmojis.set(categories[0].emojis);
    console.log('📱 Emojis initialized:', allEmojis.length, 'total emojis');
  }

  private groupEmojisByCategory(emojis: Emoji[]): EmojiCategory[] {
    const grouped = new Map<string, Emoji[]>();
    
    emojis.forEach(emoji => {
      if (!grouped.has(emoji.category)) {
        grouped.set(emoji.category, []);
      }
      grouped.get(emoji.category)!.push(emoji);
    });
    
    return Array.from(grouped.entries()).map(([categoryId, emojis]) => {
      const category = this.emojiCategories().find(cat => cat.id === categoryId);
      return {
        id: categoryId,
        name: category?.name || categoryId,
        icon: category?.icon || '📁',
        emojis
      };
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onCategorySelect(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    const category = this.emojiCategories().find(cat => cat.id === categoryId);
    if (category) {
      this.filteredEmojis.set(category.emojis);
    }
  }

  onEmojiSelect(emoji: Emoji): void {
    console.log('🎯 Emoji selected in picker:', emoji);
    this.emojiSelected.emit(emoji);
  }

  onClose(): void {
    console.log('🔒 Closing emoji picker');
    this.closed.emit();
  }

  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private removeKeyboardListeners(): void {
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.onClose();
        break;
      case 'Enter':
        event.preventDefault();
        // Select first emoji in current category
        const currentEmojis = this.filteredEmojis();
        if (currentEmojis.length > 0) {
          this.onEmojiSelect(currentEmojis[0]);
        }
        break;
    }
  }
}
