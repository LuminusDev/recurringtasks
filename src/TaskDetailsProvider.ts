import * as vscode from 'vscode';
import { l10n } from 'vscode';
import { Task, Comment } from './Task';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';
import { CalendarProvider } from './CalendarProvider';
import { TaskStatusUtil } from './TaskStatusUtil';
import { NotificationManager } from './NotificationManager';

/**
 * Provides task details and comments in a webview panel
 */
export class TaskDetailsProvider {
    private static readonly viewType = 'recurringTasks.taskDetails';
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static currentTaskId: string | undefined;
    private static taskManager: TaskManager;
    private static taskProvider: TaskProvider;
    private static calendarProvider: CalendarProvider;
    private static notificationManager: NotificationManager;

    /**
     * Sets the task manager instance
     */
    public static setTaskManager(taskManager: TaskManager): void {
        TaskDetailsProvider.taskManager = taskManager;
    }

    /**
     * Sets the task provider instance
     */
    public static setTaskProvider(taskProvider: TaskProvider): void {
        TaskDetailsProvider.taskProvider = taskProvider;
    }

    /**
     * Sets the notification manager instance
     */
    public static setNotificationManager(notificationManager: NotificationManager): void {
        TaskDetailsProvider.notificationManager = notificationManager;
    }

    /**
     * Sets the calendar provider instance
     */
    public static setCalendarProvider(calendarProvider: CalendarProvider): void {
        TaskDetailsProvider.calendarProvider = calendarProvider;
    }

