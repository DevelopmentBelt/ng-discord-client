import { ChangeDetectionStrategy, Component, input, output, signal, WritableSignal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
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

@Component({
  selector: 'app-gif-picker',
  templateUrl: './gif-picker.component.html',
  styleUrls: ['./gif-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GifPickerComponent implements OnInit, OnDestroy {
  // Input Signals
  isOpen = input.required<boolean>();
  position = input<'top' | 'bottom'>('bottom');
  
  // Output Signals
  gifSelected = output<GifResult>();
  closed = output<void>();

  // Internal state
  searchQuery: WritableSignal<string> = signal('');
  selectedCategory: WritableSignal<string> = signal('trending');
  searchResults: WritableSignal<GifResult[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  searchDebounceTimer: any;
  
  // GIF data
  gifCategories: WritableSignal<GifCategory[]> = signal([]);
  trendingGifs: WritableSignal<GifResult[]> = signal([]);

  // Computed values
  filteredCategories = computed(() => {
    const query = this.searchQuery();
    if (!query.trim()) {
      return this.gifCategories();
    }
    return this.gifCategories().filter(cat => 
      cat.name.toLowerCase().includes(query.toLowerCase()) ||
      cat.searchTerm.toLowerCase().includes(query.toLowerCase())
    );
  });

  // Tenor API configuration
  private readonly TENOR_API_KEY = 'AIzaSyCqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXq'; // You'll need to replace this with your actual API key
  private readonly TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

  constructor(private http: HttpClient) {
    // Debug effect to monitor isOpen changes
    effect(() => {
      const isOpenValue = this.isOpen();
      console.log('🔍 GifPicker isOpen changed to:', isOpenValue);
    });
  }

  ngOnInit(): void {
    console.log('🎬 GifPickerComponent initialized');
    console.log('Initial isOpen value:', this.isOpen());
    console.log('Initial position value:', this.position());
    this.initializeGifCategories();
    this.loadTrendingGifs();
    this.setupKeyboardListeners();
  }

  ngOnDestroy(): void {
    this.removeKeyboardListeners();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  private initializeGifCategories(): void {
    console.log('🎬 Initializing GIF categories...');
    const categories: GifCategory[] = [
      {
        id: 'trending',
        name: 'Trending',
        searchTerm: 'trending',
        previewUrl: 'https://via.placeholder.com/80x80/7289da/ffffff?text=🔥'
      },
      {
        id: 'reactions',
        name: 'Reactions',
        searchTerm: 'reactions',
        previewUrl: 'https://via.placeholder.com/80x80/faa61a/ffffff?text=😄'
      },
      {
        id: 'animals',
        name: 'Animals',
        searchTerm: 'cute animals',
        previewUrl: 'https://via.placeholder.com/80x80/43b581/ffffff?text=🐶'
      },
      {
        id: 'gaming',
        name: 'Gaming',
        searchTerm: 'gaming',
        previewUrl: 'https://via.placeholder.com/80x80/f04747/ffffff?text=🎮'
      },
      {
        id: 'anime',
        name: 'Anime',
        searchTerm: 'anime',
        previewUrl: 'https://via.placeholder.com/80x80/7289da/ffffff?text=🌸'
      },
      {
        id: 'sports',
        name: 'Sports',
        searchTerm: 'sports',
        previewUrl: 'https://via.placeholder.com/80x80/43b581/ffffff?text=⚽'
      },
      {
        id: 'memes',
        name: 'Memes',
        searchTerm: 'memes',
        previewUrl: 'https://via.placeholder.com/80x80/faa61a/ffffff?text=😂'
      },
      {
        id: 'nature',
        name: 'Nature',
        searchTerm: 'nature',
        previewUrl: 'https://via.placeholder.com/80x80/43b581/ffffff?text=🌿'
      }
    ];

    this.gifCategories.set(categories);
    console.log('🎬 GIF categories initialized:', categories.length, 'categories');
  }

  private async loadTrendingGifs(): Promise<void> {
    try {
      this.isLoading.set(true);
      const gifs = await this.searchTenorGifs('trending', 20);
      this.trendingGifs.set(gifs);
      console.log('🎬 Trending GIFs loaded:', gifs.length, 'GIFs');
    } catch (error) {
      console.error('Error loading trending GIFs:', error);
      // Fallback to placeholder GIFs
      this.trendingGifs.set(this.getPlaceholderGifs());
    } finally {
      this.isLoading.set(false);
    }
  }

  private async searchTenorGifs(query: string, limit: number = 20): Promise<GifResult[]> {
    try {
      const params = new HttpParams()
        .set('q', query)
        .set('key', this.TENOR_API_KEY)
        .set('limit', limit.toString())
        .set('media_filter', 'gif')
        .set('contentfilter', 'medium');

      const response: any = await this.http.get(`${this.TENOR_BASE_URL}/search`, { params }).toPromise();
      
      if (response && response.results) {
        return response.results.map((gif: any) => ({
          id: gif.id,
          title: gif.title || 'GIF',
          url: gif.media_formats?.gif?.url || gif.media_formats?.mediumgif?.url || '',
          previewUrl: gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || '',
          width: gif.media_formats?.gif?.dims?.[0] || 200,
          height: gif.media_formats?.gif?.dims?.[1] || 200,
          aspectRatio: (gif.media_formats?.gif?.dims?.[0] || 200) / (gif.media_formats?.gif?.dims?.[1] || 200)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching Tenor GIFs:', error);
      // Return placeholder GIFs on error
      return this.getPlaceholderGifs();
    }
  }

  private getPlaceholderGifs(): GifResult[] {
    // Return placeholder GIFs when API is not available
    return [
      {
        id: 'placeholder1',
        title: 'Sample GIF 1',
        url: 'https://via.placeholder.com/200x200/7289da/ffffff?text=GIF+1',
        previewUrl: 'https://via.placeholder.com/200x200/7289da/ffffff?text=GIF+1',
        width: 200,
        height: 200,
        aspectRatio: 1
      },
      {
        id: 'placeholder2',
        title: 'Sample GIF 2',
        url: 'https://via.placeholder.com/200x200/faa61a/ffffff?text=GIF+2',
        previewUrl: 'https://via.placeholder.com/200x200/faa61a/ffffff?text=GIF+2',
        width: 200,
        height: 200,
        aspectRatio: 1
      },
      {
        id: 'placeholder3',
        title: 'Sample GIF 3',
        url: 'https://via.placeholder.com/200x200/43b581/ffffff?text=GIF+3',
        previewUrl: 'https://via.placeholder.com/200x200/43b581/ffffff?text=GIF+3',
        width: 200,
        height: 200,
        aspectRatio: 1
      }
    ];
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    
    // Debounce search to avoid too many API calls
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    this.searchDebounceTimer = setTimeout(() => {
      this.performSearch(query);
    }, 500);
  }

  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }

    try {
      this.isLoading.set(true);
      const gifs = await this.searchTenorGifs(query, 20);
      this.searchResults.set(gifs);
      console.log('🎬 Search results:', gifs.length, 'GIFs');
    } catch (error) {
      console.error('Error performing search:', error);
      this.searchResults.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  onCategorySelect(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    const category = this.gifCategories().find(cat => cat.id === categoryId);
    if (category) {
      this.performSearch(category.searchTerm);
    }
  }

  onGifSelect(gif: GifResult): void {
    console.log('🎬 GIF selected in picker:', gif);
    
    // Add visual feedback that GIF was selected
    this.showGifSelectionFeedback(gif);
    
    // Emit the selected GIF
    this.gifSelected.emit(gif);
  }

  private showGifSelectionFeedback(gif: GifResult): void {
    // Find the GIF element and add a brief highlight effect
    const gifElements = document.querySelectorAll('.gif-item');
    for (let i = 0; i < gifElements.length; i++) {
      const element = gifElements[i];
      if (element.getAttribute('data-gif-id') === gif.id) {
        element.classList.add('gif-selected-feedback');
        setTimeout(() => {
          element.classList.remove('gif-selected-feedback');
        }, 300);
        break;
      }
    }
  }

  onClose(): void {
    console.log('🔒 Closing GIF picker');
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
        // Select first GIF in current results
        const currentGifs = this.searchQuery() ? this.searchResults() : this.trendingGifs();
        if (currentGifs.length > 0) {
          this.onGifSelect(currentGifs[0]);
        }
        break;
    }
  }

  getCurrentGifs(): GifResult[] {
    const query = this.searchQuery();
    if (query.trim()) {
      return this.searchResults();
    }
    return this.trendingGifs();
  }
}
