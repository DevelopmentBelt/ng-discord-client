import { Injectable } from '@angular/core';

export interface AlertOptions {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alerts: AlertOptions[] = [];

  constructor() {}

  /**
   * Show an info alert
   */
  info(title: string, message: string, duration: number = 3000): void {
    this.showAlert({ type: 'info', title, message, duration });
  }

  /**
   * Show a success alert
   */
  success(title: string, message: string, duration: number = 3000): void {
    this.showAlert({ type: 'success', title, message, duration });
  }

  /**
   * Show a warning alert
   */
  warning(title: string, message: string, duration: number = 4000): void {
    this.showAlert({ type: 'warning', title, message, duration });
  }

  /**
   * Show an error alert
   */
  error(title: string, message: string, duration: number = 5000): void {
    this.showAlert({ type: 'error', title, message, duration });
  }

  /**
   * Show a feature coming soon alert
   */
  featureComingSoon(featureName: string): void {
    this.info(
      'Feature Coming Soon',
      `${featureName} functionality is currently under development and will be available soon!`,
      4000
    );
  }

  /**
   * Show a Discord-like notification
   */
  discordNotification(title: string, message: string): void {
    // M2: build the notification DOM with safe text nodes — no innerHTML
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-nimbus-lighter border border-nimbus-border rounded-lg shadow-lg p-4 max-w-sm z-50 transform transition-all duration-300 translate-x-full';

    // Outer flex container
    const flex = document.createElement('div');
    flex.className = 'flex items-start space-x-3';

    // Icon container
    const iconWrap = document.createElement('div');
    iconWrap.className = 'w-6 h-6 bg-nimbus-blue rounded-full flex items-center justify-center flex-shrink-0';
    iconWrap.innerHTML = '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>';

    // Text content — title and message assigned with textContent (safe)
    const textWrap = document.createElement('div');
    textWrap.className = 'flex-1 min-w-0';

    const h4 = document.createElement('h4');
    h4.className = 'text-nimbus-text-lighter font-semibold text-sm mb-1';
    h4.textContent = title;

    const p = document.createElement('p');
    p.className = 'text-nimbus-text text-sm';
    p.textContent = message;

    textWrap.appendChild(h4);
    textWrap.appendChild(p);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'text-nimbus-text-muted hover:text-nimbus-text-light transition-colors duration-150';
    closeBtn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
    closeBtn.addEventListener('click', () => notification.remove());

    flex.appendChild(iconWrap);
    flex.appendChild(textWrap);
    flex.appendChild(closeBtn);
    notification.appendChild(flex);

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  private showAlert(options: AlertOptions): void {
    this.discordNotification(options.title, options.message);
  }

  /**
   * Get all current alerts
   */
  getAlerts(): AlertOptions[] {
    return [...this.alerts];
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}
