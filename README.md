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
- **Smart Task Notifications**: Intelligent notification system for due and overdue tasks with configurable frequency
- **Calendar View**: Monthly calendar view showing all tasks organized by due date with interactive navigation
- **Calendar Meeting Creation**: Create calendar meetings from tasks with automatic pre-filling of details
- **Multi-Calendar Support**: Choose between Outlook Web and Google Calendar for meeting creation
- **Calendar Preferences**: Set your preferred calendar provider to avoid repeated prompts
- **JIRA Integration**: Create JIRA issues directly from tasks with automatic population of task details
- **JIRA Configuration**: Easy setup with your JIRA instance URL, email, and API token
- **Project and Issue Type Selection**: Choose from available projects and issue types when creating JIRA issues
- **Task Export/Import**: Export all tasks to JSON format for backup and sharing, import tasks from JSON files
- **Non-destructive Import**: Import tasks without deleting existing ones, with automatic duplicate ID handling
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

### Smart Task Notifications

The extension includes an intelligent notification system that helps you stay on top of your tasks:

#### How Notifications Work

- **Automatic Checking**: The system periodically checks for due and overdue tasks
- **Smart Throttling**: Notifications are intelligently throttled to prevent spam
- **Task Status Awareness**: Only active tasks receive notifications (archived tasks are ignored)
- **Real-time Updates**: Notification states are immediately reflected in the task details view

#### Notification Actions

When a notification appears, you have several options:

1. **Validate Task**: Mark the task as complete with an optional comment
2. **Show Details**: Open the task details view to see full information
3. **Snooze**: Temporarily suppress notifications for this task
4. **Disable Notifications**: Turn off all notifications globally

#### Smart Snooze Duration

The snooze duration automatically adapts to your notification frequency:

- **Immediate frequency**: Snooze for 30 minutes
- **Hourly frequency**: Snooze for 2 hours (longer than frequency for effectiveness)
- **Daily frequency**: Snooze for 6 hours
- **Disabled frequency**: Snooze for 24 hours

This ensures that snoozing is always meaningful and gives you appropriate time to handle tasks.

#### Notification Settings

Configure your notification preferences in VS Code settings:

1. **Open Settings**: Press `Ctrl+,` and search for "Recurring Tasks Notifications"
2. **Configure options**:
   - **Enabled**: Turn notifications on/off globally
   - **Frequency**: Choose how often notifications can appear
   - **Show Overdue Only**: Only notify about overdue tasks
   - **Max Notifications Per Task**: Limit notifications per task to avoid spam

#### Notification Frequency Options

- **Immediate**: Show notifications as soon as tasks become due/overdue
- **Hourly**: Show at most once per hour (default)
- **Daily**: Show at most once per day
- **Disabled**: Never show notifications

#### Managing Notification States

##### Viewing Notification State

- **Task Details View**: Open any task to see its current notification state
- **Real-time Updates**: The notification state updates automatically when notifications are shown, snoozed, or reactivated

##### Reactivating Notifications

- **From Task Details**: Click the "Reactivate Notifications" button in the task details view
- **From Context Menu**: Right-click on a task and select "Reactivate Notifications"
- **Manual Check**: Use "Check Notifications Now" command to manually trigger notification checks

#### Notification Commands

- **Check Notifications Now**: `Ctrl+Shift+P` → "Recurring Tasks: Check Notifications Now"
- **Reset Notification States**: `Ctrl+Shift+P` → "Recurring Tasks: Reset Notification States"
- **Notification Settings**: `Ctrl+Shift+P` → "Recurring Tasks: Notification Settings"

### Calendar View

The extension includes a comprehensive calendar view that shows all your tasks organized by due date:

#### Accessing the Calendar

- **Sidebar Tab**: Click the "Calendar" tab in the Recurring Tasks sidebar
- **Command**: `Ctrl+Shift+P` → "Recurring Tasks: Show Calendar View"
- **Button**: Click the calendar button in the tasks view header

#### Calendar Features

