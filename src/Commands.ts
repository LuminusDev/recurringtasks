import * as vscode from 'vscode';
import { l10n } from 'vscode';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';
import { CalendarProvider } from './CalendarProvider';
import { TaskTreeItem } from './TaskProvider';
import { TaskDetailsProvider } from './TaskDetailsProvider';
import { JiraService } from './JiraService';
import { NotificationManager } from './NotificationManager';

/**
 * Handles all command implementations for the recurring tasks extension
 */
export class Commands {
    private taskManager: TaskManager;
    private taskProvider: TaskProvider;
    private calendarProvider: CalendarProvider;
    private extensionUri: vscode.Uri;
    private jiraService: JiraService;
    private notificationManager: NotificationManager;

    constructor(taskManager: TaskManager, taskProvider: TaskProvider, calendarProvider: CalendarProvider, extensionUri: vscode.Uri, notificationManager: NotificationManager) {
        this.taskManager = taskManager;
        this.taskProvider = taskProvider;
        this.calendarProvider = calendarProvider;
        this.extensionUri = extensionUri;
        this.jiraService = new JiraService();
        this.notificationManager = notificationManager;
    }

    /**
     * Registers all commands with VS Code
     */
    registerCommands(context: vscode.ExtensionContext): void {
        // Add Task command (webview only)
        const addTaskCommand = vscode.commands.registerCommand('recurringtasks.addTask', () => {
            this.createTaskWebview();
        });

        // Validate Task command
        const validateTaskCommand = vscode.commands.registerCommand('recurringtasks.validateTask', (item: TaskTreeItem) => {
            this.validateTask(item);
        });

        // Archive Task command
        const archiveTaskCommand = vscode.commands.registerCommand('recurringtasks.archiveTask', (item: TaskTreeItem) => {
            this.archiveTask(item);
        });

        // Unarchive Task command
        const unarchiveTaskCommand = vscode.commands.registerCommand('recurringtasks.unarchiveTask', (item: TaskTreeItem) => {
            this.unarchiveTask(item);
        });

        // Delete Task command
        const deleteTaskCommand = vscode.commands.registerCommand('recurringtasks.deleteTask', (item: TaskTreeItem) => {
            this.deleteTask(item);
        });

        // Refresh Tasks command
        const refreshTasksCommand = vscode.commands.registerCommand('recurringtasks.refreshTasks', () => {
            this.refreshTasks();
        });

        // Show Task Details command
        const showTaskDetailsCommand = vscode.commands.registerCommand('recurringtasks.showTaskDetails', (task: any) => {
            this.showTaskDetails(task);
        });

        // Create Outlook Meeting command
        const createMeetingCommand = vscode.commands.registerCommand('recurringtasks.createOutlookMeeting', async (item?: TaskTreeItem) => {
            // If no item provided (e.g., called via keybinding), try to get selected task
            if (!item) {
                const selectedTask = await this.getSelectedTask();
                if (selectedTask) {
                    this.createOutlookMeeting(selectedTask);
                } else {
                    vscode.window.showWarningMessage(l10n.t('Please select a task first to create a calendar meeting.'));
                }
            } else {
                this.createOutlookMeeting(item);
            }
        });

        // Set Preferred Calendar command
        const setPreferredCalendarCommand = vscode.commands.registerCommand('recurringtasks.setPreferredCalendar', () => {
            this.setPreferredCalendar();
        });

        // Create JIRA Issue command
        const createJiraIssueCommand = vscode.commands.registerCommand('recurringtasks.createJiraIssue', async (item?: TaskTreeItem) => {
            // If no item provided (e.g., called via keybinding), try to get selected task
            if (!item) {
                const selectedTask = await this.getSelectedTask();
                if (selectedTask) {
                    this.createJiraIssue(selectedTask);
                } else {
                    vscode.window.showWarningMessage(l10n.t('Please select a task first to create a JIRA issue.'));
                }
            } else {
                this.createJiraIssue(item);
            }
        });

        // Configure JIRA command
        const configureJiraCommand = vscode.commands.registerCommand('recurringtasks.configureJira', () => {
            this.configureJira();
        });

        // Test JIRA Connection command
        const testJiraConnectionCommand = vscode.commands.registerCommand('recurringtasks.testJiraConnection', () => {
            this.testJiraConnection();
        });

        // Export Tasks command
        const exportTasksCommand = vscode.commands.registerCommand('recurringtasks.exportTasks', () => {
            this.exportTasks();
        });

        // Import Tasks command
        const importTasksCommand = vscode.commands.registerCommand('recurringtasks.importTasks', () => {
            this.importTasks();
        });

        // Reactivate Notifications command
        const reactivateNotificationsCommand = vscode.commands.registerCommand('recurringtasks.reactivateNotifications', async (item?: TaskTreeItem) => {
            // If no item provided (e.g., called via keybinding), try to get selected task
            if (!item) {
                const selectedTask = await this.getSelectedTask();
                if (selectedTask) {
                    this.reactivateNotifications(selectedTask);
                } else {
                    vscode.window.showWarningMessage(l10n.t('Please select a task first to reactivate notifications.'));
                }
            } else {
                this.reactivateNotifications(item);
            }
        });

        // Set First Day of Week command
        const setFirstDayOfWeekCommand = vscode.commands.registerCommand('recurringtasks.setFirstDayOfWeek', () => {
            this.setFirstDayOfWeek();
        });

        // Refresh Webview for Notification Changes command
        const refreshWebviewCommand = vscode.commands.registerCommand('recurringtasks.refreshWebviewForNotifications', () => {
            const { TaskDetailsProvider } = require('./TaskDetailsProvider');
            TaskDetailsProvider.refreshWebviewForNotificationChange();
        });

        // Add all commands to subscriptions
        context.subscriptions.push(
            addTaskCommand,
            validateTaskCommand,
            archiveTaskCommand,
            unarchiveTaskCommand,
            deleteTaskCommand,
            refreshTasksCommand,
            showTaskDetailsCommand,
            createMeetingCommand,
            setPreferredCalendarCommand,
            createJiraIssueCommand,
            configureJiraCommand,
            testJiraConnectionCommand,
            exportTasksCommand,
            importTasksCommand,
            reactivateNotificationsCommand,
            setFirstDayOfWeekCommand,
            refreshWebviewCommand
        );
    }

