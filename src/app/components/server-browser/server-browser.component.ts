import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Server } from '../../models/server/server';
import { ServerWebService, PublicServer as ServicePublicServer } from '../../services/server-web-service/server-web.service';
import { AlertService } from '../../services/alert-service/alert-service';

export interface PublicServer extends Server {
  memberCount: number;
  isJoined: boolean;
  tags: string[];
}

@Component({
  selector: 'app-server-browser',
  templateUrl: './server-browser.component.html',
  styleUrls: ['./server-browser.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ServerBrowserComponent implements OnInit {
  @Output() closeBrowser = new EventEmitter<void>();
  @Output() serverJoined = new EventEmitter<Server>();

  // Search and filter state
  searchQuery: WritableSignal<string> = signal('');
  selectedCategory: WritableSignal<string> = signal('all');
  selectedTags: WritableSignal<string[]> = signal([]);
  
  // Server data
  publicServers: WritableSignal<PublicServer[]> = signal([]);
  filteredServers: WritableSignal<PublicServer[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  
  // Pagination
  currentPage: WritableSignal<number> = signal(1);
  serversPerPage: number = 12;
  totalServers: WritableSignal<number> = signal(0);

  // Available categories and tags
  categories: string[] = ['all', 'gaming', 'technology', 'music', 'art', 'education', 'business', 'entertainment', 'sports', 'other'];
  availableTags: string[] = ['18+', 'verified', 'partnered', 'community', 'official', 'moderated', 'active', 'new'];

  constructor(
    private serverService: ServerWebService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadPublicServers();
  }

  /**
   * Load public servers from the backend
   */
  loadPublicServers(): void {
    this.isLoading.set(true);
    
    this.serverService.getPublicServers().subscribe({
      next: (servers: ServicePublicServer[]) => {
        // Convert service response to component format
        const convertedServers: PublicServer[] = servers.map(server => ({
          ...server,
          tags: server.tags || ['community'] // Default tag if none provided
        }));
        
        this.publicServers.set(convertedServers);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load public servers:', error);
        this.alertService.error('Failed to Load Servers', 'Unable to load public servers. Please try again later.');
        this.isLoading.set(false);
        
        // Fallback to mock data for development
        this.loadMockData();
      }
    });
  }

  /**
   * Load mock data as fallback
   */
  private loadMockData(): void {
    const mockServers: PublicServer[] = [
      {
        serverId: '1',
        serverName: 'Gaming Community Hub',
        iconURL: 'https://via.placeholder.com/64/7289da/ffffff?text=G',
        ownerId: '123',
        serverDescription: 'A vibrant community for gamers of all types. Join us for discussions, tournaments, and fun!',
        memberCount: 15420,
        isJoined: false,
        tags: ['gaming', 'community', 'verified', 'active']
      },
      {
        serverId: '2',
        serverName: 'Tech Developers',
        iconURL: 'https://via.placeholder.com/64/43b581/ffffff?text=T',
        ownerId: '456',
        serverDescription: 'Connect with fellow developers, share knowledge, and collaborate on exciting projects.',
        memberCount: 8920,
        isJoined: false,
        tags: ['technology', 'community', 'verified']
      },
      {
        serverId: '3',
        serverName: 'Music Producers',
        iconURL: 'https://via.placeholder.com/64/faa61a/ffffff?text=M',
        ownerId: '789',
        serverDescription: 'A space for music producers to share their work, get feedback, and collaborate.',
        memberCount: 5670,
        isJoined: false,
        tags: ['music', 'community', 'active']
      },
      {
        serverId: '4',
        serverName: 'Art & Design',
        iconURL: 'https://via.placeholder.com/64/ed4245/ffffff?text=A',
        ownerId: '101',
        serverDescription: 'Showcase your artwork, get inspired by others, and participate in creative challenges.',
        memberCount: 12340,
        isJoined: false,
        tags: ['art', 'community', 'verified', 'active']
      }
    ];
    
    this.publicServers.set(mockServers);
    this.applyFilters();
  }

  /**
   * Apply search and filter criteria
   */
  applyFilters(): void {
    let filtered = [...this.publicServers()];
    
    // Apply search query
    if (this.searchQuery().trim()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(server => 
        server.serverName.toLowerCase().includes(query) ||
        server.serverDescription.toLowerCase().includes(query) ||
        server.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(server => 
        server.tags.includes(this.selectedCategory())
      );
    }
    
    // Apply tag filters
    if (this.selectedTags().length > 0) {
      filtered = filtered.filter(server => 
        this.selectedTags().every(tag => server.tags.includes(tag))
      );
    }
    
    this.filteredServers.set(filtered);
    this.totalServers.set(filtered.length);
    this.currentPage.set(1);
  }

  /**
   * Toggle tag selection
   */
  toggleTag(tag: string): void {
    const currentTags = this.selectedTags();
    if (currentTags.includes(tag)) {
      this.selectedTags.set(currentTags.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...currentTags, tag]);
    }
    this.applyFilters();
  }

  /**
   * Join a server
   */
  joinServer(server: PublicServer): void {
    this.serverService.joinServer(server.serverId).subscribe({
      next: () => {
        this.alertService.success('Server Joined!', `You have successfully joined ${server.serverName}`);
        
        // Update local state
        const updatedServers = this.publicServers().map(s => 
          s.serverId === server.serverId ? { ...s, isJoined: true } : s
        );
        this.publicServers.set(updatedServers);
        this.applyFilters();
        
        // Emit event for parent component
        this.serverJoined.emit(server);
      },
      error: (error) => {
        console.error('Failed to join server:', error);
        this.alertService.error('Failed to Join Server', 'Unable to join the server. Please try again later.');
      }
    });
  }

  /**
   * Leave a server
   */
  leaveServer(server: PublicServer): void {
    this.serverService.leaveServer(server.serverId).subscribe({
      next: () => {
        this.alertService.info('Server Left', `You have left ${server.serverName}`);
        
        // Update local state
        const updatedServers = this.publicServers().map(s => 
          s.serverId === server.serverId ? { ...s, isJoined: false } : s
        );
        this.publicServers.set(updatedServers);
        this.applyFilters();
      },
      error: (error) => {
        console.error('Failed to leave server:', error);
        this.alertService.error('Failed to Leave Server', 'Unable to leave the server. Please try again later.');
      }
    });
  }

  /**
   * Handle search input
   */
  onSearchInput(): void {
    this.applyFilters();
  }

  /**
   * Handle category selection
   */
  onCategoryChange(): void {
    this.applyFilters();
  }

  /**
   * Close the server browser
   */
  close(): void {
    this.closeBrowser.emit();
  }

  /**
   * Get paginated servers for current page
   */
  get paginatedServers(): PublicServer[] {
    const startIndex = (this.currentPage() - 1) * this.serversPerPage;
    const endIndex = startIndex + this.serversPerPage;
    return this.filteredServers().slice(startIndex, endIndex);
  }

  /**
   * Get total pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalServers() / this.serversPerPage);
  }

  /**
   * Get array of page numbers for pagination
   */
  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
    }
  }

  /**
   * Format member count for display
   */
  formatMemberCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }
}
