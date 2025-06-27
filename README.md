# RecurringTasks Extension

A VS Code extension for managing recurring tasks with periodicity, validation, and time tracking.

## Features

- **Recurring Task Management**: Create tasks that repeat at specified intervals (days, weeks, months, years)
- **Activity Bar Integration**: Dedicated icon in the VS Code Activity bar for easy access
- **Visual Task View**: See all your tasks in the VS Code sidebar with time remaining indicators
- **Smart Task Sorting**: Tasks are automatically sorted by due date with overdue tasks at the top
- **Task Details View**: Click on any task to view full details and comments in a webview panel
- **Colored Icons**: Rich visual experience with colored icons throughout the interface
- **Task Validation**: Mark tasks as complete with comments and automatically calculate next due date
- **Smart Time Display**: Shows time remaining in human-readable format (e.g., "Due in 3 days", "Overdue by 2 days")
- **Visual Status Indicators**: Different icons for overdue, due soon, and normal tasks
- **Persistent Storage**: Tasks are saved and persist across VS Code sessions

## How to Use

### Accessing Tasks

- Click the **Tasklist icon** (📋) in the VS Code Activity bar to open the Recurring Tasks view
- Alternatively, find "Recurring Tasks" in the Explorer sidebar

### Viewing Task Details

- **Click on any task** in the sidebar to open a detailed view in the main editor area
- **Reusable View**: The same panel is reused when switching between tasks, providing a smooth experience
- The details view shows:
  - Task title and description
  - Current status and time remaining
  - Periodicity information
  - Start date and next due date
  - Complete comment history with timestamps

### Adding a Task

1. Click the "+" button in the "Recurring Tasks" view
2. Enter the task title and description
3. Specify the periodicity (e.g., every 7 days, every 2 weeks)
4. Set the start date (defaults to today)

### Validating a Task

1. Right-click on a task in the sidebar
2. Select "Validate Task"
3. Add an optional comment
4. The task will be marked as complete and the next due date will be calculated automatically

### Deleting a Task

1. Right-click on a task in the sidebar
2. Select "Delete Task"
3. Confirm the deletion

### Refreshing the View

- Click the refresh button in the sidebar header to manually refresh the task list

## Task Status Indicators

- 🔴 **Red Error Icon**: Task is overdue
- 🟡 **Yellow Warning Icon**: Task is due within the next 3 days
- ✅ **Green Task Icon**: Task is due normally

## Time Display Format

- "Overdue by X days" - for past due tasks
- "Due today" - for tasks due today
- "Due tomorrow" - for tasks due tomorrow
- "Due in X days" - for tasks due within a week
- "Due in X weeks" - for tasks due in more than a week

## Requirements

- VS Code version 1.101.0 or higher

## Extension Settings

This extension does not currently add any VS Code settings.

## Known Issues

None at this time.

## Release Notes

### 1.0.0

Initial release of RecurringTasks extension with the following features:

- Create recurring tasks with custom periodicity
- Visual task management in VS Code sidebar
- Task validation with automatic next due date calculation
- Persistent storage of tasks
- Smart time remaining display
- Visual status indicators for task urgency

---

## Development

This extension is built with TypeScript and uses VS Code's extension API.

### Building the Extension

```bash
yarn compile
```

### Running in Development

1. Open the project in VS Code
2. Press F5 to run the extension in a new Extension Development Host window
3. The extension will be loaded and you can test all features

## For more information

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

**Enjoy managing your recurring tasks!**
