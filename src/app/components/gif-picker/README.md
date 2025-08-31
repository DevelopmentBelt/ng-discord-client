# GIF Picker Component

A Discord-themed GIF picker component that integrates with Tenor's API to search and display GIFs.

## Features

- **🎬 GIF Search**: Search for GIFs using Tenor's API
- **📱 Categories**: Browse GIFs by category (Trending, Reactions, Animals, Gaming, etc.)
- **🔍 Smart Search**: Debounced search with real-time results
- **🎨 Discord Theme**: Matches your Discord client's design
- **📱 Responsive**: Works on all screen sizes
- **⌨️ Keyboard Support**: Escape to close, Enter to select first GIF
- **✨ Multiple Selection**: Keep picker open to select multiple GIFs

## Setup

### 1. Get a Tenor API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Tenor API
4. Create credentials (API Key)
5. Copy your API key

### 2. Update the API Key

Replace the placeholder API key in `gif-picker.component.ts`:

```typescript
private readonly TENOR_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE';
```

### 3. Import the Component

```typescript
import { GifPickerComponent, GifResult } from './components/gif-picker';
```

## Usage

### Basic Implementation

```typescript
@Component({
  imports: [GifPickerComponent]
})
export class YourComponent {
  isGifPickerOpen = signal(false);

  openGifPicker(): void {
    this.isGifPickerOpen.set(true);
  }

  onGifSelected(gif: GifResult): void {
    console.log('Selected GIF:', gif);
    // Handle the selected GIF
  }

  onCloseGifPicker(): void {
    this.isGifPickerOpen.set(false);
  }
}
```

### HTML Template

```html
<!-- GIF Button -->
<button (click)="openGifPicker()" title="Open GIF picker">
  🎬
</button>

<!-- GIF Picker Component -->
<app-gif-picker
  [isOpen]="isGifPickerOpen()"
  [position]="'top'"
  (gifSelected)="onGifSelected($event)"
  (closed)="onCloseGifPicker()"
></app-gif-picker>
```

## API Reference

### Inputs

- `isOpen`: Boolean signal to control picker visibility
- `position`: 'top' | 'bottom' - where the picker opens relative to the trigger

### Outputs

- `gifSelected`: Emits `GifResult` when a GIF is selected
- `closed`: Emits when the picker is closed

### Interfaces

```typescript
export interface GifResult {
  id: string;
  title: string;
  url: string;           // Full-size GIF URL
  previewUrl: string;    // Thumbnail/preview URL
  width: number;
  height: number;
  aspectRatio: number;
}

export interface GifCategory {
  id: string;
  name: string;
  searchTerm: string;
  previewUrl: string;
}
```

## Categories

The GIF picker includes these predefined categories:

- **🔥 Trending**: Currently popular GIFs
- **😄 Reactions**: Reaction GIFs and emotions
- **🐶 Animals**: Cute animal GIFs
- **🎮 Gaming**: Gaming-related GIFs
- **🌸 Anime**: Anime and manga GIFs
- **⚽ Sports**: Sports and athletic GIFs
- **😂 Memes**: Popular meme GIFs
- **🌿 Nature**: Nature and landscape GIFs

## Search

- **Real-time search** with 500ms debouncing
- **Keyword matching** against GIF titles and descriptions
- **Content filtering** for appropriate content
- **Fallback handling** when API is unavailable

## Styling

The component uses Discord CSS variables for consistent theming:

```scss
:root {
  --discord-dark: #202225;
  --discord-lighter: #36393f;
  --discord-blue: #5865f2;
  --discord-text-light: #dcddde;
  // ... more variables
}
```

## Responsive Design

- **Desktop**: 600px max-width, 80vh max-height
- **Tablet**: 95vw max-width, 90vh max-height  
- **Mobile**: 100vw max-width, 95vh max-height
- **Grid**: Responsive columns (120px → 100px → 80px)

## Performance

- **Lazy loading** for GIF images
- **Debounced search** to reduce API calls
- **Efficient rendering** with Angular signals
- **Memory management** with proper cleanup

## Error Handling

- **API fallbacks** to placeholder GIFs
- **Network error handling** with user feedback
- **Loading states** during API calls
- **Graceful degradation** when services are unavailable

## Browser Support

- **Modern browsers** with ES2020+ support
- **Angular 18+** required
- **CSS Grid** and **Flexbox** for layout
- **CSS Custom Properties** for theming

## Troubleshooting

### GIFs Not Loading

1. Check your Tenor API key is correct
2. Verify the Tenor API is enabled in Google Cloud Console
3. Check browser console for error messages
4. Ensure you have proper CORS access

### Search Not Working

1. Verify API key has search permissions
2. Check network tab for failed requests
3. Ensure proper error handling in component

### Styling Issues

1. Verify Discord CSS variables are defined
2. Check component is properly imported
3. Ensure no CSS conflicts with parent components

## Future Enhancements

- **GIF upload** functionality
- **Favorite GIFs** collection
- **Recent searches** history
- **Custom categories** support
- **GIF reactions** in messages
- **Advanced filters** (size, duration, etc.)
