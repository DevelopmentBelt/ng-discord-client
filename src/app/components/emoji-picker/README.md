# Emoji Picker Component

A comprehensive, Discord-themed emoji picker component built with Angular 18 and signals for optimal performance.

## Features

- 🎯 **8 Categories**: Smileys, Gestures, Animals, Food, Activities, Travel, Objects, Symbols
- 🔍 **Search Functionality**: Find emojis by name or keywords
- ⌨️ **Keyboard Navigation**: Use Enter to select, Escape to close
- 📱 **Responsive Design**: Works on all screen sizes
- 🎨 **Discord Theme**: Matches your app's design system
- ⚡ **Performance**: Built with Angular signals for optimal performance
- 🎭 **Positioning**: Configurable top/bottom positioning
- ♿ **Accessibility**: Full keyboard and screen reader support

## Installation

The component is already included in your project. No additional dependencies required.

## Basic Usage

```typescript
import { EmojiPickerComponent, Emoji } from './components/emoji-picker';

@Component({
  // ... your component config
  imports: [EmojiPickerComponent]
})
export class YourComponent {
  isEmojiPickerOpen = signal(false);
  selectedEmoji = signal<Emoji | null>(null);

  onEmojiSelected(emoji: Emoji) {
    this.selectedEmoji.set(emoji);
    // Handle emoji selection
    this.isEmojiPickerOpen.set(false);
  }
}
```

```html
<app-emoji-picker
  [isOpen]="isEmojiPickerOpen()"
  [position]="'bottom'"
  (emojiSelected)="onEmojiSelected($event)"
  (closed)="isEmojiPickerOpen.set(false)"
></app-emoji-picker>
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isOpen` | `boolean` | Required | Controls whether the emoji picker is visible |
| `position` | `'top' \| 'bottom'` | `'bottom'` | Position of the picker relative to trigger |

## Output Events

| Event | Type | Description |
|-------|------|-------------|
| `emojiSelected` | `Emoji` | Emitted when an emoji is selected |
| `closed` | `void` | Emitted when the picker is closed |

## Emoji Interface

```typescript
interface Emoji {
  id: string;           // Unique identifier
  name: string;         // Human-readable name
  char: string;         // Unicode emoji character
  category: string;     // Category ID
  keywords: string[];   // Search keywords
}
```

## Categories

The emoji picker includes 8 predefined categories:

1. **Smileys & Emotion** 😀 - Facial expressions and emotions
2. **Gestures & Body Parts** 👍 - Hand gestures and body parts
3. **Animals & Nature** 🐶 - Animals, plants, and natural elements
4. **Food & Drink** 🍕 - Food items and beverages
5. **Activities** ⚽ - Sports, games, and activities
6. **Travel & Places** ✈️ - Transportation and locations
7. **Objects** 💡 - Everyday objects and tools
8. **Symbols** 💕 - Hearts, marks, and symbols

## Search Functionality

Users can search for emojis by:
- Emoji name (e.g., "pizza", "heart")
- Keywords (e.g., "food", "love", "happy")
- Partial matches

## Keyboard Navigation

- **Enter**: Select the first emoji in the current category
- **Escape**: Close the emoji picker
- **Tab**: Navigate between interactive elements
- **Arrow Keys**: Navigate through emoji grid (future enhancement)

## Styling

The component uses CSS custom properties that match your Discord theme:

```css
:root {
  --nimbus-dark: #202225;
  --nimbus-medium: #2f3136;
  --nimbus-lighter: #36393f;
  --nimbus-blue: #5865f2;
  --nimbus-text: #b5b9c0;
  --nimbus-text-light: #dcddde;
  --nimbus-text-lighter: #ffffff;
}
```

## Customization

You can customize the appearance by overriding CSS variables or modifying the component styles. The component is built with a modular design that makes it easy to extend.

## Demo Component

A demo component (`EmojiPickerDemoComponent`) is included to showcase all features:

```typescript
import { EmojiPickerDemoComponent } from './components/emoji-picker-demo';

// Use in your app to test the emoji picker
```

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Performance

- Built with Angular signals for optimal change detection
- Lazy loading of emoji data
- Efficient search algorithm
- Minimal DOM manipulation

## Accessibility

- Full keyboard navigation support
- Screen reader compatible
- ARIA labels and descriptions
- Focus management
- High contrast support

## Future Enhancements

- Custom emoji support
- Emoji favorites
- Recent emojis
- Emoji reactions
- Drag and drop support
- More keyboard shortcuts
