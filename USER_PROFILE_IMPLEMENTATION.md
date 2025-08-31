# User Profile Implementation

This document describes the implementation of the user profile functionality in the Discord-like client application.

## Overview

The user profile feature allows users to click on any member in the server settings modal to view detailed information about that user, similar to how Discord works.

## Components

### 1. UserProfileModalComponent

**Location**: `src/app/components/user-profile-modal/`

**Purpose**: Displays detailed user information in a modal overlay

**Features**:
- User avatar with status indicator
- Basic user information (name, username, status)
- Role badges with color coding
- Member information (join date, last seen, user ID)
- Permission summary with visual indicators
- Action buttons (message, manage member)

**Inputs**:
- `member`: The Member object to display
- `isOpen`: Boolean to control modal visibility

**Outputs**:
- `closeModal`: Event emitted when modal is closed

### 2. Server Settings Modal Updates

**Location**: `src/app/components/server-settings-modal/`

**New Features**:
- Added "Users" tab to the server settings modal
- Member list with search and filtering capabilities
- Clickable member entries that open user profiles
- Status indicators and role badges

## Usage

### Opening User Profiles

1. Navigate to Server Settings
2. Click on the "Users" tab
3. Click on any member in the list
4. The user profile modal will open displaying detailed information

### Features

#### Search and Filtering
- **Search**: Type in the search box to find members by name or username
- **Role Filter**: Filter members by their assigned roles
- **Status Filter**: Filter members by their online status

#### User Profile Display
- **Avatar**: User's profile picture or fallback initial
- **Status**: Visual indicator showing online/offline/idle/do not disturb
- **Roles**: Color-coded role badges
- **Permissions**: Visual summary of user's server permissions
- **Actions**: Buttons for messaging and member management

## Styling

The user profile modal uses Discord-like styling with:
- Dark theme matching the application
- Smooth animations and transitions
- Hover effects and visual feedback
- Responsive design for mobile devices

## Technical Implementation

### State Management
- Uses Angular signals for reactive state management
- Modal state controlled by `isUserProfileModalOpen` signal
- Selected member stored in `selectedMember` signal

### Data Flow
1. User clicks on member in server settings
2. `openUserProfile()` method sets selected member and opens modal
3. UserProfileModalComponent receives member data and displays it
4. Modal can be closed via close button or escape key
5. `closeUserProfileModal()` method resets state

### Mock Data
Currently uses mock data for development. In production, this should be replaced with:
- Real API calls to fetch member information
- WebSocket updates for real-time status changes
- Proper permission checking based on user roles

## Future Enhancements

- Real-time status updates
- Direct messaging functionality
- Member management actions (kick, ban, role changes)
- Activity history and statistics
- Custom status messages
- Integration with user preferences

## Files Modified

1. `src/app/components/user-profile-modal/user-profile-modal.component.ts` - New component
2. `src/app/components/user-profile-modal/user-profile-modal.component.html` - Template
3. `src/app/components/user-profile-modal/user-profile-modal.component.scss` - Styles
4. `src/app/components/server-settings-modal/server-settings-modal.component.ts` - Added users functionality
5. `src/app/components/server-settings-modal/server-settings-modal.component.html` - Added Users tab

## Dependencies

- Angular 17+ with signals
- Tailwind CSS for styling
- Custom Discord color variables
- Member model interface
