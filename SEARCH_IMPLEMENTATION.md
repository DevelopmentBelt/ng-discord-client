# Search Functionality Implementation

## Overview
The search functionality has been implemented to allow users to search for messages within the current channel or across the entire server. The search includes both frontend and backend integration capabilities.

## Features

### 🔍 **Search Capabilities**
- **Channel-specific search**: Search within the current channel only
- **Server-wide search**: Search across all channels in the server
- **Real-time results**: Instant search results with highlighting
- **Pagination**: Load more results as needed
- **Advanced options**: Case-sensitive search, search scope selection

### 🎨 **User Interface**
- **Discord-like design**: Matches the overall application styling
- **Modal overlay**: Full-screen search interface
- **Keyboard shortcuts**: Enter to search, Esc to close
- **Responsive design**: Works on all screen sizes
- **Loading states**: Visual feedback during search operations

### 🔧 **Technical Implementation**

#### Frontend Components
1. **SearchComponent** (`src/app/components/search/`)
   - Handles search input and results display
   - Manages search state and pagination
   - Provides search options and filters

2. **MessageWebService** (Updated)
   - Added `searchMessages()` method for channel-specific search
   - Added `searchServerMessages()` method for server-wide search
   - Supports pagination with limit/offset parameters

3. **AngcordContentComponent** (Updated)
   - Integrated search button functionality
   - Manages search component visibility
   - Handles search result selection

#### Backend API Endpoints
The search functionality expects the following backend endpoints:

```php
// Search in specific channel
GET /api/search/{serverId}/{channelId}?q={query}&limit={limit}&offset={offset}

// Search across entire server
GET /api/search/{serverId}?q={query}&limit={limit}&offset={offset}
```

**Parameters:**
- `q`: Search query string
- `limit`: Maximum number of results (default: 50)
- `offset`: Number of results to skip for pagination

**Response:**
```json
[
  {
    "id": "message_id",
    "text": "Message content",
    "author": {
      "userId": "user_id",
      "username": "username"
    },
    "postedTimestamp": "2024-01-01T12:00:00Z",
    "channelId": "channel_id"
  }
]
```

## Usage

### For Users
1. **Click the search icon** in the channel header
2. **Enter search terms** in the search input
3. **Choose search scope**: Current channel only or entire server
4. **View results** with highlighted search terms
5. **Click on results** to navigate to specific messages
6. **Use keyboard shortcuts**: Enter to search, Esc to close

### For Developers

#### Adding Search to a Component
```typescript
import { SearchComponent } from '../search/search.component';

@Component({
  // ... component configuration
  imports: [SearchComponent]
})
export class YourComponent {
  showSearch = false;
  
  openSearch() {
    this.showSearch = true;
  }
  
  closeSearch() {
    this.showSearch = false;
  }
}
```

#### Using the Search Service
```typescript
import { MessageWebService } from '../services/message-web-service/message-web.service';

constructor(private messageService: MessageWebService) {}

searchMessages(query: string) {
  this.messageService.searchMessages(serverId, channelId, query)
    .subscribe(results => {
      console.log('Search results:', results);
    });
}
```

## Backend Implementation

### PHP Example (Laravel/Slim)
```php
// Search in specific channel
$app->get('/api/search/{serverId}/{channelId}', function (Request $request, Response $response, array $args) {
    $query = $request->getQueryParams()['q'] ?? '';
    $limit = (int)($request->getQueryParams()['limit'] ?? 50);
    $offset = (int)($request->getQueryParams()['offset'] ?? 0);
    
    $sql = "SELECT m.*, u.username, u.userId 
            FROM messages m 
            JOIN users u ON m.authorId = u.userId 
            WHERE m.channelId = ? 
            AND m.text LIKE ? 
            ORDER BY m.postedTimestamp DESC 
            LIMIT ? OFFSET ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $args['channelId'],
        "%{$query}%",
        $limit,
        $offset
    ]);
    
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $response->withJson($results);
});

// Search across entire server
$app->get('/api/search/{serverId}', function (Request $request, Response $response, array $args) {
    $query = $request->getQueryParams()['q'] ?? '';
    $limit = (int)($request->getQueryParams()['limit'] ?? 50);
    $offset = (int)($request->getQueryParams()['offset'] ?? 0);
    
    $sql = "SELECT m.*, u.username, u.userId, c.channelName 
            FROM messages m 
            JOIN users u ON m.authorId = u.userId 
            JOIN channels c ON m.channelId = c.channelId 
            WHERE c.serverId = ? 
            AND m.text LIKE ? 
            ORDER BY m.postedTimestamp DESC 
            LIMIT ? OFFSET ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $args['serverId'],
        "%{$query}%",
        $limit,
        $offset
    ]);
    
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $response->withJson($results);
});
```

### Database Considerations
- **Indexes**: Add indexes on `messages.text`, `messages.channelId`, `messages.postedTimestamp`
- **Full-text search**: Consider using MySQL FULLTEXT or PostgreSQL tsvector for better performance
- **Caching**: Implement Redis caching for frequent search queries

## Future Enhancements

### Planned Features
1. **Advanced filters**: Date range, author, file attachments
2. **Search history**: Remember recent searches
3. **Saved searches**: Bookmark frequently used searches
4. **Search analytics**: Track popular search terms
5. **Real-time search**: Live search as you type

### Performance Optimizations
1. **Debounced search**: Reduce API calls while typing
2. **Result caching**: Cache search results temporarily
3. **Lazy loading**: Load results progressively
4. **Search suggestions**: Auto-complete for common terms

## Testing

### Frontend Testing
```bash
# Run unit tests
ng test --include=**/search/**/*.spec.ts

# Run e2e tests
ng e2e
```

### Backend Testing
```bash
# Test search endpoints
curl "http://localhost:8000/api/search/server123/channel456?q=hello&limit=10"
curl "http://localhost:8000/api/search/server123?q=world&limit=20"
```

## Troubleshooting

### Common Issues
1. **Search not working**: Check backend API endpoints and database connectivity
2. **No results**: Verify search query format and database content
3. **Performance issues**: Check database indexes and query optimization
4. **UI not responsive**: Ensure proper component imports and Angular configuration

### Debug Mode
Enable debug logging in the search component:
```typescript
// In search.component.ts
console.log('Search query:', query);
console.log('Search results:', results);
```

## Contributing
When adding new search features:
1. Update the search interface in `search.component.html`
2. Add corresponding methods in `search.component.ts`
3. Update the backend API endpoints
4. Add appropriate tests
5. Update this documentation

## License
This search functionality is part of the Angcord Discord client application.