- **Monthly View**: See all tasks for the current month at a glance
- **Navigation**: Use previous/next month buttons or "Go to Today" to navigate
- **Task Visualization**: Tasks appear as colored dots on their due dates
- **Status Colors**:
  - **Red dots**: Overdue tasks
  - **Yellow dots**: Tasks due soon
  - **Blue dots**: Normal tasks
- **Interactive**: Click on any task dot to view task details or validate the task
- **Responsive**: Calendar adapts to different sidebar widths

#### Calendar Configuration

##### First Day of Week

You can customize which day starts your week:

1. **Method 1 - Command Palette**:

   - Press `Ctrl+Shift+P`
   - Type "Recurring Tasks: Set First Day of Week"
   - Choose your preference

2. **Method 2 - VS Code Settings**:
   - Open Settings (`Ctrl+,`)
   - Search for "Recurring Tasks Calendar"
   - Set "First Day of Week" to:
     - **Auto**: Uses your system locale (Monday for most countries, Sunday for US)
     - **Sunday**: Always start week on Sunday
     - **Monday**: Always start week on Monday

#### Calendar Commands

- **Show Calendar**: `Ctrl+Shift+P` → "Recurring Tasks: Show Calendar View"
- **Set First Day of Week**: `Ctrl+Shift+P` → "Recurring Tasks: Set First Day of Week"

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

### Exporting and Importing Tasks

You can export your tasks to a JSON file for backup or sharing, and import tasks from JSON files to add them to your collection.

#### Exporting Tasks

1. **Click the export button** (📤) in the "Recurring Tasks" view header, or
2. **Use Command Palette**: Press `Ctrl+Shift+P` and type "Recurring Tasks: Export Tasks"
3. **Choose save location**: Select where to save the JSON file
4. **File is created**: A timestamped JSON file with all your tasks is created
5. **Optional actions**: After export, you can:
   - **Open File**: View the exported JSON directly in VS Code
   - **Show in Explorer**: Open the file location in your system file manager

The exported JSON includes:

- **Export metadata**: Date and version information
- **All tasks**: Both active and archived tasks
- **Complete data**: All task properties, comments, and history

#### Importing Tasks

1. **Click the import button** (⬇️) in the "Recurring Tasks" view header, or
2. **Use Command Palette**: Press `Ctrl+Shift+P` and type "Recurring Tasks: Import Tasks"
3. **Select JSON file**: Choose the file containing tasks to import
4. **Import process**: The system will:
   - Validate the JSON format
   - Check for required fields
   - Handle duplicate IDs (generates new unique IDs if needed)
   - Convert date strings to proper Date objects
   - Migrate old periodicity formats if present
5. **Results**: You'll see a summary of imported tasks and any warnings/errors

**Important Notes:**

- **Non-destructive import**: Imported tasks are added to your existing collection without deleting current tasks
- **Duplicate handling**: If imported tasks have duplicate IDs, new unique IDs are automatically generated
- **Data validation**: Invalid tasks are skipped with detailed error reporting
- **Progress tracking**: Import progress is shown with a progress indicator

#### Export/Import Use Cases

- **Backup**: Export your tasks before making major changes
- **Sharing**: Share task collections with team members
- **Migration**: Move tasks between different VS Code installations
- **Recovery**: Restore tasks from a previous export
- **Testing**: Import sample tasks for testing purposes

### Smart Notification System

The RecurringTasks extension includes a comprehensive notification system that helps you stay on top of your tasks without being overwhelmed.

#### How Notifications Work

- **Automatic Checks**: The system checks for due/overdue tasks every 30 minutes
- **Smart Throttling**: Notifications are intelligently throttled based on your frequency settings
- **Task Status Awareness**: Only active tasks receive notifications (archived tasks are ignored)
- **Real-time Updates**: Notification states are immediately reflected in the task details view

#### Notification Actions

When a notification appears, you have several options:

1. **Validate Task**: Mark the task as complete with an optional comment
2. **Show Details**: Open the task details view to see full information
3. **Snooze**: Temporarily suppress notifications for this task
4. **Disable Notifications**: Turn off all notifications globally

#### Smart Snooze Duration

