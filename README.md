# RecurringTasks Extension

A VS Code extension for managing recurring tasks with periodicity, validation, and time tracking.

## Features

- **Recurring Task Management**: Create tasks that repeat at specified intervals (days, weeks, months, years)
- **Activity Bar Integration**: Dedicated icon in the VS Code Activity bar for easy access
- **Visual Task View**: See all your tasks in the VS Code sidebar with time remaining indicators
- **Smart Task Sorting**: Tasks are automatically sorted by due date with overdue tasks at the top
- **Task Details View**: Click on any task to view full details and comments in a webview panel
- **Webview Task Creation**: Create new tasks using a modern webview form interface
- **Inline Task Editing**: Edit task properties (title, description, periodicity) directly from the task details view
- **Task Validation**: Mark tasks as complete with comments and automatically calculate next due date
- **Calendar Meeting Creation**: Create calendar meetings from tasks with automatic pre-filling of details
- **Multi-Calendar Support**: Choose between Outlook Web and Google Calendar for meeting creation
- **Calendar Preferences**: Set your preferred calendar provider to avoid repeated prompts
- **JIRA Integration**: Create JIRA issues directly from tasks with automatic population of task details
- **JIRA Configuration**: Easy setup with your JIRA instance URL, email, and API token
- **Project and Issue Type Selection**: Choose from available projects and issue types when creating JIRA issues
- **Colored Icons**: Rich visual experience with colored icons throughout the interface
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
  - Creation date and next due date
  - Complete comment history with timestamps

### Adding a Task

1. Click the "+" button in the "Recurring Tasks" view
2. Fill out the webview form with:
   - Task title
   - Description
   - Periodicity (value and unit: days, weeks, months, years, or "One Shot")
   - Next due date and time
3. Click "Create Task" to save

**One Shot Tasks**: Tasks with "One Shot" periodicity have no recurrence and are automatically archived when validated. These are perfect for one-time tasks that don't need to repeat.

### Validating a Task

1. Right-click on a task in the sidebar
2. Select "Validate Task"
3. Add an optional comment
4. The task will be marked as complete and the next due date will be calculated automatically
   - **One Shot tasks**: Will be automatically archived after validation since they don't recur

### Editing Tasks

You can edit task properties directly from the task details view:

1. **Open Task Details**: Click on any task in the sidebar to open the details view
2. **Edit Title**: Click the edit icon next to the task title
3. **Edit Description**: Click the edit icon next to the task description
4. **Edit Periodicity**: Click the edit icon next to the periodicity value
5. **Validate Task**: Use the "Validate Task" section at the bottom to mark the task as complete

All changes are saved automatically and the task list will refresh to show the updates.

### Creating Calendar Meetings

You can create calendar meetings directly from your tasks with pre-filled details:

1. **Click the calendar icon** (📅) next to the task
2. **Choose your calendar provider** (if not set as default):
   - **Outlook Web**: Opens in browser with task details pre-filled
   - **Google Calendar**: Opens Google Calendar with task details pre-filled
3. **Meeting details are automatically populated**:
   - **Subject**: Task title
   - **Description**: Task description
   - **Date/Time**: Task due date
   - **Duration**: 1 hour (Google Calendar)

#### Setting Your Preferred Calendar

To avoid the calendar selection prompt every time:

1. **Method 1 - Command Palette**:

   - Press `Ctrl+Shift+P`
   - Type "Recurring Tasks: Set Preferred Calendar"
   - Choose your preferred calendar provider

2. **Method 2 - VS Code Settings**:

   - Open Settings (`Ctrl+,`)
   - Search for "Recurring Tasks"
   - Find "Preferred Calendar" setting
   - Choose: "Outlook Web", "Google Calendar", or "Ask each time"

3. **Method 3 - Settings.json**:
   ```json
   {
     "recurringTasks.preferredCalendar": "Google Calendar"
   }
   ```

#### Keyboard Shortcut

- **Create Meeting**: `Ctrl+Shift+M` (when in the tasks view)
  - Creates a meeting for the first available task if no specific task is selected

### Creating JIRA Issues

You can create JIRA issues directly from your tasks with all task details automatically populated:

1. **Click the JIRA icon** (🐛) next to the task in the sidebar, or
2. **Open Task Details** and click "Create JIRA Issue" in the JIRA Integration section
3. **Choose your project and issue type** (if you have multiple options)
4. **The JIRA issue will be created** with:
   - **Summary**: Task title
   - **Description**: Task description plus recurring task details
   - **Task metadata**: Periodicity, due date, and creation date
   - **Assignee**: Automatically assigned to you (if enabled)

#### Setting Up JIRA Integration

Before you can create JIRA issues, you need to configure your JIRA connection:

1. **Method 1 - Command Palette**:

   - Press `Ctrl+Shift+P`
   - Type "Recurring Tasks: Configure JIRA"
   - Follow the setup instructions

2. **Method 2 - VS Code Settings**:

   - Open Settings (`Ctrl+,`)
   - Search for "Recurring Tasks JIRA"
   - Configure the following settings:
     - **Base URL**: Your JIRA instance URL (e.g., `https://yourcompany.atlassian.net`)
     - **Email**: Your JIRA account email
     - **API Token**: Create one at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
     - **Default Project Key**: Your default project (e.g., "PROJ")
     - **Default Issue Type**: Default issue type (e.g., "Task", "Bug", "Story")

3. **Test Your Connection**:
   - Use the command "Recurring Tasks: Test JIRA Connection" to verify your setup

#### JIRA Keyboard Shortcut

- **Create JIRA Issue**: `Ctrl+Shift+J` (when in the task details view)

### Deleting a Task

1. Right-click on a task in the sidebar
2. Select "Delete Task"
3. Confirm the deletion

### Refreshing the View

- Click the refresh button in the sidebar header to manually refresh the task list

## Task Status Indicators

- 🔴 **Red Error Icon**: Task is overdue
- 🟡 **Yellow Warning Icon**: Task is due soon depending on the periodicity
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

This extension includes the following configuration options:

### Calendar Meeting Settings

- **`recurringTasks.preferredCalendar`**: Set your preferred calendar provider for meeting creation
  - **Options**: "Outlook Web", "Google Calendar", "Ask each time"
  - **Default**: "Ask each time"
  - **Scope**: Global (applies to all workspaces)

### JIRA Integration Settings

- **`recurringTasks.jira.baseUrl`**: Your JIRA instance base URL

  - **Example**: "https://yourcompany.atlassian.net"
  - **Default**: ""
  - **Scope**: Global

- **`recurringTasks.jira.email`**: Your JIRA account email address

  - **Default**: ""
  - **Scope**: Global

- **`recurringTasks.jira.apiToken`**: JIRA API token for authentication

  - **Note**: Create one at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
  - **Default**: ""
  - **Scope**: Global

- **`recurringTasks.jira.defaultProjectKey`**: Default JIRA project key for creating issues

  - **Example**: "PROJ"
  - **Default**: ""
  - **Scope**: Global

- **`recurringTasks.jira.defaultIssueType`**: Default JIRA issue type for creating issues

  - **Options**: "Task", "Bug", "Story", etc. (depends on your JIRA configuration)
  - **Default**: "Task"
  - **Scope**: Global

- **`recurringTasks.jira.autoAssignToMe`**: Automatically assign created JIRA issues to yourself
  - **Options**: true/false
  - **Default**: true
  - **Scope**: Global

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
