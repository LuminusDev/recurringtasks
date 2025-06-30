# Change Log

All notable changes to the "recurringtasks" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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