    /**
     * Shows create task form in a webview
     */
    private createTaskWebview(): void {
        try {
            TaskDetailsProvider.showCreateTaskForm(this.extensionUri);
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to show create task form: {0}', String(error)));
        }
    }

    /**
     * Handles validating a task
     */
    private async validateTask(item: TaskTreeItem): Promise<void> {
        try {
            // Get validation comment
            const comment = await vscode.window.showInputBox({
                prompt: `Validate task: ${item.task.title}`,
                placeHolder: 'Enter a comment for this validation (optional)'
            });

            // Check if user cancelled (pressed Escape)
            if (comment === undefined) {
                vscode.window.showInformationMessage(l10n.t('Task validation cancelled'));
                return;
            }

            // Validate the task (comment can be empty)
            const updatedTask = this.taskManager.validateTask(item.task.id, comment || '');
            
            if (updatedTask) {
                // Refresh the view
                this.refreshTasks();
                
                const nextDueDate = updatedTask.dueDate.toLocaleDateString();
                vscode.window.showInformationMessage(
                    l10n.t('Task "{0}" validated! Next due: {1}', item.task.title, nextDueDate)
                );
            } else {
                vscode.window.showErrorMessage(l10n.t('Failed to validate task'));
            }
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to validate task: {0}', String(error)));
        }
    }

    /**
     * Handles archiving a task
     */
    private async archiveTask(item: TaskTreeItem): Promise<void> {
        try {
            const success = this.taskManager.archiveTask(item.task.id);
            if (success) {
                this.refreshTasks();
                vscode.window.showInformationMessage(l10n.t('Task "{0}" archived.', item.task.title));
            } else {
                vscode.window.showErrorMessage(l10n.t('Failed to archive task.'));
            }
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to archive task: {0}', String(error)));
        }
    }

