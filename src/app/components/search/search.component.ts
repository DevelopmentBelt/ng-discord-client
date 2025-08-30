import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Message } from '../../models/message/message';
import { MessageWebService } from '../../services/message-web-service/message-web.service';
import { AlertService } from '../../services/alert-service/alert-service';
import * as moment from 'moment';

export interface SearchResult {
  message: Message;
  highlightText: string;
  channelName: string;
  serverName: string;
}

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SearchComponent implements OnInit {
  // Input Signals
  serverId = input<string>('');
  channelId = input<string>('');
  serverName = input<string>('');
  channelName = input<string>('');

  // Output Signals
  closeSearch = output<void>();
  messageSelected = output<Message>();

  // Search state
  searchQuery: WritableSignal<string> = signal('');
  searchResults: WritableSignal<SearchResult[]> = signal([]);
  isSearching: WritableSignal<boolean> = signal(false);
  hasSearched: WritableSignal<boolean> = signal(false);
  
  // Pagination
  currentPage: WritableSignal<number> = signal(1);
  resultsPerPage: number = 20;
  totalResults: WritableSignal<number> = signal(0);

  // Search options
  searchInChannel: WritableSignal<boolean> = signal(true);
  includeAttachments: WritableSignal<boolean> = signal(true);
  caseSensitive: WritableSignal<boolean> = signal(false);

  constructor(
    private messageService: MessageWebService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    // Focus on search input when component loads
    setTimeout(() => {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  /**
   * Perform search based on current query and options
   */
  performSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) {
      this.alertService.warning('Search Query Required', 'Please enter a search term to search for messages.');
      return;
    }

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.currentPage.set(1);

    const searchMethod = this.searchInChannel() 
      ? this.messageService.searchMessages(this.serverId(), this.channelId(), query, this.resultsPerPage, 0)
      : this.messageService.searchServerMessages(this.serverId(), query, this.resultsPerPage, 0);

    searchMethod.subscribe({
      next: (results) => {
        this.processSearchResults(results, query);
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Search error:', error);
        this.alertService.error('Search Failed', 'An error occurred while searching. Please try again.');
        this.isSearching.set(false);
      }
    });
  }

  /**
   * Process and format search results
   */
  private processSearchResults(results: Message[], query: string): void {
    const processedResults: SearchResult[] = results.map(message => ({
      message,
      highlightText: this.highlightSearchTerms(message.text, query),
      channelName: this.channelName(),
      serverName: this.serverName()
    }));

    this.searchResults.set(processedResults);
    this.totalResults.set(processedResults.length);
  }

  /**
   * Highlight search terms in text
   */
  private highlightSearchTerms(text: string, query: string): string {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query})`, this.caseSensitive() ? 'g' : 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Load more results for pagination
   */
  loadMoreResults(): void {
    const query = this.searchQuery().trim();
    if (!query) return;

    const nextPage = this.currentPage() + 1;
    const offset = (nextPage - 1) * this.resultsPerPage;

    this.isSearching.set(true);

    const searchMethod = this.searchInChannel() 
      ? this.messageService.searchMessages(this.serverId(), this.channelId(), query, this.resultsPerPage, offset)
      : this.messageService.searchServerMessages(this.serverId(), query, this.resultsPerPage, offset);

    searchMethod.subscribe({
      next: (results) => {
        const newResults = results.map(message => ({
          message,
          highlightText: this.highlightSearchTerms(message.text, query),
          channelName: this.channelName(),
          serverName: this.serverName()
        }));

        this.searchResults.set([...this.searchResults(), ...newResults]);
        this.currentPage.set(nextPage);
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Error loading more results:', error);
        this.alertService.error('Load Failed', 'Failed to load more results. Please try again.');
        this.isSearching.set(false);
      }
    });
  }

  /**
   * Clear search and reset state
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.currentPage.set(1);
    this.totalResults.set(0);
  }

  /**
   * Close search modal
   */
  close(): void {
    this.closeSearch.emit();
  }

  /**
   * Select a message from search results
   */
  selectMessage(message: Message): void {
    this.messageSelected.emit(message);
    this.close();
  }

  /**
   * Get formatted timestamp for message
   */
  getFormattedTimestamp(timestamp: string): string {
    return moment(timestamp).format('MMM D, YYYY [at] h:mm A');
  }

  /**
   * Check if there are more results to load
   */
  get hasMoreResults(): boolean {
    return this.searchResults().length < this.totalResults();
  }

  /**
   * Get current page results
   */
  get currentPageResults(): SearchResult[] {
    const startIndex = (this.currentPage() - 1) * this.resultsPerPage;
    const endIndex = startIndex + this.resultsPerPage;
    return this.searchResults().slice(startIndex, endIndex);
  }

  /**
   * Handle search input keydown events
   */
  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.performSearch();
    } else if (event.key === 'Escape') {
      this.close();
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: any): string {
    if (!timestamp) return '';
    return moment(timestamp).format('MMM D, YYYY h:mm A');
  }
}