The snooze duration automatically adapts to your notification frequency:

- **Immediate frequency**: Snooze for 30 minutes
- **Hourly frequency**: Snooze for 2 hours (longer than frequency for effectiveness)
- **Daily frequency**: Snooze for 6 hours
- **Disabled frequency**: Snooze for 24 hours

This ensures that snoozing is always meaningful and gives you appropriate time to handle tasks.

#### Notification Settings

Configure your notification preferences in VS Code settings:

1. **Open Settings**: Press `Ctrl+,` and search for "Recurring Tasks Notifications"
2. **Configure options**:
   - **Enabled**: Turn notifications on/off globally
   - **Frequency**: Choose how often notifications can appear
   - **Show Overdue Only**: Only notify about overdue tasks
   - **Max Notifications Per Task**: Limit notifications per task to avoid spam

#### Notification Frequency Options

- **Immediate**: Show notifications as soon as tasks become due/overdue
- **Hourly**: Show at most once per hour (default)
- **Daily**: Show at most once per day
- **Disabled**: Never show notifications

#### Managing Notification States

##### Viewing Notification State

- **Task Details View**: Open any task to see its current notification state
- **Real-time Updates**: The notification state updates automatically when notifications are shown, snoozed, or reactivated

##### Reactivating Notifications

If a task has reached its maximum notifications or been snoozed, you can reactivate notifications:

1. **Right-click on task** in the sidebar
2. **Select "Recurring Tasks: Reactivate Notifications"**
3. **Or use Command Palette**: Press `Ctrl+Shift+P` and type "Recurring Tasks: Reactivate Notifications"

##### Notification Statistics

The system tracks notification statistics including:

- Total active tasks
- Tasks with notification states
- Overdue tasks with notifications
- Current notification settings

#### Notification Commands

Access notification management through the Command Palette (`Ctrl+Shift+P`):

- **"Recurring Tasks: Check Notifications Now"**: Manually trigger a notification check
- **"Recurring Tasks: Reset Notification States"**: Clear all notification states (useful for testing)
- **"Recurring Tasks: Notification Settings"**: Open notification settings directly

#### Notification Best Practices

- **Start with Hourly**: The default hourly frequency provides good balance
- **Use Snooze Wisely**: Snooze when you need time to handle a task
- **Reactivate When Ready**: Reactivate notifications when you're ready to receive them again
- **Monitor in Task Details**: Check the notification state in task details for full visibility
- **Adjust Frequency**: Change frequency based on your workflow and task urgency

#### Troubleshooting Notifications

**Notifications not appearing?**

- Check if notifications are enabled in settings
- Verify the task is active (not archived)
- Check if the task has reached maximum notifications
- Ensure the task is actually due/overdue

**Too many notifications?**

- Increase the frequency setting (e.g., from hourly to daily)
- Enable "Show Overdue Only" to reduce notification volume
- Use snooze to temporarily suppress specific tasks

**Need immediate notifications?**

- Set frequency to "Immediate" for instant notifications
- Use "Check Notifications Now" command for manual checks

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

### Notification Settings

- **`recurringTasks.notifications.enabled`**: Enable or disable all task notifications

  - **Options**: true/false
  - **Default**: true
  - **Scope**: Global

- **`recurringTasks.notifications.frequency`**: How often notifications can appear for the same task

  - **Options**: "immediate", "hourly", "daily", "disabled"
  - **Default**: "hourly"
  - **Scope**: Global

- **`recurringTasks.notifications.showOverdueOnly`**: Only show notifications for overdue tasks

  - **Options**: true/false
  - **Default**: false
  - **Scope**: Global

- **`recurringTasks.notifications.maxNotificationsPerTask`**: Maximum number of notifications per task
  - **Options**: 1-50
  - **Default**: 5
  - **Scope**: Global

### Calendar Settings

- **`recurringTasks.calendar.firstDayOfWeek`**: First day of the week for calendar display

  - **Options**: "auto", "sunday", "monday"
  - **Default**: "auto" (uses system locale)
  - **Scope**: Global

## Known Issues

None at this time.

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
