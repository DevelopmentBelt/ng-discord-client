# Emoji Picker Integration Guide

This guide shows you how to integrate the emoji picker functionality into your existing Discord client components.

## Quick Integration Example

### 1. Import the Emoji Picker Component

```typescript
import { EmojiPickerComponent, Emoji } from './components/emoji-picker';
```

### 2. Add to Your Component

```typescript
@Component({
  // ... your component config
  imports: [EmojiPickerComponent]
})
export class YourComponent {
  // Add these signals to control the emoji picker
  isEmojiPickerOpen = signal(false);
  selectedEmoji = signal<Emoji | null>(null);

  // This function opens the emoji picker when the button is clicked
  onOpenEmojiPicker(): void {
    this.isEmojiPickerOpen.set(true);
  }

  // This function handles emoji selection
  onEmojiSelected(emoji: Emoji): void {
    this.selectedEmoji.set(emoji);
    // Add the emoji to your message or handle it as needed
    this.isEmojiPickerOpen.set(false);
  }

  // This function closes the emoji picker
  onCloseEmojiPicker(): void {
    this.isEmojiPickerOpen.set(false);
  }
}
```

### 3. Add the HTML Template

```html
<!-- Add this button wherever you want the emoji picker trigger -->
<button
  class="emoji-button"
  (click)="onOpenEmojiPicker()"
  type="button"
  aria-label="Open emoji picker"
>
  <span class="emoji-icon">😀</span>
</button>

<!-- Add this at the bottom of your template -->
<app-emoji-picker
  [isOpen]="isEmojiPickerOpen()"
  [position]="'bottom'"
  (emojiSelected)="onEmojiSelected($event)"
  (closed)="onCloseEmojiPicker()"
></app-emoji-picker>
```

## Integration in Message Input

Here's how to integrate it into a message input component:

```typescript
@Component({
  selector: 'app-message-input',
  templateUrl: './message-input.component.html',
  imports: [EmojiPickerComponent, FormsModule]
})
export class MessageInputComponent {
  messageText = signal('');
  isEmojiPickerOpen = signal(false);

  onOpenEmojiPicker(): void {
    this.isEmojiPickerOpen.set(true);
  }

  onEmojiSelected(emoji: Emoji): void {
    // Add the emoji to the current message text
    this.messageText.update(text => text + emoji.char);
    this.isEmojiPickerOpen.set(false);
  }

  onCloseEmojiPicker(): void {
    this.isEmojiPickerOpen.set(false);
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
      class="emoji-button"
      (click)="onOpenEmojiPicker()"
      type="button"
    >
      😀
    </button>
  </div>
  
  <!-- Emoji Picker -->
  <app-emoji-picker
    [isOpen]="isEmojiPickerOpen()"
    [position]="'top'"
    (emojiSelected)="onEmojiSelected($event)"
    (closed)="onCloseEmojiPicker()"
  ></app-emoji-picker>
</div>
```

## Integration in Channel Messages

For channel message components:

```typescript
@Component({
  selector: 'app-channel-messages',
  imports: [EmojiPickerComponent]
})
export class ChannelMessagesComponent {
  isEmojiPickerOpen = signal(false);
  selectedMessageId = signal<string | null>(null);

  onOpenEmojiPicker(messageId: string): void {
    this.selectedMessageId.set(messageId);
    this.isEmojiPickerOpen.set(true);
  }

  onEmojiSelected(emoji: Emoji): void {
    const messageId = this.selectedMessageId();
    if (messageId) {
      // Add emoji reaction to the specific message
      this.addEmojiReaction(messageId, emoji);
    }
    this.isEmojiPickerOpen.set(false);
    this.selectedMessageId.set(null);
  }

  private addEmojiReaction(messageId: string, emoji: Emoji): void {
    // Implement your emoji reaction logic here
    console.log(`Adding ${emoji.char} to message ${messageId}`);
  }
}
```

## Styling Integration

The emoji picker automatically uses your Discord theme CSS variables. If you want to customize the appearance:

```scss
// Override specific styles if needed
.emoji-picker-container {
  // Your custom styles
}

.emoji-button {
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
2. **Navigate to a component** that has the emoji picker integrated
3. **Click the emoji button** - the picker should open
4. **Select an emoji** - it should be added to your message or handled as configured
5. **Press Escape** - the picker should close

## Troubleshooting

### Emoji Picker Not Opening
- Check that `isEmojiPickerOpen` signal is properly bound
- Verify the click handler is connected: `(click)="onOpenEmojiPicker()"`
- Check browser console for errors

### Emoji Not Being Added
- Ensure `onEmojiSelected` method is properly implemented
- Check that the emoji picker is closing after selection
- Verify the message text is being updated correctly

### Styling Issues
- Ensure your CSS variables are defined in `styles.css`
- Check that the component is importing the correct styles
- Verify responsive breakpoints are working

## Advanced Usage

### Custom Emoji Categories
You can extend the emoji picker with custom categories by modifying the `initializeEmojis()` method in the component.

### Position Control
Use the `position` input to control whether the picker opens above or below the trigger button:
```html
<app-emoji-picker
  [position]="'top'"
  <!-- other props -->
></app-emoji-picker>
```

### Keyboard Navigation
The emoji picker supports:
- **Enter**: Select first emoji
- **Escape**: Close picker
- **Tab**: Navigate between elements

## Performance Notes

- The emoji picker uses Angular signals for optimal performance
- Emoji data is loaded once on component initialization
- Search is performed efficiently with keyword matching
- The component automatically handles cleanup on destroy
