import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InboxService } from '../../services/inbox-service/inbox.service';

@Component({
  selector: 'app-notification-badge',
  templateUrl: './notification-badge.component.html',
  styleUrls: ['./notification-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class NotificationBadgeComponent {
  // Input signals
  count = input<number>(0);
  maxCount = input<number>(99);
  size = input<'sm' | 'md' | 'lg'>('md');
  color = input<'red' | 'blue' | 'green' | 'yellow'>('red');
  
  // Computed values
  displayCount = computed(() => {
    const currentCount = this.count();
    const max = this.maxCount();
    return currentCount > max ? `${max}+` : currentCount.toString();
  });
  
  showBadge = computed(() => this.count() > 0);
  
  // Size classes
  sizeClasses = computed(() => {
    switch (this.size()) {
      case 'sm':
        return 'w-4 h-4 text-xs';
      case 'lg':
        return 'w-6 h-6 text-sm';
      default:
        return 'w-5 h-5 text-xs';
    }
  });
  
  // Color classes
  colorClasses = computed(() => {
    switch (this.color()) {
      case 'blue':
        return 'bg-discord-blue text-white';
      case 'green':
        return 'bg-green-500 text-white';
      case 'yellow':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-discord-red text-white';
    }
  });
}
