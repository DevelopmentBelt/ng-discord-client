# GIF Picker Integration Guide

This guide shows you how to integrate the GIF picker functionality into your Discord client components.

## Quick Integration

### 1. Import the GIF Picker Component

```typescript
import { GifPickerComponent, GifResult } from './components/gif-picker';
```

### 2. Add to Your Component

```typescript
@Component({
  // ... your component config
  imports: [GifPickerComponent]
})
export class YourComponent {
  // Add these signals to control the GIF picker
  isGifPickerOpen = signal(false);

  // This function opens the GIF picker when the button is clicked
  openGifPicker(): void {
    this.isGifPickerOpen.set(true);
  }

  // This function handles GIF selection
  onGifSelected(gif: GifResult): void {
    console.log('Selected GIF:', gif);
    // Handle the selected GIF (add to message, etc.)
    // The picker stays open for multiple selections
  }

  // This function closes the GIF picker
  onCloseGifPicker(): void {
    this.isGifPickerOpen.set(false);
  }
}
```

### 3. Add the HTML Template

```html
<!-- Add this button wherever you want the GIF picker trigger -->
<button
  class="gif-button"
  (click)="openGifPicker()"
  type="button"
  aria-label="Open GIF picker"
>
  🎬
</button>

<!-- Add this at the bottom of your template -->
<app-gif-picker
  [isOpen]="isGifPickerOpen()"
  [position]="'top'"
  (gifSelected)="onGifSelected($event)"
  (closed)="onCloseGifPicker()"
></app-gif-picker>
```

## Integration in Message Input

Here's how to integrate it into a message input component:

```typescript
@Component({
  selector: 'app-message-input',
  templateUrl: './message-input.component.html',
  imports: [GifPickerComponent, FormsModule]
})
export class MessageInputComponent {
  messageText = signal('');
  isGifPickerOpen = signal(false);

  openGifPicker(): void {
    this.isGifPickerOpen.set(true);
  }

  onGifSelected(gif: GifResult): void {
    // Add the GIF to the current message text
    this.messageText.update(text => text + ` [GIF: ${gif.title}]`);
    // Don't close the picker - keep it open for multiple selections
  }

  onCloseGifPicker(): void {
    this.isGifPickerOpen.set(false);
  }
}
```

```html
<div class="message-input-container">
  <div class="input-row">
    <textarea
      [value]="messageText()"
      (input)="messageText.set($any($event.target).value)"
      placeholder="Type your message..."
    ></textarea>
    
    <button
      class="gif-button"
      (click)="openGifPicker()"
      type="button"
    >
      🎬
    </button>
  </div>
  
  <!-- GIF Picker -->
  <app-gif-picker
    [isOpen]="isGifPickerOpen()"
    [position]="'top'"
    (gifSelected)="onGifSelected($event)"
    (closed)="onCloseGifPicker()"
  ></app-gif-picker>
</div>
```

## Styling Integration

The GIF picker automatically uses your Discord theme CSS variables. If you want to customize the appearance:

```scss
// Override specific styles if needed
.gif-picker-container {
  // Your custom styles
}

.gif-button {
  background-color: var(--discord-blue);
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: var(--discord-blue-dark);
  }
}
```

## Testing the Integration

1. **Run your application**: `ng serve`
2. **Navigate to a component** that has the GIF picker integrated
3. **Click the GIF button** (🎬) - the picker should open
4. **Search for GIFs** or browse categories
5. **Select a GIF** - it should be added to your message
6. **Press Escape** - the picker should close

## Important Notes

- **API Key Required**: You need a Tenor API key for the GIF picker to work
- **Multiple Selection**: The picker stays open after selecting GIFs
- **Fallback Support**: Shows placeholder GIFs if the API is unavailable
- **Responsive Design**: Automatically adapts to different screen sizes

## Troubleshooting

### GIF Picker Not Opening
- Check that `isGifPickerOpen` signal is properly bound
- Verify the click handler is connected: `(click)="openGifPicker()"`
- Check browser console for errors

### GIFs Not Loading
- Ensure you have a valid Tenor API key
- Check that the Tenor API is enabled in Google Cloud Console
- Verify network requests in browser dev tools

### Styling Issues
- Ensure your CSS variables are defined in `styles.css`
- Check that the component is importing the correct styles
- Verify responsive breakpoints are working
