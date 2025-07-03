# Change Log

All notable changes to the "recurringtasks" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.1.0] - 2024-12-19

### Added

- **Smart Task Notifications System**

  - **Intelligent Notification Management**: Automatic notifications for due and overdue tasks with smart throttling
  - **Configurable Notification Frequency**: Choose between immediate, hourly, daily, or disabled notifications
  - **Notification State Tracking**: Persistent tracking of notification states per task to prevent spam
  - **Smart Snooze Functionality**: Temporarily suppress notifications with duration based on frequency setting
  - **Notification Actions**: Quick actions from notifications including validate task, show details, snooze, or disable
  - **Overdue-Only Mode**: Option to only show notifications for overdue tasks, not tasks due today
  - **Maximum Notifications Per Task**: Prevent notification spam by limiting notifications per task
  - **Notification Reactivation**: Manually reactivate notifications for specific tasks from task details view
  - **Global Notification Controls**: Enable/disable all notifications globally with easy settings access
  - **Real-time Notification Status**: View current notification state for each task in the details view

- **Calendar View Integration**

  - **Monthly Calendar View**: Visual calendar showing all tasks organized by due date
  - **Calendar Navigation**: Navigate between months with previous/next buttons and "Go to Today" functionality
  - **Task Visualization**: Tasks displayed as colored dots on calendar dates with status indicators
  - **Interactive Calendar**: Click on task dots to view task details or validate tasks directly
  - **Responsive Design**: Calendar adapts to different sidebar widths with optimized layouts
  - **First Day of Week Configuration**: Customizable first day of week (Sunday/Monday/Auto based on locale)
  - **Calendar Refresh**: Manual refresh button to update calendar view
  - **Task Status Colors**: Visual indicators for overdue (red), due soon (yellow), and normal (blue) tasks
  - **Calendar Integration**: Seamless integration with existing task management features

- **Enhanced Task Management**

  - **Notification Status Display**: View notification state and history in task details view
  - **Reactivate Notifications**: One-click reactivation of notifications for individual tasks
  - **Notification Statistics**: Track notification counts and settings in task details
  - **Improved Task Details**: Enhanced task details view with notification information
  - **Better Visual Feedback**: Clear indication of notification states and limits

- **Configuration Enhancements**

  - **Notification Settings**: Comprehensive notification configuration options
  - **Calendar Preferences**: First day of week setting for calendar display
  - **Settings Integration**: All new settings integrated into VS Code's settings system
  - **Global and Workspace Settings**: Support for both global and workspace-specific configurations

- **User Experience Improvements**

  - **Command Palette Integration**: New commands for notification management and calendar access
  - **Context Menu Actions**: Right-click options for notification reactivation
  - **Keyboard Shortcuts**: Quick access to notification and calendar features
  - **Localization Support**: Full French translation for all new features
  - **Accessibility**: Improved accessibility with proper ARIA labels and keyboard navigation

- **Internationalization**

  - **French Language Support**: Complete French localization (l10n) for all new features

### Technical Improvements

- **Notification Manager**: New dedicated class for handling all notification logic
- **Calendar Provider**: New webview provider for calendar functionality
- **Enhanced Error Handling**: Better error handling for notification and calendar features
- **Performance Optimizations**: Efficient notification checking and calendar rendering
- **Code Organization**: Improved code structure with dedicated managers and providers

## [1.0.0] - 2024-12-19

### Added

- **Core Task Management**

  - Create recurring tasks with custom periodicity (days, weeks, months, years, or one-shot)
  - Visual task management interface in VS Code sidebar with Activity Bar integration
  - Smart task sorting by due date with overdue tasks prioritized
  - Task validation with automatic next due date calculation
  - Task archiving and unarchiving functionality
  - Persistent storage of tasks across VS Code sessions

- **Task Details & Editing**

  - Comprehensive task details view in webview panel
  - Inline editing of task properties (title, description, periodicity)
  - Complete comment history with timestamps
  - Reusable webview panel for smooth task switching

- **Calendar Integration**

  - Create calendar meetings directly from tasks
  - Support for Outlook Web and Google Calendar
  - Automatic pre-filling of meeting details (title, description, date/time)
  - Configurable preferred calendar provider
  - Keyboard shortcut (Ctrl+Shift+M) for quick meeting creation

- **JIRA Integration**

  - Create JIRA issues from tasks with automatic detail population
  - Configurable JIRA connection settings (URL, email, API token)
  - Project and issue type selection
  - Automatic issue assignment
  - Connection testing functionality
  - Keyboard shortcut (Ctrl+Shift+J) for quick JIRA issue creation

- **Data Management**

  - Export tasks to JSON format with complete metadata
  - Import tasks from JSON files with validation
  - Non-destructive import with duplicate ID handling
  - Data migration support for old periodicity formats

- **User Experience**

  - Rich visual interface with colored icons
  - Smart time display in human-readable format
  - Visual status indicators for overdue, due soon, and normal tasks
  - Contextual menus and command palette integration
  - Progress indicators for long-running operations

- **Configuration**
  - Comprehensive settings for calendar preferences
  - JIRA integration configuration options
  - Global and workspace-specific settings support

### Technical Features

- TypeScript implementation with modern ES6+ features
- VS Code Extension API integration
- Webview-based user interfaces
- Secure storage management
- Error handling and validation
- Comprehensive testing framework

## [Unreleased]

- Future enhancements and bug fixes