    /**
     * Handles unarchiving a task
     */
    private async unarchiveTask(item: TaskTreeItem): Promise<void> {
        try {
            const success = this.taskManager.unarchiveTask(item.task.id);
            if (success) {
                this.refreshTasks();
                vscode.window.showInformationMessage(l10n.t('Task "{0}" unarchived.', item.task.title));
            } else {
                vscode.window.showErrorMessage(l10n.t('Failed to unarchive task.'));
            }
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to unarchive task: {0}', String(error)));
        }
    }

    /**
     * Handles deleting a task
     */
    private async deleteTask(item: TaskTreeItem): Promise<void> {
        try {
            // Confirm deletion
            const result = await vscode.window.showWarningMessage(
                l10n.t('Are you sure you want to delete "{0}"?', item.task.title),
                { modal: true },
                l10n.t('Delete')
            );

            if (result === l10n.t('Delete')) {
                const success = this.taskManager.deleteTask(item.task.id);
                
                if (success) {
                    // Refresh the view
                    this.refreshTasks();
                    vscode.window.showInformationMessage(l10n.t('Task "{0}" deleted successfully!', item.task.title));
                } else {
                    vscode.window.showErrorMessage(l10n.t('Failed to delete task'));
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to delete task: {0}', String(error)));
        }
    }

    /**
     * Refreshes the task view
     */
    private refreshTasks(): void {
        this.taskProvider.refresh();
        this.calendarProvider.refresh();
    }

    /**
     * Handles reactivating notifications for a task
     */
    private async reactivateNotifications(item: TaskTreeItem): Promise<void> {
        try {
            await this.notificationManager.reactivateNotificationsForTask(item.task.id);
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to reactivate notifications: {0}', String(error)));
        }
    }

    /**
     * Shows task details in a webview panel
     */
    private showTaskDetails(task: any): void {
        try {
            TaskDetailsProvider.showTaskDetails(task, this.extensionUri);
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to show task details: {0}', String(error)));
        }
    }

    /**
     * Creates a calendar meeting from a task using web-based calendars
     */
    private async createOutlookMeeting(item: TaskTreeItem): Promise<void> {
        try {
            const task = item.task;
            const subject = encodeURIComponent(task.title);
            const body = encodeURIComponent(task.description || '');
            const startDate = task.dueDate.toISOString();
            
            // Get user's preferred calendar from settings
            const preferredCalendar = vscode.workspace.getConfiguration('recurringTasks').get<string>('preferredCalendar', 'Ask each time');
            
            let calendarChoice: string;
            
            if (preferredCalendar === l10n.t('Ask each time')) {
                // Ask user which web calendar to use
                const userChoice = await vscode.window.showQuickPick(
                    [l10n.t('Outlook Web'), l10n.t('Google Calendar')],
                    {
                        placeHolder: l10n.t('Choose calendar application for meeting creation'),
                        canPickMany: false
                    }
                );
                
                if (!userChoice) {
                    vscode.window.showInformationMessage(l10n.t('Calendar meeting creation cancelled.'));
                    return;
                }
                
                calendarChoice = userChoice;
            } else {
                // Use the preferred calendar setting
                calendarChoice = preferredCalendar;
            }
            
            let meetingUrl: string;
            
            if (calendarChoice === l10n.t('Outlook Web')) {
                meetingUrl = `https://outlook.office.com/calendar/action/compose?subject=${subject}&body=${body}&startdt=${startDate}`;
            } else if (calendarChoice === l10n.t('Google Calendar')) {
                // Google Calendar requires dates in YYYYMMDDTHHMMSSZ format
                const googleStartDate = this.formatDateForGoogleCalendar(task.dueDate);
                const googleEndDate = this.formatDateForGoogleCalendar(new Date(task.dueDate.getTime() + 60 * 60 * 1000)); // 1 hour later
                meetingUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${subject}&details=${body}&dates=${googleStartDate}/${googleEndDate}`;
            } else {
                vscode.window.showErrorMessage(l10n.t('Invalid calendar choice'));
                return;
            }
            
            // Open the meeting URL
            await vscode.env.openExternal(vscode.Uri.parse(meetingUrl));
            vscode.window.showInformationMessage(l10n.t('Opening {0} for: {1}', calendarChoice, task.title));
            
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to create calendar meeting: {0}', String(error)));
        }
    }

    /**
     * Formats a date for Google Calendar URL (YYYYMMDDTHHMMSSZ format)
     */
    private formatDateForGoogleCalendar(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    /**
     * Allows users to set their preferred calendar provider
     */
    private async setPreferredCalendar(): Promise<void> {
        const currentSetting = vscode.workspace.getConfiguration('recurringTasks').get<string>('preferredCalendar', l10n.t('Ask each time'));
        
        const choice = await vscode.window.showQuickPick(
            [l10n.t('Outlook Web'), l10n.t('Google Calendar'), l10n.t('Ask each time')],
            {
                placeHolder: l10n.t('Current setting: {0}. Choose your preferred calendar:', currentSetting),
                canPickMany: false
            }
        );
        
        // Check if user cancelled (pressed Escape)
        if (!choice) {
            vscode.window.showInformationMessage(l10n.t('Calendar preference setting cancelled'));
            return;
        }
        
        await vscode.workspace.getConfiguration('recurringTasks').update('preferredCalendar', choice, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(l10n.t('Preferred calendar set to: {0}', choice));
    }

    /**
     * Gets the currently selected task from the tree view
     */
    private async getSelectedTask(): Promise<TaskTreeItem | undefined> {
        try {
            // Since VS Code doesn't provide direct access to tree view selection,
            // we'll show a task picker to let the user choose the task they want to work with
            // This provides a better user experience than guessing or using the first task
            return await this.showTaskPicker();
        } catch (error) {
            console.error('Error getting selected task:', error);
            return this.getFirstAvailableTask();
        }
    }

    /**
     * Shows a task picker to let the user choose a task
     */
    private async showTaskPicker(): Promise<TaskTreeItem | undefined> {
        const tasks = this.taskManager.getTasks();
        
        if (tasks.length === 0) {
            vscode.window.showInformationMessage(l10n.t('No active tasks available.'));
            return undefined;
        }

        // Create picker items with task information
        const taskItems = tasks.map(task => ({
            label: task.title,
            description: task.description || '',
            detail: `Due: ${task.dueDate.toLocaleDateString()} - ${this.getTaskStatusText(task)}`,
            task: task
        }));

        const selectedItem = await vscode.window.showQuickPick(taskItems, {
            placeHolder: l10n.t('Select a task to perform the action on'),
            canPickMany: false
        });

        if (!selectedItem) {
            return undefined;
        }

        // Create a TaskTreeItem from the selected task
        return {
            task: selectedItem.task,
            label: selectedItem.task.title,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        } as TaskTreeItem;
    }

    /**
     * Gets the first available task as a fallback
     */
    private getFirstAvailableTask(): TaskTreeItem | undefined {
        const tasks = this.taskManager.getTasks();
        if (tasks.length > 0) {
            return {
                task: tasks[0],
                label: tasks[0].title,
                collapsibleState: vscode.TreeItemCollapsibleState.None
            } as TaskTreeItem;
        }
        return undefined;
    }

    /**
     * Allows users to set the first day of week for the calendar
     */
    private async setFirstDayOfWeek(): Promise<void> {
        const currentSetting = vscode.workspace.getConfiguration('recurringTasks.calendar').get<string>('firstDayOfWeek', 'auto');
        
        const choice = await vscode.window.showQuickPick(
            [
                { label: l10n.t('Auto (use locale)'), value: 'auto', description: `Current: ${currentSetting === 'auto' ? l10n.t('Auto (use locale)') : currentSetting}` },
                { label: l10n.t('Sunday'), value: 'sunday', description: l10n.t('Start week on Sunday') },
                { label: l10n.t('Monday'), value: 'monday', description: l10n.t('Start week on Monday') }
            ],
            {
                placeHolder: `Current setting: ${currentSetting}. Choose first day of week:`,
                canPickMany: false
            }
        );
        
        // Check if user cancelled (pressed Escape)
        if (!choice) {
            vscode.window.showInformationMessage(l10n.t('First day of week setting cancelled'));
            return;
        }
        
        await vscode.workspace.getConfiguration('recurringTasks.calendar').update('firstDayOfWeek', choice.value, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(l10n.t('First day of week set to: {0}', choice.label));
        
        // Refresh the calendar to show the change
        this.calendarProvider.refresh();
    }

    /**
     * Gets a human-readable status text for a task
     */
    private getTaskStatusText(task: any): string {
        const now = new Date();
        const isOverdue = task.dueDate < now;
        const isDueToday = task.dueDate.toDateString() === now.toDateString();
        
        if (isOverdue) {
            const daysOverdue = Math.floor((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`;
        } else if (isDueToday) {
            return l10n.t('Due today');
        } else {
            const daysUntilDue = Math.floor((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Creates a JIRA issue from a task
     */
    private async createJiraIssue(item: TaskTreeItem): Promise<void> {
        try {
            // Initialize JIRA service
            const initialized = await this.jiraService.initialize();
            
            if (!initialized) {
                const result = await vscode.window.showWarningMessage(
                    l10n.t('JIRA is not configured. Please configure JIRA settings first.'),
                    l10n.t('Configure JIRA'),
                    l10n.t('Cancel')
                );
                
                if (result === l10n.t('Configure JIRA')) {
                    await this.configureJira();
                }
                return;
            }

            const task = item.task;

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Creating JIRA issue for "${task.title}"...`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Connecting to JIRA...' });

                // Get projects and let user choose
                const projectsResult = await this.jiraService.getProjects();
                
                if (!projectsResult.success) {
                    vscode.window.showErrorMessage(l10n.t('Failed to get JIRA projects: {0}', projectsResult.message));
                    return;
                }

                progress.report({ increment: 30, message: 'Fetching project information...' });

                const config = this.jiraService.getConfig();
                let selectedProjectKey = config?.defaultProjectKey;
                let selectedIssueType = config?.defaultIssueType;

                // Let user choose project if multiple are available
                if (projectsResult.projects && projectsResult.projects.length > 1) {
                    // Sort so the default project is first
                    let sortedProjects = projectsResult.projects;
                    if (selectedProjectKey) {
                        sortedProjects = [
                            ...projectsResult.projects.filter(p => p.key === selectedProjectKey),
                            ...projectsResult.projects.filter(p => p.key !== selectedProjectKey)
                        ];
                    }
                    const projectItems = sortedProjects.map(p => ({
                        label: p.key,
                        description: p.name
                    }));

                    const selectedProject = await vscode.window.showQuickPick(projectItems, {
                        placeHolder: l10n.t('Select JIRA project:'),
                        canPickMany: false
                    });

                    // Check if user cancelled (pressed Escape)
                    if (!selectedProject) {
                        vscode.window.showInformationMessage(l10n.t('JIRA issue creation cancelled'));
                        return;
                    }

                    selectedProjectKey = selectedProject.label;
                }

                if (!selectedProjectKey) {
                    vscode.window.showErrorMessage(l10n.t('No JIRA project selected'));
                    return;
                }

                progress.report({ increment: 50, message: 'Getting issue types...' });

                // Get issue types for the selected project
                const issueTypesResult = await this.jiraService.getIssueTypes(selectedProjectKey);
                
                if (issueTypesResult.success && issueTypesResult.issueTypes && issueTypesResult.issueTypes.length > 1) {
                    // Sort so the default issue type is first
                    let sortedIssueTypes = issueTypesResult.issueTypes;
                    if (selectedIssueType) {
                        sortedIssueTypes = [
                            ...issueTypesResult.issueTypes.filter(it => it.name === selectedIssueType),
                            ...issueTypesResult.issueTypes.filter(it => it.name !== selectedIssueType)
                        ];
                    }
                    const issueTypeItems = sortedIssueTypes.map(it => ({
                        label: it.name,
                        description: it.description
                    }));

                    const selectedIssueTypeItem = await vscode.window.showQuickPick(issueTypeItems, {
                        placeHolder: l10n.t('Select issue type:'),
                        canPickMany: false
                    });

                    // Check if user cancelled (pressed Escape)
                    if (!selectedIssueTypeItem) {
                        vscode.window.showInformationMessage(l10n.t('JIRA issue creation cancelled'));
                        return;
                    }

                    selectedIssueType = selectedIssueTypeItem.label;
                }

                progress.report({ increment: 70, message: 'Creating JIRA issue...' });

                // Create the JIRA issue
                const result = await this.jiraService.createIssueFromTask(task, selectedProjectKey, selectedIssueType);

                progress.report({ increment: 100, message: 'Done!' });

                if (result.success) {
                    const action = await vscode.window.showInformationMessage(
                        `${result.message}`,
                        l10n.t('View Issue'),
                        l10n.t('Copy URL')
                    );

                    if (action === l10n.t('View Issue') && result.url) {
                        await vscode.env.openExternal(vscode.Uri.parse(result.url));
                    } else if (action === l10n.t('Copy URL') && result.url) {
                        await vscode.env.clipboard.writeText(result.url);
                        vscode.window.showInformationMessage(l10n.t('JIRA issue URL copied to clipboard'));
                    }
                } else {
                    vscode.window.showErrorMessage(l10n.t('Failed to create JIRA issue: {0}', result.message));
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to create JIRA issue: {0}', String(error)));
        }
    }

    /**
     * Opens JIRA configuration guide
     */
    private async configureJira(): Promise<void> {
        const result = await vscode.window.showInformationMessage(
            l10n.t('Configure JIRA settings to create issues from tasks. Click OK to open JIRA configuration.'),
            l10n.t('Open Settings'),
            'Show Instructions'
        );

        if (result === l10n.t('Open Settings')) {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'recurringTasks.jira');
        } else if (result === 'Show Instructions') {
            const instructions = l10n.t('# JIRA Configuration Instructions\n\n1. **Base URL**: Your JIRA instance URL (e.g., https://yourcompany.atlassian.net)\n2. **Email**: Your JIRA account email address\n3. **API Token**: Create one at https://id.atlassian.com/manage-profile/security/api-tokens\n4. **Default Project Key**: The key of your default project (e.g., "PROJ")\n5. **Default Issue Type**: The default issue type (e.g., "Task", "Bug", "Story")\n\nYou can set these in VS Code Settings (Ctrl+,) under "Recurring Tasks > Jira".');

            const panel = vscode.window.createWebviewPanel(
                'jiraConfig',
                l10n.t('JIRA Configuration Instructions'),
                vscode.ViewColumn.One,
                { 
                    enableScripts: false,
                    localResourceRoots: [this.extensionUri]
                }
            );

            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; img-src 'self' data: https:; connect-src 'none';">
                    <style>
                        body { font-family: var(--vscode-font-family); padding: 20px; }
                        h1 { color: var(--vscode-editor-foreground); }
                        pre { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; }
                        a { color: var(--vscode-textLink-foreground); }
                    </style>
                </head>
                <body>
                    <pre>${instructions.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </body>
                </html>
            `;
        }
    }

    /**
     * Tests the JIRA connection
     */
    private async testJiraConnection(): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Testing JIRA connection...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Initializing...' });

                const initialized = await this.jiraService.initialize();
                
                if (!initialized) {
                    vscode.window.showWarningMessage(l10n.t('JIRA is not configured. Please configure JIRA settings first.'));
                    return;
                }

                progress.report({ increment: 50, message: 'Connecting to JIRA...' });

                const result = await this.jiraService.testConnection();
                
                progress.report({ increment: 100, message: 'Done!' });
                
                if (result.success) {
                    vscode.window.showInformationMessage(l10n.t('✅ JIRA Connection Successful!\n{0}', result.message));
                } else {
                    vscode.window.showErrorMessage(l10n.t('❌ JIRA Connection Failed!\n{0}', result.message));
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Error testing JIRA connection: {0}', String(error)));
        }
    }

    /**
     * Exports all tasks to a JSON file
     */
    private async exportTasks(): Promise<void> {
        try {
            const tasks = this.taskManager.getAllTasks();
            
            if (tasks.length === 0) {
                vscode.window.showInformationMessage(l10n.t('No tasks to export.'));
                return;
            }

            // Generate a default filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const defaultFileName = `recurring-tasks-export-${timestamp}.json`;

            // Ask user where to save the file
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultFileName),
                filters: {
                    'JSON files': ['json'],
                    'All files': ['*']
                },
                saveLabel: 'Export Tasks'
            });

            if (!saveUri) {
                vscode.window.showInformationMessage(l10n.t('Export cancelled.'));
                return;
            }

            // Export tasks to JSON
            const jsonData = this.taskManager.exportTasks();
            
            // Write to file
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(jsonData, 'utf8'));
            
            const action = await vscode.window.showInformationMessage(
                l10n.t('Tasks exported successfully to {0}', saveUri.fsPath),
                'Open File',
                'Show in Explorer'
            );

            if (action === 'Open File') {
                await vscode.window.showTextDocument(saveUri);
            } else if (action === 'Show in Explorer') {
                await vscode.commands.executeCommand('revealFileInOS', saveUri);
            }

        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to export tasks: {0}', String(error)));
        }
    }

    /**
     * Imports tasks from a JSON file
     */
    private async importTasks(): Promise<void> {
        try {
            // Ask user to select the file to import
            const openUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON files': ['json'],
                    'All files': ['*']
                },
                openLabel: 'Import Tasks'
            });

            if (!openUri || openUri.length === 0) {
                vscode.window.showInformationMessage(l10n.t('Import cancelled.'));
                return;
            }

            const fileUri = openUri[0];

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Importing tasks...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Reading file...' });

                // Read the file
                const fileData = await vscode.workspace.fs.readFile(fileUri);
                const jsonData = Buffer.from(fileData).toString('utf8');

                progress.report({ increment: 50, message: 'Processing tasks...' });

                // Import tasks
                const result = this.taskManager.importTasks(jsonData);

                progress.report({ increment: 100, message: 'Done!' });

                if (result.success) {
                    // Refresh the task view
                    this.refreshTasks();

                    // Show success message with details
                    let message = result.message;
                    if (result.errors.length > 0) {
                        message += `\n\nWarnings/Errors:\n${result.errors.slice(0, 5).join('\n')}`;
                        if (result.errors.length > 5) {
                            message += `\n... and ${result.errors.length - 5} more`;
                        }
                    }

                    if (result.errors.length > 0) {
                        const action = await vscode.window.showWarningMessage(
                            message,
                            'Show Details'
                        );

                        if (action === 'Show Details') {
                            // Show all errors in a new document
                            const doc = await vscode.workspace.openTextDocument({
                                content: `Import Results:\n\n${result.message}\n\nAll Warnings/Errors:\n${result.errors.join('\n')}`,
                                language: 'plaintext'
                            });
                            await vscode.window.showTextDocument(doc);
                        }
                    } else {
                        vscode.window.showInformationMessage(message);
                    }
                } else {
                    vscode.window.showErrorMessage(l10n.t('Failed to import tasks: {0}', result.message));
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(l10n.t('Failed to import tasks: {0}', String(error)));
        }
    }
} 