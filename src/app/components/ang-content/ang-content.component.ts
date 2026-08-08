import {ChangeDetectionStrategy, Component, OnInit, computed, signal, WritableSignal, HostListener, ElementRef} from '@angular/core';
import {NimbusContentComponent} from "./nimbus-content/nimbus-content.component";
import {MemberSidebarComponent} from "./member-sidebar/member-sidebar.component";
import {ChannelSidebarComponent} from "./channel-sidebar/channel-sidebar.component";
import {DmChatComponent} from "../dm-chat/dm-chat.component";
import {Channel} from "../../models/channel/channel";
import {Server} from "../../models/server/server";
import {DmConversation} from "../../models/dm/dm-conversation";
import {AuthService} from "../../services/auth-service/auth.service";

@Component({
  selector: 'ang-content',
  templateUrl: './ang-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NimbusContentComponent,
    MemberSidebarComponent,
    ChannelSidebarComponent,
    DmChatComponent
  ],
  standalone: true
})
export class AngContentComponent implements OnInit {
  servers: WritableSignal<Server[]> = signal([]);

  selectedServer: WritableSignal<Server | null> = signal(null);
  selectedChannel: WritableSignal<Channel | null> = signal(null);
  selectedConversation: WritableSignal<DmConversation | null> = signal(null);

  readonly isHomeView = computed(() => {
    const server = this.selectedServer();
    return !server || server.serverId === 'home';
  });

  readonly currentUsername = computed(() => this.authService.currentUser()?.username || 'there');

  // Resizable layout signals
  // Note: Server sidebar is fixed at 72px, so leftSidebarWidth includes both server + channel areas
  leftSidebarWidth: WritableSignal<number> = signal(25);
  mainContentWidth: WritableSignal<number> = signal(55);
  rightSidebarWidth: WritableSignal<number> = signal(20);

  // Resize state
  private isResizing: boolean = false;
  private resizeType: 'left' | 'right' | null = null;
  private startX: number = 0;
  private startWidths: { left: number; main: number; right: number } = { left: 25, main: 55, right: 20 };

  constructor(
    private elementRef: ElementRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSavedWidths();
    // Start on Home until the user picks a real server
    this.selectedServer.set({
      serverId: 'home',
      serverName: 'Home',
      iconURL: '',
      ownerId: '',
      serverDescription: 'Home'
    });
    this.selectedChannel.set(null);
    this.selectedConversation.set(null);
  }

  handleServerChange(server: Server) {
    this.selectedServer.set(server);
    // Channel list reloads asynchronously; clear chat until the new channel arrives
    this.selectedChannel.set(null);
    this.selectedConversation.set(null);
  }

  handleChannelChange(channel: Channel | null) {
    this.selectedChannel.set(channel || null);
    if (channel) {
      this.selectedConversation.set(null);
    }
  }

  handleConversationChange(conversation: DmConversation | null) {
    this.selectedConversation.set(conversation);
    if (conversation) {
      this.selectedChannel.set(null);
    }
  }

  startResizing(event: MouseEvent, type: 'left' | 'right'): void {
    event.preventDefault();
    this.isResizing = true;
    this.resizeType = type;
    this.startX = event.clientX;

    // Store current widths
    this.startWidths = {
      left: this.leftSidebarWidth(),
      main: this.mainContentWidth(),
      right: this.rightSidebarWidth()
    };

    // Add global mouse events
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.stopResizing.bind(this));
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    // Use the component's element to get the container width
    const container = this.elementRef.nativeElement.querySelector('.flex-1.flex.overflow-hidden') as HTMLElement;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    const deltaX = event.clientX - this.startX;
    const deltaPercent = (deltaX / containerWidth) * 100;

    if (this.resizeType === 'left') {
      // Resizing between left sidebar (server + channels) and main content
      let newLeftWidth = this.startWidths.left + deltaPercent;
      let newMainWidth = this.startWidths.main - deltaPercent;

      // Constrain widths - left sidebar must be at least 20% (to accommodate fixed server sidebar + channels)
      newLeftWidth = Math.max(20, Math.min(40, newLeftWidth));
      newMainWidth = Math.max(30, Math.min(70, newMainWidth));

      // Ensure total doesn't exceed 100%
      const totalLeftMain = newLeftWidth + newMainWidth;
      if (totalLeftMain > 90) {
        newLeftWidth = 35;
        newMainWidth = 55;
      }

      this.leftSidebarWidth.set(newLeftWidth);
      this.mainContentWidth.set(newMainWidth);
    } else if (this.resizeType === 'right') {
      // Resizing between main content and right sidebar
      let newMainWidth = this.startWidths.main + deltaPercent;
      let newRightWidth = this.startWidths.right - deltaPercent;

      // Constrain widths between 15% and 35% for right sidebar
      newRightWidth = Math.max(15, Math.min(35, newRightWidth));
      newMainWidth = Math.max(30, Math.min(70, newMainWidth));

      // Ensure total doesn't exceed 100%
      const totalMainRight = newMainWidth + newRightWidth;
      if (totalMainRight > 90) {
        newMainWidth = 55;
        newRightWidth = 35;
      }

      this.mainContentWidth.set(newMainWidth);
      this.rightSidebarWidth.set(newRightWidth);
    }
  }

  private stopResizing(): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeType = null;

      // Save widths to localStorage
      this.saveWidths();

      // Remove global mouse events
      document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
      document.removeEventListener('mouseup', this.stopResizing.bind(this));
    }
  }

  private saveWidths(): void {
    const widths = {
      left: this.leftSidebarWidth(),
      main: this.mainContentWidth(),
      right: this.rightSidebarWidth()
    };
    localStorage.setItem('nimbus-layout-widths', JSON.stringify(widths));
  }

  private loadSavedWidths(): void {
    try {
      const saved =
        localStorage.getItem('nimbus-layout-widths') ||
        localStorage.getItem('discord-layout-widths');
      if (saved) {
        const widths = JSON.parse(saved);
        this.leftSidebarWidth.set(widths.left || 25);
        this.mainContentWidth.set(widths.main || 55);
        this.rightSidebarWidth.set(widths.right || 20);
      }
    } catch (error) {
      console.warn('Failed to load saved layout widths:', error);
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any): void {
    // Adjust widths if window becomes too small
    const totalWidth = this.leftSidebarWidth() + this.mainContentWidth() + this.rightSidebarWidth();
    if (totalWidth !== 100) {
      // Reset to default if corrupted
      this.leftSidebarWidth.set(25);
      this.mainContentWidth.set(55);
      this.rightSidebarWidth.set(20);
      this.saveWidths();
    }
  }
}
