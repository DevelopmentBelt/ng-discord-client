# Server Browser Implementation

## Overview
The server browser functionality allows users to discover and join public servers through a searchable interface accessible from the sidebar.

## Features

### 1. Server Discovery
- Browse public servers with detailed information
- Search servers by name, description, or tags
- Filter by categories and tags
- Paginated results for better performance

### 2. Server Information Display
- Server name and description
- Member count
- Server icon
- Tags and categories
- Join/Leave status

### 3. Search and Filtering
- Real-time search as you type
- Category-based filtering (gaming, technology, music, art, etc.)
- Tag-based filtering (18+, verified, partnered, community, etc.)
- Combined search and filter functionality

### 4. Server Actions
- Join public servers
- Leave servers you've joined
- Real-time status updates

## Components

### ServerBrowserComponent
- **Location**: `src/app/components/server-browser/`
- **Purpose**: Main component for browsing and discovering servers
- **Features**: Search, filtering, pagination, server actions

### ServerWebService
- **Location**: `src/app/services/server-web-service/`
- **Purpose**: Handles all server-related API calls
- **Endpoints**: Get public servers, join/leave servers, create servers

## Backend API Endpoints

### GET /api/servers/public/
Returns a list of public servers with member counts and basic information.

**Response Format:**
```json
[
  {
    "serverId": "1",
    "serverName": "Gaming Community Hub",
    "serverDescription": "A vibrant community for gamers...",
    "iconURL": "https://example.com/icon.png",
    "ownerId": "123",
    "memberCount": 15420,
    "isJoined": false,
    "tags": ["gaming", "community", "verified"]
  }
]
```

### POST /api/servers/{serverId}/join
Allows a user to join a server.

**Request Body:** Empty
**Response:** Success/error message

### DELETE /api/servers/{serverId}/leave
Allows a user to leave a server.

**Request Body:** Empty
**Response:** Success/error message

## Database Changes

### New Columns Added
- `servers.is_public` - Boolean flag for public/private servers
- `members.member_id` - Primary key for members table
- `members.joined_at` - Timestamp when user joined server

### Database Update Script
Run `backend/update_DB.sql` to add the required columns and sample data.

## Usage

### Accessing the Server Browser
1. Click the search icon (magnifying glass) in the sidebar
2. The server browser modal will open
3. Use search and filters to find servers
4. Click "Join Server" to join a server
5. Click "Leave Server" to leave a server you've joined

### Search Tips
- Type in the search bar to find servers by name or description
- Use category dropdown to filter by server type
- Click on tags to filter by specific attributes
- Combine multiple filters for precise results

## Styling

The component uses Tailwind CSS classes with custom Discord-like styling:
- Dark theme matching Discord's design
- Hover effects and smooth transitions
- Responsive grid layout
- Custom scrollbars and focus states

## Future Enhancements

### Planned Features
- Server recommendations based on user interests
- Server rating and review system
- Advanced filtering options
- Server invitation system
- Server discovery analytics

### Technical Improvements
- Real-time updates using WebSocket
- Server caching for better performance
- Advanced search algorithms
- Server moderation tools

## Troubleshooting

### Common Issues

1. **No servers displayed**
   - Check if the backend is running
   - Verify database has public servers
   - Check browser console for errors

2. **Can't join servers**
   - Ensure user is authenticated
   - Check backend logs for errors
   - Verify database permissions

3. **Search not working**
   - Check if search input is properly bound
   - Verify filter logic in component
   - Check for JavaScript errors

### Debug Mode
Enable console logging by checking the browser's developer tools for detailed error information.

## Testing

### Manual Testing
1. Open the application
2. Click the search icon in sidebar
3. Test search functionality
4. Test filtering options
5. Test join/leave functionality
6. Test pagination

### Automated Testing
- Unit tests for component logic
- Integration tests for API calls
- E2E tests for user workflows

## Contributing

When adding new features to the server browser:
1. Update this documentation
2. Add appropriate error handling
3. Include loading states
4. Test on different screen sizes
5. Follow the existing code style