    /**
     * Shows task details in a webview panel, reusing existing panel if available
     */
    public static showTaskDetails(task: Task, extensionUri: vscode.Uri): void {
        // Store the current task ID
        TaskDetailsProvider.currentTaskId = task.id;
        
        // If we have an existing panel, reuse it
        if (TaskDetailsProvider.currentPanel) {
            TaskDetailsProvider.currentPanel.reveal(vscode.ViewColumn.One);
            TaskDetailsProvider.currentPanel.title = `Task: ${task.title}`;
            TaskDetailsProvider.currentPanel.webview.html = TaskDetailsProvider.getWebviewContent(task, TaskDetailsProvider.currentPanel.webview, extensionUri);
            return;
        }

        // Create a new panel if none exists
        const panel = vscode.window.createWebviewPanel(
            TaskDetailsProvider.viewType,
            `Task: ${task.title}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        // Store reference to the panel
        TaskDetailsProvider.currentPanel = panel;

        panel.webview.html = TaskDetailsProvider.getWebviewContent(task, panel.webview, extensionUri);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'close':
                        panel.dispose();
                        return;
                    case 'addComment':
                        TaskDetailsProvider.handleAddComment(message.taskId, message.commentText);
                        return;
                    case 'updateComment':
                        TaskDetailsProvider.handleUpdateComment(message.taskId, message.commentId, message.commentText);
                        return;
                    case 'deleteComment':
                        TaskDetailsProvider.handleDeleteComment(message.taskId, message.commentId);
                        return;
                    case 'confirmDeleteComment':
                        TaskDetailsProvider.handleConfirmDeleteComment(message.taskId, message.commentId);
                        return;
                    case 'openLink':
                        TaskDetailsProvider.handleOpenLink(message.url);
                        return;
                    case 'createTask':
                        TaskDetailsProvider.handleCreateTask(message.taskData);
                        return;
                    case 'updateTask':
                        TaskDetailsProvider.handleUpdateTask(message.taskId, message.taskData);
                        return;
                    case 'validateTask':
                        TaskDetailsProvider.handleValidateTask(message.taskId, message.commentText);
                        return;
                    case 'createJiraIssue':
                        TaskDetailsProvider.handleCreateJiraIssue(message.taskId);
                        return;
                    case 'createMeeting':
                        TaskDetailsProvider.handleCreateMeeting(message.taskId);
                        return;
                    case 'reactivateNotifications':
                        TaskDetailsProvider.handleReactivateNotifications(message.taskId);
                        return;
                }
            },
            undefined,
            undefined
        );

        // Clean up when the panel is disposed
        panel.onDidDispose(() => {
            TaskDetailsProvider.currentPanel = undefined;
            TaskDetailsProvider.currentTaskId = undefined;
        }, null);
    }

    /**
     * Shows create task form in a webview panel
     */
    public static showCreateTaskForm(extensionUri: vscode.Uri): void {
        // If we have an existing panel, reuse it
        if (TaskDetailsProvider.currentPanel) {
            TaskDetailsProvider.currentPanel.reveal(vscode.ViewColumn.One);
            TaskDetailsProvider.currentPanel.title = l10n.t('webview.createTask.title');
            TaskDetailsProvider.currentPanel.webview.html = TaskDetailsProvider.getCreateTaskWebviewContent(TaskDetailsProvider.currentPanel.webview, extensionUri);
            return;
        }

        // Create a new panel if none exists
        const panel = vscode.window.createWebviewPanel(
            TaskDetailsProvider.viewType,
            l10n.t('webview.createTask.title'),
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        // Store reference to the panel
        TaskDetailsProvider.currentPanel = panel;

        panel.webview.html = TaskDetailsProvider.getCreateTaskWebviewContent(panel.webview, extensionUri);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'close':
                        panel.dispose();
                        return;
                    case 'createTask':
                        TaskDetailsProvider.handleCreateTask(message.taskData);
                        return;
                }
            },
            undefined,
            undefined
        );

        // Clean up when the panel is disposed
        panel.onDidDispose(() => {
            TaskDetailsProvider.currentPanel = undefined;
            TaskDetailsProvider.currentTaskId = undefined;
        }, null);
    }

    /**
     * Handles adding a new comment
     */
    private static handleAddComment(taskId: string, commentText: string): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        const updatedTask = TaskDetailsProvider.taskManager.addComment(taskId, commentText);
        if (updatedTask) {
            TaskDetailsProvider.refreshPanel(updatedTask);
            TaskDetailsProvider.refreshTaskProvider();
        } else {
            vscode.window.showErrorMessage('Failed to add comment');
        }
    }

    /**
     * Handles updating a comment
     */
    private static handleUpdateComment(taskId: string, commentId: string, commentText: string): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        const updatedTask = TaskDetailsProvider.taskManager.updateComment(taskId, commentId, commentText);
        if (updatedTask) {
            TaskDetailsProvider.refreshPanel(updatedTask);
            TaskDetailsProvider.refreshTaskProvider();
        } else {
            vscode.window.showErrorMessage('Failed to update comment');
        }
    }

    /**
     * Handles deleting a comment
     */
    private static handleDeleteComment(taskId: string, commentId: string): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        const updatedTask = TaskDetailsProvider.taskManager.deleteComment(taskId, commentId);
        if (updatedTask) {
            TaskDetailsProvider.refreshPanel(updatedTask);
            TaskDetailsProvider.refreshTaskProvider();
        } else {
            vscode.window.showErrorMessage('Failed to delete comment');
        }
    }

    /**
     * Handles confirming and deleting a comment
     */
    private static async handleConfirmDeleteComment(taskId: string, commentId: string): Promise<void> {
        const result = await vscode.window.showWarningMessage(
            l10n.t('webview.taskDetails.confirmDeleteComment'),
            { modal: true },
            l10n.t('common.delete')
        );

        if (result === l10n.t('common.delete')) {
            TaskDetailsProvider.handleDeleteComment(taskId, commentId);
        }
    }

    /**
     * Handles opening links in the default browser
     */
    private static async handleOpenLink(url: string): Promise<void> {
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url));
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open link: ${error}`);
        }
    }

    /**
     * Handles creating a new task
     */
    private static handleCreateTask(taskData: any): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        try {
            const { title, description, periodicity, dueDate } = taskData;
            
            if (!title || !periodicity || !dueDate) {
                vscode.window.showErrorMessage('Missing required task data');
                return;
            }

            const newTask = TaskDetailsProvider.taskManager.addTask(
                title,
                periodicity,
                new Date(dueDate),
                description
            );

            if (newTask) {
                TaskDetailsProvider.refreshTaskProvider();
                vscode.window.showInformationMessage(`Task "${title}" created successfully`);
                
                // Close the current panel if it's a create task panel
                if (TaskDetailsProvider.currentPanel) {
                    TaskDetailsProvider.currentPanel.dispose();
                }
            } else {
                vscode.window.showErrorMessage('Failed to create task');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating task: ${error}`);
        }
    }

    /**
     * Handles updating an existing task
     */
    private static handleUpdateTask(taskId: string, taskData: any): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        try {
            // Convert date strings back to Date objects if they exist
            const processedTaskData = { ...taskData };
            
            if (processedTaskData.dueDate && typeof processedTaskData.dueDate === 'string') {
                processedTaskData.dueDate = new Date(processedTaskData.dueDate);
            }
            
            if (processedTaskData.creationDate && typeof processedTaskData.creationDate === 'string') {
                processedTaskData.creationDate = new Date(processedTaskData.creationDate);
            }

            const updatedTask = TaskDetailsProvider.taskManager.updateTask(taskId, processedTaskData);
            
            if (updatedTask) {
                TaskDetailsProvider.refreshPanel(updatedTask);
                TaskDetailsProvider.refreshTaskProvider();
                vscode.window.showInformationMessage('Task updated successfully');
            } else {
                vscode.window.showErrorMessage('Failed to update task');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error updating task: ${error}`);
        }
    }

    /**
     * Handles validating a task (completing it and setting next due date)
     */
    private static handleValidateTask(taskId: string, commentText: string): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        const updatedTask = TaskDetailsProvider.taskManager.validateTask(taskId, commentText);
        if (updatedTask) {
            TaskDetailsProvider.refreshPanel(updatedTask);
            TaskDetailsProvider.refreshTaskProvider();
            vscode.window.showInformationMessage('Task validated successfully');
        } else {
            vscode.window.showErrorMessage('Failed to validate task');
        }
    }

    /**
     * Handles creating a JIRA issue from a task
     */
    private static handleCreateJiraIssue(taskId: string): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        const task = TaskDetailsProvider.taskManager.getTask(taskId);
        if (!task) {
            vscode.window.showErrorMessage('Task not found');
            return;
        }

        // Execute the JIRA command with the task
        vscode.commands.executeCommand('recurringtasks.createJiraIssue', {
            task: task,
            label: task.title,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        });
    }

    /**
     * Handles creating a meeting from a task
     */
    private static handleCreateMeeting(taskId: string): void {
        if (!TaskDetailsProvider.taskManager) {
            vscode.window.showErrorMessage('Task manager not available');
            return;
        }

        const task = TaskDetailsProvider.taskManager.getTask(taskId);
        if (!task) {
            vscode.window.showErrorMessage('Task not found');
            return;
        }

        // Execute the meeting command with the task
        vscode.commands.executeCommand('recurringtasks.createOutlookMeeting', {
            task: task,
            label: task.title,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        });
    }

    /**
     * Handles reactivating notifications for a task
     */
    private static async handleReactivateNotifications(taskId: string): Promise<void> {
        try {
            if (!TaskDetailsProvider.notificationManager) {
                vscode.window.showErrorMessage('Notification manager not available');
                return;
            }

            await TaskDetailsProvider.notificationManager.reactivateNotificationsForTask(taskId);
            
            // Refresh the panel to show updated notification state
            const task = TaskDetailsProvider.taskManager.getTasks().find(t => t.id === taskId);
            if (task) {
                TaskDetailsProvider.refreshPanel(task);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to reactivate notifications: ${error}`);
        }
    }

    /**
     * Refreshes the panel with updated task data
     */
    private static refreshPanel(task: Task): void {
        if (TaskDetailsProvider.currentPanel) {
            // Update the current task ID
            TaskDetailsProvider.currentTaskId = task.id;
            
            TaskDetailsProvider.currentPanel.title = `Task: ${task.title}`;
            TaskDetailsProvider.currentPanel.webview.html = TaskDetailsProvider.getWebviewContent(
                task, 
                TaskDetailsProvider.currentPanel.webview, 
                vscode.Uri.file(__dirname)
            );
        }
    }

    /**
     * Refreshes the task provider and calendar
     */
    private static refreshTaskProvider(): void {
        if (TaskDetailsProvider.taskProvider && TaskDetailsProvider.taskManager) {
            const tasks = TaskDetailsProvider.taskManager.getTasks();
            TaskDetailsProvider.taskProvider.refresh();
        }
        if (TaskDetailsProvider.calendarProvider) {
            TaskDetailsProvider.calendarProvider.refresh();
        }
    }

    /**
     * Refreshes the webview when notification settings change
     */
    public static refreshWebviewForNotificationChange(): void {
        if (TaskDetailsProvider.currentPanel && TaskDetailsProvider.taskManager && TaskDetailsProvider.currentTaskId) {
            // Find the task by ID
            const task = TaskDetailsProvider.taskManager.getTasks().find(t => t.id === TaskDetailsProvider.currentTaskId);
            if (task) {
                TaskDetailsProvider.refreshPanel(task);
            }
        }
    }

    /**
     * Escapes a string for safe insertion into JavaScript
     */
    private static escapeForJavaScript(str: string): string {
        if (typeof str !== 'string') {
            return '';
        }
        
        return str
            .replace(/\\/g, '\\\\')      // Escape backslashes first
            .replace(/'/g, "\\'")        // Escape single quotes
            .replace(/"/g, '\\"')        // Escape double quotes
            .replace(/\n/g, '\\n')       // Escape newlines
            .replace(/\r/g, '\\r')       // Escape carriage returns
            .replace(/\t/g, '\\t')       // Escape tabs
            .replace(/\f/g, '\\f')       // Escape form feeds
            .replace(/\v/g, '\\v')       // Escape vertical tabs
            .replace(/\b/g, '\\b')       // Escape backspace
            .replace(/\0/g, '\\0')       // Escape null bytes
            .replace(/</g, '\\u003C')    // Escape < to prevent HTML injection
            .replace(/>/g, '\\u003E')    // Escape > to prevent HTML injection
            .replace(/&/g, '\\u0026');   // Escape & to prevent HTML injection
    }

    /**
     * Escapes a string for safe insertion into HTML
     */
    private static escapeForHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')   // Escape ampersands first
            .replace(/</g, '&lt;')    // Escape less than
            .replace(/>/g, '&gt;')    // Escape greater than
            .replace(/"/g, '&quot;')  // Escape double quotes
            .replace(/'/g, '&#39;');  // Escape single quotes
    }

    /**
     * Generates the HTML content for the webview
     */
    private static getWebviewContent(task: Task, webview: vscode.Webview, extensionUri: vscode.Uri): string {
        // Get user's locale from VS Code
        const userLocale = vscode.env.language || 'en-US';
        
        const formatDate = (date: Date) => {
            return date.toLocaleDateString(userLocale) + ' ' + date.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit' });
        };

        const formatPeriodicity = (periodicity: any) => {
            // Use proper translations for periodicity types
            switch (periodicity.type) {
                case 'none':
                    return l10n.t('webview.taskDetails.periodicityDescriptions.oneShotTask');
                case 'daily':
                    return l10n.t('webview.taskDetails.periodicityDescriptions.daily');
                case 'weekly':
                    return l10n.t('webview.taskDetails.periodicityDescriptions.weekly');
                case 'monthly':
                    return l10n.t('webview.taskDetails.periodicityDescriptions.monthly');
                case 'yearly':
                    return l10n.t('webview.taskDetails.periodicityDescriptions.yearly');
                case 'custom':
                    if (periodicity.interval) {
                        return l10n.t('webview.taskDetails.periodicityDescriptions.everyDays', periodicity.interval);
                    }
                    return l10n.t('webview.taskDetails.periodicityDescriptions.everyDays', 1);
                default:
                    // Fallback for old format (should be migrated)
                    if (periodicity.unit === 'one-shot') {
                        return l10n.t('webview.taskDetails.periodicityDescriptions.oneShotTask');
                    }
                    return `${periodicity.value} ${periodicity.unit}`;
            }
        };

        const getStatusClass = () => {
            if (TaskStatusUtil.isOverdue(task)) {return 'overdue';}
            if (TaskStatusUtil.isDueSoon(task)) {return 'due-soon';}
            return 'normal';
        };

        // Function to convert URLs to clickable links
        const convertUrlsToLinks = (text: string): string => {
            // First escape the text to prevent XSS
            const escapedText = TaskDetailsProvider.escapeForHtml(text);
            
            // URL regex pattern that matches http, https, ftp, and www URLs
            const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+)/gi;
            return escapedText.replace(urlRegex, (url) => {
                // Ensure URLs have a protocol
                const fullUrl = url.startsWith('www.') ? 'https://' + url : url;
                return `<a href="${fullUrl}" class="clickable-link" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });
        };

        const getStatusInfo = () => {
            // For archived one-shot tasks, show completion message
            if (task.status === 'archived' && (!task.periodicity.isRecurring || task.periodicity.type === 'none')) {
                return {
                    name: l10n.t('taskStatus.oneShotCompleted'),
                    timeRemaining: l10n.t('taskStatus.oneShotCompleted'),
                    class: 'normal',
                    description: l10n.t('taskStatus.oneShotCompleted')
                };
            }
            
            const progress = TaskStatusUtil.getTimeProgress(task);
            
            if (TaskStatusUtil.isOverdue(task)) {
                // Overdue
                if (progress >= 100) {
                    return {
                        name: l10n.t('webview.taskDetails.status.overdueComplete'),
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'overdue',
                        description: l10n.t('webview.taskDetails.status.periodCompleteOverdue')
                    };
                } else {
                    return {
                        name: l10n.t('webview.taskDetails.status.overdueInProgress'),
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'overdue',
                        description: l10n.t('webview.taskDetails.status.percentCompleteOverdue', progress)
                    };
                }
            } else if (TaskStatusUtil.isDueSoon(task)) {
                // Due soon
                if (progress >= 80) {
                    return {
                        name: l10n.t('webview.taskDetails.status.dueSoonNearlyComplete'),
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'due-soon',
                        description: l10n.t('webview.taskDetails.status.percentCompleteDueSoon', progress)
                    };
                } else {
                    return {
                        name: l10n.t('webview.taskDetails.status.dueSoonNeedsAttention'),
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'due-soon',
                        description: l10n.t('webview.taskDetails.status.percentCompleteDueSoon', progress)
                    };
                }
            } else {
                // On track
                if (progress >= 100) {
                    return {
                        name: l10n.t('webview.taskDetails.status.complete'),
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'normal',
                        description: l10n.t('webview.taskDetails.status.periodComplete')
                    };
                } else if (progress >= 50) {
                    return {
                        name: l10n.t('webview.taskDetails.status.onTrackGoodProgress'),
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'normal',
                        description: l10n.t('webview.taskDetails.status.percentCompleteOnTrack', progress)
                    };
                } else {
                    return {
                        name: l10n.t('webview.taskDetails.status.onTrackEarlyStage'),
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'normal',
                        description: l10n.t('webview.taskDetails.status.percentCompleteOnTrack', progress)
                    };
                }
            }
        };

        const getNotificationInfo = () => {
            if (!TaskDetailsProvider.notificationManager) {
                return {
                    hasState: false,
                    notificationCount: 0,
                    lastNotificationTime: null,
                    isOverdue: false,
                    canReceiveNotifications: true,
                    message: l10n.t('webview.taskDetails.notificationManagerUnavailable')
                };
            }

            const stats = TaskDetailsProvider.notificationManager.getNotificationStats();
            const settings = stats.settings;
            
            // Check if notifications are globally disabled
            if (!settings.enabled) {
                return {
                    hasState: false,
                    notificationCount: 0,
                    lastNotificationTime: null,
                    isOverdue: false,
                    canReceiveNotifications: false,
                    message: l10n.t('webview.taskDetails.notificationDisabled')
                };
            }

            // Check if frequency is disabled
            if (settings.frequency === 'disabled') {
                return {
                    hasState: false,
                    notificationCount: 0,
                    lastNotificationTime: null,
                    isOverdue: false,
                    canReceiveNotifications: false,
                    message: l10n.t('webview.taskDetails.notificationFreencyDisabled')
                };
            }

            // Get notification state for this specific task
            const notificationStates = (TaskDetailsProvider.notificationManager as any).notificationStates;
            const taskState = notificationStates.get(task.id);
            
            if (!taskState) {
                return {
                    hasState: false,
                    notificationCount: 0,
                    lastNotificationTime: null,
                    isOverdue: false,
                    canReceiveNotifications: true,
                    message: l10n.t('webview.taskDetails.notificationActive')
                };
            }

            // Check if max notifications reached
            const maxReached = taskState.notificationCount >= settings.maxNotificationsPerTask;
            
            return {
                hasState: true,
                notificationCount: taskState.notificationCount,
                lastNotificationTime: taskState.lastNotificationTime,
                isOverdue: taskState.isOverdue,
                canReceiveNotifications: !maxReached,
                message: maxReached 
                    ? l10n.t('webview.taskDetails.notificationMaxReached', taskState.notificationCount, settings.maxNotificationsPerTask)
                    : l10n.t('webview.taskDetails.notificationCurrent', taskState.notificationCount, settings.maxNotificationsPerTask)
            };
        };

        const commentsHtml = task.comments.length > 0 
            ? [...task.comments].reverse().map(comment => `
                <div class="comment ${comment.isValidation ? 'validation-comment' : 'regular-comment'}" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <div class="comment-info">
                            <span class="comment-date">${formatDate(comment.date)}</span>
                            ${comment.isValidation ? `<span class="validation-badge">✓ ${l10n.t('webview.taskDetails.validationBadge')}</span>` : ''}
                        </div>
                        <div class="comment-actions">
                            <button class="edit-comment-btn codicon codicon-edit" onclick="editComment('${comment.id}')" title="${l10n.t('webview.taskDetails.editComment')}"></button>
                            <button class="delete-comment-btn codicon codicon-trash" onclick="deleteComment('${comment.id}')" title="${l10n.t('webview.taskDetails.deleteComment')}"></button>
                        </div>
                    </div>
                    <div class="comment-content" id="comment-content-${comment.id}">${convertUrlsToLinks(comment.text)}</div>
                    <div class="comment-edit-form" id="comment-edit-${comment.id}" style="display: none;">
                        <textarea class="comment-edit-textarea" id="comment-edit-textarea-${comment.id}">${TaskDetailsProvider.escapeForHtml(comment.text)}</textarea>
                        <div class="comment-edit-actions">
                            <button class="save-comment-btn" onclick="saveComment('${comment.id}')">
                                <span class="codicon codicon-check"></span>
                                ${l10n.t('webview.taskDetails.saveComment')}
                            </button>
                            <button class="cancel-comment-btn" onclick="cancelEdit('${comment.id}')">
                                <span class="codicon codicon-close"></span>
                                ${l10n.t('webview.taskDetails.cancelEdit')}
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')
            : `<p class="no-comments">${l10n.t('webview.taskDetails.noComments')}</p>`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; script-src 'unsafe-inline'; img-src 'self' data: https:; connect-src 'none';">
    <title>${l10n.t('webview.taskDetails.title')}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.35/dist/codicon.css">
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
            box-sizing: border-box;
            max-width: 100vw;
            overflow-x: hidden;
        }

        * {
            box-sizing: border-box;
        }

        .task-header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
            position: relative;
        }

        .task-header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
        }

        .task-header-main {
            flex: 1;
        }

        .task-header-actions {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            padding-top: 5px;
        }

        .task-title {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-editor-foreground);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .task-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
            display: inline-flex;
            align-items: flex-start;
            gap: 10px;
        }

        .task-description #task-description-display {
            flex: 1;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
        }

        .compact-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin: 15px 0;
            padding: 10px 0;
            border-top: 1px solid var(--vscode-panel-border);
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .compact-meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9em;
        }

        .meta-icon {
            font-size: 1em;
            opacity: 0.8;
        }

        .meta-info {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--vscode-foreground);
        }

        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
        }

        .status-badge.overdue {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-activityBarBadge-foreground);
        }

        .status-badge.due-soon {
            background-color: var(--vscode-notificationsWarningIcon-foreground);
            color: var(--vscode-activityBarBadge-foreground);
        }

        .status-badge.normal {
            background-color: var(--vscode-activityBarBadge-background);
            color: var(--vscode-activityBarBadge-foreground);
        }

        .notification-active {
            color: var(--vscode-foreground);
        }

        .notification-disabled {
            color: var(--vscode-descriptionForeground);
            opacity: 0.7;
        }

        .notification-display small {
            font-size: 0.8em;
            opacity: 0.8;
        }

        .comments-section {
            margin-top: 30px;
        }

        .comments-header {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-editor-foreground);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .comments-filter {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            font-size: 0.85em;
        }

        .filter-toggle {
            display: flex;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            padding: 1px;
            border: 1px solid var(--vscode-panel-border);
        }

        .filter-option {
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.85em;
            transition: all 0.2s ease;
            border: none;
            background: none;
            color: var(--vscode-descriptionForeground);
        }

        .filter-option.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .filter-option:hover:not(.active) {
            background-color: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-foreground);
        }

        .comment.hidden {
            display: none;
        }

        .add-comment-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            box-sizing: border-box;
        }

        .add-comment-textarea {
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: vertical;
            margin-bottom: 10px;
            box-sizing: border-box;
            max-width: 100%;
        }

        .add-comment-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .add-comment-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .comment {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 3px solid var(--vscode-activityBarBadge-background);
        }

        .validation-comment {
            border-left: 3px solid var(--vscode-testing-iconPassed);
            background-color: var(--vscode-testing-iconPassed);
            background-color: rgba(0, 255, 0, 0.05);
        }

        .regular-comment {
            border-left: 3px solid var(--vscode-activityBarBadge-background);
        }

        .comment-header {
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .comment-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .validation-badge {
            background-color: var(--vscode-testing-iconPassed);
            color: var(--vscode-activityBarBadge-foreground);
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.7em;
            font-weight: 500;
        }

        .comment-date {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
        }

        .comment-actions {
            display: flex;
            gap: 5px;
        }

        .edit-comment-btn,
        .delete-comment-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1em;
            padding: 4px;
            border-radius: 3px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
        }

        .edit-comment-btn:hover,
        .delete-comment-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-foreground);
        }

        .comment-content {
            color: var(--vscode-editor-foreground);
            white-space: pre-wrap;
        }

        .comment-edit-form {
            margin-top: 10px;
        }

        .comment-edit-textarea {
            width: 100%;
            min-height: 60px;
            padding: 8px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: vertical;
            margin-bottom: 8px;
            box-sizing: border-box;
            max-width: 100%;
        }

        .comment-edit-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .save-comment-btn,
        .cancel-comment-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .save-comment-btn:hover,
        .cancel-comment-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .cancel-comment-btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .cancel-comment-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .no-comments {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            text-align: center;
            padding: 20px;
        }

        .periodicity-value {
            font-weight: bold;
        }

        .periodicity-unit {
            text-transform: capitalize;
        }

        .status-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .time-remaining {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
        }

        .status-icon {
            font-size: 1.2em;
            margin-right: 8px;
        }

        .status-icon.overdue {
            color: var(--vscode-errorForeground);
        }

        .status-icon.due-soon {
            color: var(--vscode-notificationsWarningIcon-foreground);
        }

        .status-icon.normal {
            color: var(--vscode-testing-iconPassed);
        }

        .status-header {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }

        .task-icon {
            font-size: 1.5em;
        }

        .task-icon.overdue {
            color: var(--vscode-errorForeground);
        }

        .task-icon.due-soon {
            color: var(--vscode-notificationsWarningIcon-foreground);
        }

        .task-icon.normal {
            color: var(--vscode-testing-iconPassed);
        }

        .time-progress {
            margin-top: 10px;
            padding: 15px;
            background: linear-gradient(135deg, var(--vscode-editor-inactiveSelectionBackground) 0%, var(--vscode-editor-background) 100%);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }

        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .progress-fill.overdue {
            background: linear-gradient(90deg, var(--vscode-errorForeground) 0%, #ff6b6b 100%);
        }

        .progress-fill.due-soon {
            background: linear-gradient(90deg, #ffa726 0%, #ff9800 100%);
        }

        .progress-fill.normal {
            background: linear-gradient(90deg, var(--vscode-testing-iconPassed) 0%, #6bcf7f 100%);
        }

        .time-visual {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 10px 0;
            gap: 10px;
        }

        .time-circle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9em;
            position: relative;
            border: 3px solid;
        }

        .time-circle.overdue {
            background: var(--vscode-errorForeground);
            color: white;
            border-color: var(--vscode-errorForeground);
        }

        .time-circle.due-soon {
            background: var(--vscode-notificationsWarningIcon-foreground);
            color: white;
            border-color: var(--vscode-notificationsWarningIcon-foreground);
        }

        .time-circle.normal {
            background: var(--vscode-testing-iconPassed);
            color: white;
            border-color: var(--vscode-testing-iconPassed);
        }

        .time-circle::before {
            content: '';
            position: absolute;
            top: -3px;
            left: -3px;
            right: -3px;
            bottom: -3px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, transparent 0deg, currentColor 360deg);
            opacity: 0.2;
        }

        .time-details {
            display: flex;
            flex-direction: column;
            gap: 5px;
            flex: 1;
        }

        .time-label {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .time-value {
            font-size: 1.1em;
            font-weight: bold;
            color: var(--vscode-editor-foreground);
        }

        .visual-section {
            margin: 20px 0;
        }

        .visual-title {
            font-size: 1.1em;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-editor-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-progress-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .progress-percentage {
            font-size: 0.9em;
            font-weight: bold;
            color: var(--vscode-editor-foreground);
        }

        .progress-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
        }

        .progress-start {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
        }

        .progress-end {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
        }

        .clickable-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
        }

        .clickable-link:hover {
            color: var(--vscode-textLink-activeForeground);
        }

        .edit-btn {
            background: none;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            padding: 2px;
            border-radius: 3px;
            margin-left: 8px;
        }

        .edit-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-foreground);
        }

        .edit-form {
            display: none;
            margin-top: 10px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }

        .edit-form.show {
            display: block;
        }

        .hidden {
            display: none !important;
        }

        .edit-form-group {
            margin-bottom: 15px;
        }

        .edit-form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: var(--vscode-editor-foreground);
        }

        .edit-form-input {
            width: 100%;
            padding: 6px 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        .edit-form-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .edit-form-textarea {
            width: 100%;
            min-height: 80px;
            padding: 6px 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            resize: vertical;
        }

        .edit-form-textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .edit-form-select {
            width: 100%;
            padding: 6px 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        .edit-form-select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .edit-periodicity-group {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 8px;
            align-items: end;
        }

        .edit-form-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .edit-btn-small {
            padding: 4px 8px;
            border: none;
            border-radius: 3px;
            font-family: var(--vscode-font-family);
            font-size: 0.9em;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .edit-btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .edit-btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .edit-btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .edit-btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .validate-task-section {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            border-left: 4px solid var(--vscode-testing-iconPassed);
        }

        .validate-task-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-editor-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .validate-task-description {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
        }

        .add-comment-section {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            box-sizing: border-box;
        }

        .validate-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .secondary-actions {
            display: flex;
            gap: 10px;
        }

        .secondary-btn {
            padding: 6px 8px;
            border: none;
            border-radius: 4px;
            background-color: var(--vscode-toolbar-hoverBackground);
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            min-width: 32px;
            height: 32px;
        }

        .secondary-btn:hover {
            background-color: var(--vscode-toolbar-activeBackground);
            color: var(--vscode-foreground);
        }

        .jira-secondary-btn:hover {
            background-color: #ff6b6b;
            color: white;
        }

        .meeting-secondary-btn:hover {
            background-color: #4ecdc4;
            color: white;
        }
    </style>
</head>
<body>
    <div class="task-header">
        <div class="task-header-content">
            <div class="task-header-main">
                <div class="task-title">
                    <span class="task-icon ${getStatusClass()}">${getStatusClass() === 'overdue' ? '🔴' : getStatusClass() === 'due-soon' ? '🟡' : '✅'}</span>
                    <span id="task-title-display">${TaskDetailsProvider.escapeForHtml(task.title)}</span>
                    <button class="edit-btn codicon codicon-edit" onclick="editTaskTitle()" title="${l10n.t('webview.taskDetails.buttons.editTitle')}"></button>
                </div>
                <div class="edit-form" id="title-edit-form">
                    <div class="edit-form-group">
                        <label class="edit-form-label">${l10n.t('webview.taskDetails.labels.taskTitle')}</label>
                        <input type="text" id="title-edit-input" class="edit-form-input" value="${TaskDetailsProvider.escapeForHtml(task.title)}">
                    </div>
                    <div class="edit-form-actions">
                        <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditTitle()">${l10n.t('common.cancel')}</button>
                        <button class="edit-btn-small edit-btn-primary" onclick="saveTaskTitle()">${l10n.t('common.save')}</button>
                    </div>
                </div>
                
                <div class="task-description">
                    <span id="task-description-display">${task.description ? convertUrlsToLinks(task.description) : `<em>${l10n.t('webview.taskDetails.placeholders.noDescription')}</em>`}</span>
                    <button class="edit-btn codicon codicon-edit" onclick="editTaskDescription()" title="${l10n.t('webview.taskDetails.buttons.editDescription')}"></button>
                </div>
                <div class="edit-form" id="description-edit-form">
                    <div class="edit-form-group">
                        <label class="edit-form-label">${l10n.t('webview.taskDetails.labels.taskDescription')}</label>
                        <textarea id="description-edit-textarea" class="edit-form-textarea">${TaskDetailsProvider.escapeForHtml(task.description || '')}</textarea>
                    </div>
                    <div class="edit-form-actions">
                        <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditDescription()">${l10n.t('common.cancel')}</button>
                        <button class="edit-btn-small edit-btn-primary" onclick="saveTaskDescription()">${l10n.t('common.save')}</button>
                    </div>
                </div>
            </div>
            <div class="task-header-actions">
                <button class="secondary-btn jira-secondary-btn" onclick="createJiraIssue()" title="${l10n.t('webview.taskDetails.createJiraIssue')}">
                    <span class="codicon codicon-bug"></span>
                </button>
                <button class="secondary-btn meeting-secondary-btn" onclick="createMeeting()" title="${l10n.t('webview.taskDetails.createMeeting')}">
                    <span class="codicon codicon-calendar"></span>
                </button>
            </div>
        </div>
    </div>

    <div class="visual-section">
        <div class="visual-title">
            <span>📊</span>
            ${l10n.t('webview.taskDetails.labels.statusProgress')}
        </div>
        <div class="time-progress">
            <div class="status-progress-header">
                <div class="status-badge ${getStatusInfo().class}">${TaskDetailsProvider.escapeForHtml(getStatusInfo().name)}</div>
            </div>
            
            <div class="compact-meta">
                <div class="compact-meta-item">
                    <span class="meta-icon">🔄</span>
                    <span class="meta-info">
                        <span id="periodicity-display">
                            <span class="periodicity-value">${TaskDetailsProvider.escapeForHtml(formatPeriodicity(task.periodicity))}</span>
                        </span>
                        <button class="edit-btn codicon codicon-edit" onclick="editTaskPeriodicity()" title="${l10n.t('webview.taskDetails.buttons.editPeriodicity')}"></button>
                    </span>
                </div>
                <div class="compact-meta-item">
                    <span class="meta-icon">⏰</span>
                    <span class="meta-info">
                        <span id="due-date-display">
                            ${l10n.t('webview.taskDetails.labels.due')} ${formatDate(task.dueDate)}
                            ${!task.periodicity.isRecurring || task.periodicity.type === 'none' 
                                ? ` (${l10n.t('webview.taskDetails.labels.created')} ${formatDate(task.creationDate)})` 
                                : ''
                            }
                        </span>
                        <button class="edit-btn codicon codicon-edit" onclick="editTaskDueDate()" title="${l10n.t('webview.taskDetails.buttons.editDueDate')}"></button>
                    </span>
                </div>
                <div class="compact-meta-item">
                    <span class="meta-icon">🔔</span>
                    <span class="meta-info">
                        <span id="notification-display" class="${getNotificationInfo().canReceiveNotifications ? 'notification-active' : 'notification-disabled'}">
                            ${TaskDetailsProvider.escapeForHtml(getNotificationInfo().message)}
                            ${getNotificationInfo().hasState && getNotificationInfo().lastNotificationTime 
                                ? `<br><small>${l10n.t('webview.taskDetails.labels.last')} ${formatDate(getNotificationInfo().lastNotificationTime)}</small>` 
                                : ''
                            }
                        </span>
                        ${getNotificationInfo().hasState ? 
                            `<button class="edit-btn codicon codicon-refresh" onclick="reactivateNotifications()" title="${l10n.t('webview.taskDetails.buttons.reactivateNotifications')}"></button>` 
                            : ''
                        }
                    </span>
                </div>
            </div>
            
            <div class="time-visual">
                <div class="time-circle ${getStatusClass()}">${TaskStatusUtil.getTimeProgress(task)}%</div>
                <div class="time-details">
                    <div class="time-label">${l10n.t('webview.taskDetails.labels.timeRemaining')}</div>
                    <div class="time-value">${TaskDetailsProvider.escapeForHtml(getStatusInfo().timeRemaining)}</div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${getStatusClass()}" style="width: ${TaskStatusUtil.getTimeProgress(task)}%"></div>
            </div>
        </div>
    </div>

    <div class="edit-form" id="periodicity-edit-form">
        <div class="edit-form-group">
            <label class="edit-form-label">${l10n.t('webview.taskDetails.labels.periodicityType')}</label>
            <select id="periodicity-type" class="edit-form-select" onchange="handlePeriodicityTypeChange()">
                <option value="none" ${task.periodicity.type === 'none' ? 'selected' : ''}>${l10n.t('webview.taskDetails.periodicityOptions.oneShot')}</option>
                <option value="daily" ${task.periodicity.type === 'daily' ? 'selected' : ''}>${l10n.t('webview.taskDetails.periodicityOptions.daily')}</option>
                <option value="weekly" ${task.periodicity.type === 'weekly' ? 'selected' : ''}>${l10n.t('webview.taskDetails.periodicityOptions.weekly')}</option>
                <option value="monthly" ${task.periodicity.type === 'monthly' ? 'selected' : ''}>${l10n.t('webview.taskDetails.periodicityOptions.monthly')}</option>
                <option value="yearly" ${task.periodicity.type === 'yearly' ? 'selected' : ''}>${l10n.t('webview.taskDetails.periodicityOptions.yearly')}</option>
                <option value="custom" ${task.periodicity.type === 'custom' ? 'selected' : ''}>${l10n.t('webview.taskDetails.periodicityOptions.custom')}</option>
            </select>
        </div>
        <div class="edit-form-group" id="custom-interval-group" style="display: ${task.periodicity.type === 'custom' ? 'block' : 'none'};">
            <label class="edit-form-label">${l10n.t('webview.taskDetails.labels.customInterval')}</label>
            <input type="number" id="periodicity-interval" class="edit-form-input" value="${TaskDetailsProvider.escapeForHtml(String(task.periodicity.interval || 1))}">
        </div>
        <div class="edit-form-actions">
            <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditPeriodicity()">${l10n.t('common.cancel')}</button>
            <button class="edit-btn-small edit-btn-primary" onclick="saveTaskPeriodicity()">${l10n.t('common.save')}</button>
        </div>
    </div>

    <div class="edit-form" id="due-date-edit-form">
        <div class="edit-form-group">
            <label class="edit-form-label">${l10n.t('webview.taskDetails.labels.nextDueDate')}</label>
            <input type="datetime-local" id="due-date-edit-input" class="edit-form-input" value="${TaskDetailsProvider.escapeForHtml(task.dueDate.toISOString().slice(0, 16))}">
        </div>
        <div class="edit-form-actions">
            <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditDueDate()">${l10n.t('common.cancel')}</button>
            <button class="edit-btn-small edit-btn-primary" onclick="saveTaskDueDate()">${l10n.t('common.save')}</button>
        </div>
    </div>

    <div class="validate-task-section">
        <div class="validate-task-title">
            <span class="codicon codicon-check"></span>
            ${l10n.t('webview.taskDetails.validation.title')}
        </div>
        <div class="validate-task-description">
            ${!task.periodicity.isRecurring || task.periodicity.type === 'none'
                ? l10n.t('webview.taskDetails.validation.description.oneShot')
                : l10n.t('webview.taskDetails.validation.description.recurring')
            }
        </div>
        <div class="add-comment-section">
            <textarea class="add-comment-textarea" id="validate-comment-textarea" placeholder="${l10n.t('webview.taskDetails.validateCommentPlaceholder')}"></textarea>
            <button class="add-comment-btn" onclick="validateTask()">
                <span class="codicon codicon-check"></span>
                ${l10n.t('webview.taskDetails.validateTask')}
            </button>
        </div>
    </div>

    <div class="comments-section">
        <div class="comments-header">
            <span class="comments-icon">💬</span>
            ${l10n.t('webview.taskDetails.labels.comments')} (${task.comments.length})
        </div>
        
        <div class="comments-filter">
            <span style="color: var(--vscode-descriptionForeground);">${l10n.t('webview.taskDetails.labels.filter')}</span>
            <div class="filter-toggle">
                <button class="filter-option active" id="filter-all" onclick="filterComments('all')">${l10n.t('webview.taskDetails.allComments')}</button>
                <button class="filter-option" id="filter-validation" onclick="filterComments('validation')">${l10n.t('webview.taskDetails.labels.validation')} (${task.comments.filter(c => c.isValidation).length})</button>
            </div>
            <span style="color: var(--vscode-descriptionForeground); margin-left: auto;" id="comment-counter">
                ${l10n.t('webview.taskDetails.comments.count', task.comments.length)}
            </span>
        </div>
        
        <div class="add-comment-section">
            <textarea class="add-comment-textarea" id="new-comment-textarea" placeholder="${l10n.t('webview.taskDetails.placeholders.addNewComment')}"></textarea>
            <button class="add-comment-btn" onclick="addComment()">
                <span class="codicon codicon-add"></span>
                ${l10n.t('webview.taskDetails.addComment')}
            </button>
        </div>
        
        ${commentsHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const taskId = '${task.id}';
        
        // Add comment functionality
        function addComment() {
            const textarea = document.getElementById('new-comment-textarea');
            const commentText = textarea.value.trim();
            
            if (commentText) {
                vscode.postMessage({
                    command: 'addComment',
                    taskId: taskId,
                    commentText: commentText
                });
                textarea.value = '';
            }
        }
        
        // Edit comment functionality
        function editComment(commentId) {
            const commentContent = document.getElementById('comment-content-' + commentId);
            const editForm = document.getElementById('comment-edit-' + commentId);
            const textarea = document.getElementById('comment-edit-textarea-' + commentId);
            
            commentContent.style.display = 'none';
            editForm.style.display = 'block';
            textarea.focus();
        }
        
        // Save comment functionality
        function saveComment(commentId) {
            const textarea = document.getElementById('comment-edit-textarea-' + commentId);
            const commentText = textarea.value.trim();
            
            if (commentText) {
                vscode.postMessage({
                    command: 'updateComment',
                    taskId: taskId,
                    commentId: commentId,
                    commentText: commentText
                });
            }
        }
        
        // Cancel edit functionality
        function cancelEdit(commentId) {
            const commentContent = document.getElementById('comment-content-' + commentId);
            const editForm = document.getElementById('comment-edit-' + commentId);
            const textarea = document.getElementById('comment-edit-textarea-' + commentId);
            
            // Reset textarea to original content
            const originalContent = document.getElementById('comment-content-' + commentId).textContent;
            textarea.value = originalContent;
            
            commentContent.style.display = 'block';
            editForm.style.display = 'none';
        }
        
        // Delete comment functionality
        function deleteComment(commentId) {
            vscode.postMessage({
                command: 'confirmDeleteComment',
                taskId: taskId,
                commentId: commentId
            });
        }
        
        // Handle Enter key in add comment textarea
        document.getElementById('new-comment-textarea').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                addComment();
            }
        });
        
        // Handle Enter key in edit comment textareas
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey && e.target.classList.contains('comment-edit-textarea')) {
                const commentId = e.target.id.replace('comment-edit-textarea-', '');
                saveComment(commentId);
            }
        });
        
        // Handle link clicks
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('clickable-link')) {
                e.preventDefault();
                const url = e.target.href;
                vscode.postMessage({
                    command: 'openLink',
                    url: url
                });
            }
        });

        // Edit task title functionality
        function editTaskTitle() {
            document.getElementById('title-edit-form').classList.add('show');
            document.getElementById('title-edit-input').focus();
        }

        function cancelEditTitle() {
            document.getElementById('title-edit-form').classList.remove('show');
            document.getElementById('title-edit-input').value = '${TaskDetailsProvider.escapeForJavaScript(task.title)}';
        }

        function saveTaskTitle() {
            const newTitle = document.getElementById('title-edit-input').value.trim();
            if (newTitle) {
                vscode.postMessage({
                    command: 'updateTask',
                    taskId: taskId,
                    taskData: { title: newTitle }
                });
                document.getElementById('title-edit-form').classList.remove('show');
            }
        }

        // Edit task description functionality
        function editTaskDescription() {
            document.getElementById('description-edit-form').classList.add('show');
            document.getElementById('description-edit-textarea').focus();
        }

        function cancelEditDescription() {
            document.getElementById('description-edit-form').classList.remove('show');
        }

        function saveTaskDescription() {
            const newDescription = document.getElementById('description-edit-textarea').value.trim();
            vscode.postMessage({
                command: 'updateTask',
                taskId: taskId,
                taskData: { description: newDescription || '' }
            });
            document.getElementById('description-edit-form').classList.remove('show');
        }

        // Edit task periodicity functionality
        function editTaskPeriodicity() {
            document.getElementById('periodicity-edit-form').classList.add('show');
        }

        function cancelEditPeriodicity() {
            document.getElementById('periodicity-edit-form').classList.remove('show');
            document.getElementById('periodicity-type').value = '${TaskDetailsProvider.escapeForJavaScript(task.periodicity.type)}';
            document.getElementById('periodicity-interval').value = '${TaskDetailsProvider.escapeForJavaScript(String(task.periodicity.interval || 1))}';
            handlePeriodicityTypeChange();
        }

        function handlePeriodicityTypeChange() {
            const typeSelect = document.getElementById('periodicity-type');
            const customGroup = document.getElementById('custom-interval-group');
            
            if (typeSelect.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
        }

        function saveTaskPeriodicity() {
            const newType = document.getElementById('periodicity-type').value;
            const newInterval = parseInt(document.getElementById('periodicity-interval').value) || 1;
            
            if (newType) {
                const periodicityData = {
                    type: newType,
                    isRecurring: newType !== 'none'
                };

                if (newType === 'custom') {
                    periodicityData.interval = newInterval;
                    periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.everyDays', '{newInterval}')}';
                } else {
                    // Set description based on type
                    switch (newType) {
                        case 'none':
                            periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.oneShotTask')}';
                            break;
                        case 'daily':
                            periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.daily')}';
                            break;
                        case 'weekly':
                            periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.weekly')}';
                            break;
                        case 'monthly':
                            periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.monthly')}';
                            break;
                        case 'yearly':
                            periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.yearly')}';
                            break;
                    }
                }

                vscode.postMessage({
                    command: 'updateTask',
                    taskId: taskId,
                    taskData: { 
                        periodicity: periodicityData
                    }
                });
                document.getElementById('periodicity-edit-form').classList.remove('show');
            }
        }

        // Validate task functionality
        function validateTask() {
            const commentText = document.getElementById('validate-comment-textarea').value.trim();
            vscode.postMessage({
                command: 'validateTask',
                taskId: taskId,
                commentText: commentText
            });
            document.getElementById('validate-comment-textarea').value = '';
        }

        // Handle Enter key in validate comment textarea
        document.getElementById('validate-comment-textarea').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                validateTask();
            }
        });

        // Create JIRA issue functionality
        function createJiraIssue() {
            vscode.postMessage({
                command: 'createJiraIssue',
                taskId: taskId
            });
        }

        // Filter functionality
        function filterComments(filter) {
            const comments = document.querySelectorAll('.comment');
            const allBtn = document.getElementById('filter-all');
            const validationBtn = document.getElementById('filter-validation');
            
            // Update button states
            if (filter === 'all') {
                allBtn.classList.add('active');
                validationBtn.classList.remove('active');
            } else {
                allBtn.classList.remove('active');
                validationBtn.classList.add('active');
            }
            
            // Filter comments
            comments.forEach(comment => {
                if (filter === 'all' || (filter === 'validation' && comment.classList.contains('validation-comment'))) {
                    comment.classList.remove('hidden');
                } else {
                    comment.classList.add('hidden');
                }
            });

            // Update comment counter
            const commentCounter = document.getElementById('comment-counter');
            const visibleComments = document.querySelectorAll('.comment:not(.hidden)');
            commentCounter.textContent = '${l10n.t('webview.taskDetails.comments.count', '{count}')}' + visibleComments.length;
        }

        // Edit task due date functionality
        function editTaskDueDate() {
            document.getElementById('due-date-edit-form').classList.add('show');
            document.getElementById('due-date-edit-input').focus();
        }

        function cancelEditDueDate() {
            document.getElementById('due-date-edit-form').classList.remove('show');
            // Reset to original value
            document.getElementById('due-date-edit-input').value = '${TaskDetailsProvider.escapeForJavaScript(task.dueDate.toISOString().slice(0, 16))}';
        }

        function saveTaskDueDate() {
            const newDueDate = document.getElementById('due-date-edit-input').value;
            if (newDueDate) {
                vscode.postMessage({
                    command: 'updateTask',
                    taskId: taskId,
                    taskData: { dueDate: new Date(newDueDate).toISOString() }
                });
                document.getElementById('due-date-edit-form').classList.remove('show');
            }
        }

        // Create meeting functionality
        function createMeeting() {
            vscode.postMessage({
                command: 'createMeeting',
                taskId: taskId
            });
        }

        // Reactivate notifications functionality
        function reactivateNotifications() {
            vscode.postMessage({
                command: 'reactivateNotifications',
                taskId: taskId
            });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Generates the HTML content for the create task webview
     */
    private static getCreateTaskWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; script-src 'unsafe-inline'; img-src 'self' data: https:; connect-src 'none';">
    <title>${l10n.t('webview.createTask.title')}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons@0.0.35/dist/codicon.css">
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
            box-sizing: border-box;
            max-width: 100vw;
            overflow-x: hidden;
        }

        * {
            box-sizing: border-box;
        }

        .form-header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .form-title {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-editor-foreground);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: var(--vscode-editor-foreground);
        }

        .form-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        .form-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .form-textarea {
            width: 100%;
            min-height: 100px;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        .form-textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .form-select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        .form-select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .periodicity-group {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 10px;
            align-items: end;
        }

        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: background-color 0.2s;
        }

        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .error-message {
            color: var(--vscode-errorForeground);
            font-size: 0.9em;
            margin-top: 5px;
            display: none;
        }

        .required {
            color: var(--vscode-errorForeground);
        }
    </style>
</head>
<body>
    <div class="form-header">
        <div class="form-title">
            <span class="codicon codicon-add"></span>
            ${l10n.t('webview.createTask.header')}
        </div>
    </div>

    <form id="create-task-form">
        <div class="form-group">
            <label class="form-label" for="task-title">
                ${l10n.t('webview.createTask.labels.taskTitle')} <span class="required">*</span>
            </label>
            <input type="text" id="task-title" class="form-input" required placeholder="${l10n.t('webview.createTask.placeholders.enterTitle')}">
            <div class="error-message" id="title-error">${l10n.t('webview.createTask.errors.titleRequired')}</div>
        </div>

        <div class="form-group">
            <label class="form-label" for="task-description">
                ${l10n.t('webview.createTask.labels.description')}
            </label>
            <textarea id="task-description" class="form-textarea" placeholder="${l10n.t('webview.createTask.placeholders.enterDescription')}"></textarea>
            <div class="error-message" id="description-error">${l10n.t('webview.createTask.errors.descriptionRequired')}</div>
        </div>

        <div class="form-group">
            <label class="form-label">${l10n.t('webview.createTask.labels.periodicity')} <span class="required">*</span></label>
            <select id="periodicity-type" class="form-select" required onchange="handlePeriodicityTypeChange()">
                <option value="">${l10n.t('webview.createTask.placeholders.selectPeriodicity')}</option>
                <option value="none">${l10n.t('webview.taskDetails.periodicityOptions.oneShot')}</option>
                <option value="daily">${l10n.t('webview.taskDetails.periodicityOptions.daily')}</option>
                <option value="weekly">${l10n.t('webview.taskDetails.periodicityOptions.weekly')}</option>
                <option value="monthly">${l10n.t('webview.taskDetails.periodicityOptions.monthly')}</option>
                <option value="yearly">${l10n.t('webview.taskDetails.periodicityOptions.yearly')}</option>
                <option value="custom">${l10n.t('webview.taskDetails.periodicityOptions.custom')}</option>
            </select>
            <div class="error-message" id="periodicity-error">${l10n.t('webview.createTask.errors.periodicityRequired')}</div>
        </div>

        <div class="form-group" id="custom-interval-group" style="display: none;">
            <label class="form-label" for="custom-interval">
                ${l10n.t('webview.createTask.labels.customInterval')} <span class="required">*</span>
            </label>
            <input type="number" id="custom-interval" class="form-input" min="1" placeholder="${l10n.t('webview.createTask.placeholders.numberOfDays')}">
            <div class="error-message" id="custom-interval-error">${l10n.t('webview.createTask.errors.intervalRequired')}</div>
        </div>

        <div class="form-group">
            <label class="form-label" for="due-date">
                ${l10n.t('webview.createTask.labels.dueDate')} <span class="required">*</span>
            </label>
            <input type="datetime-local" id="due-date" class="form-input" required>
            <div class="error-message" id="due-date-error">${l10n.t('webview.createTask.errors.dueDateRequired')}</div>
        </div>

        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="cancelCreate()">
                <span class="codicon codicon-close"></span>
                ${l10n.t('common.cancel')}
            </button>
            <button type="submit" class="btn btn-primary">
                <span class="codicon codicon-check"></span>
                ${l10n.t('webview.createTask.createButton')}
            </button>
        </div>
    </form>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const localDateTime = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('due-date').value = localDateTime;
        
        // Form submission
        document.getElementById('create-task-form').addEventListener('submit', function(e) {
            e.preventDefault();
            createTask();
        });
        
        function handlePeriodicityTypeChange() {
            const typeSelect = document.getElementById('periodicity-type');
            const customGroup = document.getElementById('custom-interval-group');
            
            if (typeSelect.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
        }

        function createTask() {
            const title = document.getElementById('task-title').value.trim();
            const description = document.getElementById('task-description').value.trim();
            const periodicityType = document.getElementById('periodicity-type').value;
            const customInterval = parseInt(document.getElementById('custom-interval').value);
            const dueDate = document.getElementById('due-date').value;
            
            // Validation
            let isValid = true;
            
            if (!title) {
                showError('title-error', '${l10n.t('webview.createTask.errors.titleRequired').replace(/'/g, "\\'")}');
                isValid = false;
            } else {
                hideError('title-error');
            }
            
            // Description is optional, so no validation needed
            hideError('description-error');
            
            if (!periodicityType) {
                showError('periodicity-error', '${l10n.t('webview.createTask.errors.periodicityRequired').replace(/'/g, "\\'")}');
                isValid = false;
            } else {
                hideError('periodicity-error');
            }

            // Validate custom interval if custom type is selected
            if (periodicityType === 'custom') {
                if (!customInterval || customInterval < 1) {
                    showError('custom-interval-error', '${l10n.t('webview.createTask.errors.intervalRequired').replace(/'/g, "\\'")}');
                    isValid = false;
                } else {
                    hideError('custom-interval-error');
                }
            }
            
            if (!dueDate) {
                showError('due-date-error', '${l10n.t('webview.createTask.errors.dueDateRequired').replace(/'/g, "\\'")}');
                isValid = false;
            } else {
                hideError('due-date-error');
            }
            
            if (!isValid) {
                return;
            }

            // Create periodicity object based on new format
            const periodicityData = {
                type: periodicityType,
                isRecurring: periodicityType !== 'none'
            };

            if (periodicityType === 'custom') {
                periodicityData.interval = customInterval;
                periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.everyDays').replace('{0}', '" + customInterval + "')}';
            } else {
                // Set description based on type
                switch (periodicityType) {
                    case 'none':
                        periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.oneShotTask')}';
                        break;
                    case 'daily':
                        periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.daily')}';
                        break;
                    case 'weekly':
                        periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.weekly')}';
                        break;
                    case 'monthly':
                        periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.monthly')}';
                        break;
                    case 'yearly':
                        periodicityData.description = '${l10n.t('webview.taskDetails.periodicityDescriptions.yearly')}';
                        break;
                }
            }
            
            const taskData = {
                title: title,
                description: description || undefined, // Convert empty string to undefined
                periodicity: periodicityData,
                creationDate: new Date().toISOString(), // Automatically set to current date
                dueDate: new Date(dueDate).toISOString()
            };
            
            vscode.postMessage({
                command: 'createTask',
                taskData: taskData
            });
        }
        
        function cancelCreate() {
            vscode.postMessage({
                command: 'close'
            });
        }
        
        function showError(elementId, message) {
            const errorElement = document.getElementById(elementId);
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        function hideError(elementId) {
            const errorElement = document.getElementById(elementId);
            errorElement.style.display = 'none';
        }
        
        // Handle Enter key in inputs
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                createTask();
            }
        });
    </script>
</body>
</html>`;
    }
} 