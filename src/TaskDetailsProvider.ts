import * as vscode from 'vscode';
import { Task, Comment } from './Task';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';
import { TaskStatusUtil } from './TaskStatusUtil';

/**
 * Provides task details and comments in a webview panel
 */
export class TaskDetailsProvider {
    private static readonly viewType = 'recurringTasks.taskDetails';
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static taskManager: TaskManager;
    private static taskProvider: TaskProvider;

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
     * Shows task details in a webview panel, reusing existing panel if available
     */
    public static showTaskDetails(task: Task, extensionUri: vscode.Uri): void {
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
                retainContextWhenHidden: true
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
                }
            },
            undefined,
            undefined
        );

        // Clean up when the panel is disposed
        panel.onDidDispose(() => {
            TaskDetailsProvider.currentPanel = undefined;
        }, null);
    }

    /**
     * Shows create task form in a webview panel
     */
    public static showCreateTaskForm(extensionUri: vscode.Uri): void {
        // If we have an existing panel, reuse it
        if (TaskDetailsProvider.currentPanel) {
            TaskDetailsProvider.currentPanel.reveal(vscode.ViewColumn.One);
            TaskDetailsProvider.currentPanel.title = 'Create New Task';
            TaskDetailsProvider.currentPanel.webview.html = TaskDetailsProvider.getCreateTaskWebviewContent(TaskDetailsProvider.currentPanel.webview, extensionUri);
            return;
        }

        // Create a new panel if none exists
        const panel = vscode.window.createWebviewPanel(
            TaskDetailsProvider.viewType,
            'Create New Task',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
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
            'Are you sure you want to delete this comment?',
            { modal: true },
            'Delete'
        );

        if (result === 'Delete') {
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
            const { title, description, periodicity, startDate } = taskData;
            
            if (!title || !description || !periodicity || !startDate) {
                vscode.window.showErrorMessage('Missing required task data');
                return;
            }

            const newTask = TaskDetailsProvider.taskManager.addTask(
                title,
                description,
                periodicity,
                new Date(startDate)
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
            
            if (processedTaskData.startDate && typeof processedTaskData.startDate === 'string') {
                processedTaskData.startDate = new Date(processedTaskData.startDate);
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
     * Refreshes the panel with updated task data
     */
    private static refreshPanel(task: Task): void {
        if (TaskDetailsProvider.currentPanel) {
            TaskDetailsProvider.currentPanel.title = `Task: ${task.title}`;
            TaskDetailsProvider.currentPanel.webview.html = TaskDetailsProvider.getWebviewContent(
                task, 
                TaskDetailsProvider.currentPanel.webview, 
                vscode.Uri.file(__dirname)
            );
        }
    }

    /**
     * Refreshes the task provider
     */
    private static refreshTaskProvider(): void {
        if (TaskDetailsProvider.taskProvider && TaskDetailsProvider.taskManager) {
            const tasks = TaskDetailsProvider.taskManager.getTasks();
            TaskDetailsProvider.taskProvider.refresh();
        }
    }

    /**
     * Generates the HTML content for the webview
     */
    private static getWebviewContent(task: Task, webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const formatDate = (date: Date) => {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const getStatusClass = () => {
            if (TaskStatusUtil.isOverdue(task)) {return 'overdue';}
            if (TaskStatusUtil.isDueSoon(task)) {return 'due-soon';}
            return 'normal';
        };

        // Function to convert URLs to clickable links
        const convertUrlsToLinks = (text: string): string => {
            // URL regex pattern that matches http, https, ftp, and www URLs
            const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+)/gi;
            return text.replace(urlRegex, (url) => {
                // Ensure URLs have a protocol
                const fullUrl = url.startsWith('www.') ? 'https://' + url : url;
                return `<a href="${fullUrl}" class="clickable-link" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });
        };

        const getStatusInfo = () => {
            const progress = TaskStatusUtil.getTimeProgress(task);
            
            if (TaskStatusUtil.isOverdue(task)) {
                // Overdue
                if (progress >= 100) {
                    return {
                        name: 'Overdue - Complete',
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'overdue',
                        description: 'Task period is complete but overdue'
                    };
                } else {
                    return {
                        name: 'Overdue - In Progress',
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'overdue',
                        description: `${progress}% complete but overdue`
                    };
                }
            } else if (TaskStatusUtil.isDueSoon(task)) {
                // Due soon
                if (progress >= 80) {
                    return {
                        name: 'Due Soon - Nearly Complete',
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'due-soon',
                        description: `${progress}% complete, due soon`
                    };
                } else {
                    return {
                        name: 'Due Soon - Needs Attention',
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'due-soon',
                        description: `${progress}% complete, due soon`
                    };
                }
            } else {
                // On track
                if (progress >= 100) {
                    return {
                        name: 'Complete',
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'normal',
                        description: 'Task period is complete'
                    };
                } else if (progress >= 50) {
                    return {
                        name: 'On Track - Good Progress',
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'normal',
                        description: `${progress}% complete, on track`
                    };
                } else {
                    return {
                        name: 'On Track - Early Stage',
                        timeRemaining: TaskStatusUtil.getTimeRemaining(task),
                        class: 'normal',
                        description: `${progress}% complete, on track`
                    };
                }
            }
        };

        const commentsHtml = task.comments.length > 0 
            ? [...task.comments].reverse().map(comment => `
                <div class="comment ${comment.isValidation ? 'validation-comment' : 'regular-comment'}" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <div class="comment-info">
                            <span class="comment-date">${formatDate(comment.date)}</span>
                            ${comment.isValidation ? '<span class="validation-badge">✓ Validation</span>' : ''}
                        </div>
                        <div class="comment-actions">
                            <button class="edit-comment-btn codicon codicon-edit" onclick="editComment('${comment.id}')" title="Edit comment"></button>
                            <button class="delete-comment-btn codicon codicon-trash" onclick="deleteComment('${comment.id}')" title="Delete comment"></button>
                        </div>
                    </div>
                    <div class="comment-content" id="comment-content-${comment.id}">${convertUrlsToLinks(comment.text)}</div>
                    <div class="comment-edit-form" id="comment-edit-${comment.id}" style="display: none;">
                        <textarea class="comment-edit-textarea" id="comment-edit-textarea-${comment.id}">${comment.text}</textarea>
                        <div class="comment-edit-actions">
                            <button class="save-comment-btn" onclick="saveComment('${comment.id}')">
                                <span class="codicon codicon-check"></span>
                                Save
                            </button>
                            <button class="cancel-comment-btn" onclick="cancelEdit('${comment.id}')">
                                <span class="codicon codicon-close"></span>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<p class="no-comments">No comments yet.</p>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Details</title>
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
        }

        .task-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .meta-item {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px;
            border-radius: 4px;
        }

        .meta-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 5px;
        }

        .meta-value {
            font-weight: 500;
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

        .periodicity {
            display: flex;
            align-items: center;
            gap: 5px;
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

        .periodicity-icon {
            color: var(--vscode-symbolIcon-propertyForeground);
            margin-right: 5px;
        }

        .date-icon {
            color: var(--vscode-descriptionForeground);
            margin-right: 5px;
        }

        .comments-icon {
            color: var(--vscode-symbolIcon-methodForeground);
            margin-right: 8px;
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

        .status-description {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
            font-style: italic;
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
    </style>
</head>
<body>
    <div class="task-header">
        <div class="task-title">
            <span class="task-icon ${getStatusClass()}">${getStatusClass() === 'overdue' ? '🔴' : getStatusClass() === 'due-soon' ? '🟡' : '✅'}</span>
            <span id="task-title-display">${task.title}</span>
            <button class="edit-btn codicon codicon-edit" onclick="editTaskTitle()" title="Edit task title"></button>
        </div>
        <div class="edit-form" id="title-edit-form">
            <div class="edit-form-group">
                <label class="edit-form-label">Task Title</label>
                <input type="text" id="title-edit-input" class="edit-form-input" value="${task.title}">
            </div>
            <div class="edit-form-actions">
                <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditTitle()">Cancel</button>
                <button class="edit-btn-small edit-btn-primary" onclick="saveTaskTitle()">Save</button>
            </div>
        </div>
        
        <div class="task-description">
            <span id="task-description-display">${convertUrlsToLinks(task.description)}</span>
            <button class="edit-btn codicon codicon-edit" onclick="editTaskDescription()" title="Edit task description"></button>
        </div>
        <div class="edit-form" id="description-edit-form">
            <div class="edit-form-group">
                <label class="edit-form-label">Task Description</label>
                <textarea id="description-edit-textarea" class="edit-form-textarea">${task.description}</textarea>
            </div>
            <div class="edit-form-actions">
                <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditDescription()">Cancel</button>
                <button class="edit-btn-small edit-btn-primary" onclick="saveTaskDescription()">Save</button>
            </div>
        </div>
    </div>

    <div class="visual-section">
        <div class="visual-title">
            <span>📊</span>
            Status & Progress Overview
        </div>
        <div class="time-progress">
            <div class="status-progress-header">
                <div class="status-badge ${getStatusInfo().class}">${getStatusInfo().name}</div>
                <div class="progress-percentage">${TaskStatusUtil.getTimeProgress(task)}% Complete</div>
            </div>
            <div class="status-description">${getStatusInfo().description}</div>
            <div class="time-visual">
                <div class="time-circle ${getStatusClass()}">${TaskStatusUtil.getTimeProgress(task)}%</div>
                <div class="time-details">
                    <div class="time-label">Time Remaining</div>
                    <div class="time-value">${getStatusInfo().timeRemaining}</div>
                    <div class="time-label">Period Progress</div>
                    <div class="time-value">${TaskStatusUtil.getTimeProgress(task)}% of ${task.periodicity.value} ${task.periodicity.unit}</div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${getStatusClass()}" style="width: ${TaskStatusUtil.getTimeProgress(task)}%"></div>
            </div>
            <div class="progress-labels">
                <span class="progress-start">Start: ${formatDate(task.startDate)}</span>
                <span class="progress-end">Due: ${formatDate(task.dueDate)}</span>
            </div>
        </div>
    </div>

    <div class="task-meta">
        <div class="meta-item">
            <div class="meta-label">Periodicity</div>
            <div class="meta-value">
                <span class="periodicity">
                    <span class="periodicity-icon">🔄</span>
                    <span id="periodicity-display">
                        <span class="periodicity-value">${task.periodicity.value}</span>
                        <span class="periodicity-unit">${task.periodicity.unit}</span>
                    </span>
                    <button class="edit-btn codicon codicon-edit" onclick="editTaskPeriodicity()" title="Edit periodicity"></button>
                </span>
            </div>
        </div>
        
        <div class="meta-item">
            <div class="meta-label">Start Date</div>
            <div class="meta-value">
                <span class="date-icon">📅</span>
                ${formatDate(task.startDate)}
            </div>
        </div>
        
        <div class="meta-item">
            <div class="meta-label">Next Due Date</div>
            <div class="meta-value">
                <span class="date-icon">⏰</span>
                <span id="due-date-display">${formatDate(task.dueDate)}</span>
                <button class="edit-btn codicon codicon-edit" onclick="editTaskDueDate()" title="Edit due date"></button>
            </div>
        </div>
        
        <div class="meta-item">
            <div class="meta-label">Comments</div>
            <div class="meta-value">
                <span class="comments-icon">💬</span>
                ${task.comments.length} comment${task.comments.length !== 1 ? 's' : ''}
            </div>
        </div>
    </div>

    <div class="edit-form" id="periodicity-edit-form">
        <div class="edit-form-group">
            <label class="edit-form-label">Periodicity</label>
            <div class="edit-periodicity-group">
                <input type="number" id="periodicity-edit-value" class="edit-form-input" value="${task.periodicity.value}" min="1">
                <select id="periodicity-edit-unit" class="edit-form-select">
                    <option value="days" ${task.periodicity.unit === 'days' ? 'selected' : ''}>Days</option>
                    <option value="weeks" ${task.periodicity.unit === 'weeks' ? 'selected' : ''}>Weeks</option>
                    <option value="months" ${task.periodicity.unit === 'months' ? 'selected' : ''}>Months</option>
                    <option value="years" ${task.periodicity.unit === 'years' ? 'selected' : ''}>Years</option>
                </select>
            </div>
        </div>
        <div class="edit-form-actions">
            <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditPeriodicity()">Cancel</button>
            <button class="edit-btn-small edit-btn-primary" onclick="saveTaskPeriodicity()">Save</button>
        </div>
    </div>

    <div class="edit-form" id="due-date-edit-form">
        <div class="edit-form-group">
            <label class="edit-form-label">Next Due Date</label>
            <input type="datetime-local" id="due-date-edit-input" class="edit-form-input" value="${task.dueDate.toISOString().slice(0, 16)}">
        </div>
        <div class="edit-form-actions">
            <button class="edit-btn-small edit-btn-secondary" onclick="cancelEditDueDate()">Cancel</button>
            <button class="edit-btn-small edit-btn-primary" onclick="saveTaskDueDate()">Save</button>
        </div>
    </div>

    <div class="validate-task-section">
        <div class="validate-task-title">
            <span class="codicon codicon-check"></span>
            Validate Task
        </div>
        <div class="validate-task-description">
            Mark this task as complete and set the next due date based on the periodicity.
        </div>
        <div class="add-comment-section">
            <textarea class="add-comment-textarea" id="validate-comment-textarea" placeholder="Add a validation comment (optional)..."></textarea>
            <button class="add-comment-btn" onclick="validateTask()">
                <span class="codicon codicon-check"></span>
                Validate Task
            </button>
        </div>
    </div>

    <div class="comments-section">
        <div class="comments-header">
            <span class="comments-icon">💬</span>
            Comments (${task.comments.length})
        </div>
        
        <div class="comments-filter">
            <span style="color: var(--vscode-descriptionForeground);">Filter:</span>
            <div class="filter-toggle">
                <button class="filter-option active" id="filter-all" onclick="filterComments('all')">All</button>
                <button class="filter-option" id="filter-validation" onclick="filterComments('validation')">Validation (${task.comments.filter(c => c.isValidation).length})</button>
            </div>
            <span style="color: var(--vscode-descriptionForeground); margin-left: auto;" id="comment-counter">
                ${task.comments.length} comments
            </span>
        </div>
        
        <div class="add-comment-section">
            <textarea class="add-comment-textarea" id="new-comment-textarea" placeholder="Add a new comment..."></textarea>
            <button class="add-comment-btn" onclick="addComment()">
                <span class="codicon codicon-add"></span>
                Add Comment
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
            document.getElementById('title-edit-input').value = '${task.title}';
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
            document.getElementById('description-edit-textarea').value = '${task.description}';
        }

        function saveTaskDescription() {
            const newDescription = document.getElementById('description-edit-textarea').value.trim();
            if (newDescription) {
                vscode.postMessage({
                    command: 'updateTask',
                    taskId: taskId,
                    taskData: { description: newDescription }
                });
                document.getElementById('description-edit-form').classList.remove('show');
            }
        }

        // Edit task periodicity functionality
        function editTaskPeriodicity() {
            document.getElementById('periodicity-edit-form').classList.add('show');
        }

        function cancelEditPeriodicity() {
            document.getElementById('periodicity-edit-form').classList.remove('show');
            document.getElementById('periodicity-edit-value').value = '${task.periodicity.value}';
            document.getElementById('periodicity-edit-unit').value = '${task.periodicity.unit}';
        }

        function saveTaskPeriodicity() {
            const newValue = parseInt(document.getElementById('periodicity-edit-value').value);
            const newUnit = document.getElementById('periodicity-edit-unit').value;
            
            if (newValue && newUnit) {
                vscode.postMessage({
                    command: 'updateTask',
                    taskId: taskId,
                    taskData: { 
                        periodicity: {
                            value: newValue,
                            unit: newUnit
                        }
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
            commentCounter.textContent = visibleComments.length + ' comments';
        }

        // Edit task due date functionality
        function editTaskDueDate() {
            document.getElementById('due-date-edit-form').classList.add('show');
            document.getElementById('due-date-edit-input').focus();
        }

        function cancelEditDueDate() {
            document.getElementById('due-date-edit-form').classList.remove('show');
            // Reset to original value
            document.getElementById('due-date-edit-input').value = '${task.dueDate.toISOString().slice(0, 16)}';
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
    <title>Create New Task</title>
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
            resize: vertical;
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
            Create New Recurring Task
        </div>
    </div>

    <form id="create-task-form">
        <div class="form-group">
            <label class="form-label" for="task-title">
                Task Title <span class="required">*</span>
            </label>
            <input type="text" id="task-title" class="form-input" required placeholder="Enter task title">
            <div class="error-message" id="title-error">Please enter a task title</div>
        </div>

        <div class="form-group">
            <label class="form-label" for="task-description">
                Description <span class="required">*</span>
            </label>
            <textarea id="task-description" class="form-textarea" required placeholder="Enter task description"></textarea>
            <div class="error-message" id="description-error">Please enter a task description</div>
        </div>

        <div class="form-group">
            <label class="form-label">Periodicity <span class="required">*</span></label>
            <div class="periodicity-group">
                <input type="number" id="periodicity-value" class="form-input" min="1" required placeholder="Value">
                <select id="periodicity-unit" class="form-select" required>
                    <option value="">Unit</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                </select>
            </div>
            <div class="error-message" id="periodicity-error">Please enter valid periodicity</div>
        </div>

        <div class="form-group">
            <label class="form-label" for="start-date">
                Start Date <span class="required">*</span>
            </label>
            <input type="datetime-local" id="start-date" class="form-input" required>
            <div class="error-message" id="start-date-error">Please select a start date</div>
        </div>

        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="cancelCreate()">
                <span class="codicon codicon-close"></span>
                Cancel
            </button>
            <button type="submit" class="btn btn-primary">
                <span class="codicon codicon-check"></span>
                Create Task
            </button>
        </div>
    </form>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Set default start date to now
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('start-date').value = localDateTime;
        
        // Form submission
        document.getElementById('create-task-form').addEventListener('submit', function(e) {
            e.preventDefault();
            createTask();
        });
        
        function createTask() {
            const title = document.getElementById('task-title').value.trim();
            const description = document.getElementById('task-description').value.trim();
            const periodicityValue = parseInt(document.getElementById('periodicity-value').value);
            const periodicityUnit = document.getElementById('periodicity-unit').value;
            const startDate = document.getElementById('start-date').value;
            
            // Validation
            let isValid = true;
            
            if (!title) {
                showError('title-error', 'Please enter a task title');
                isValid = false;
            } else {
                hideError('title-error');
            }
            
            if (!description) {
                showError('description-error', 'Please enter a task description');
                isValid = false;
            } else {
                hideError('description-error');
            }
            
            if (!periodicityValue || !periodicityUnit) {
                showError('periodicity-error', 'Please enter valid periodicity');
                isValid = false;
            } else {
                hideError('periodicity-error');
            }
            
            if (!startDate) {
                showError('start-date-error', 'Please select a start date');
                isValid = false;
            } else {
                hideError('start-date-error');
            }
            
            if (!isValid) {
                return;
            }
            
            const taskData = {
                title: title,
                description: description,
                periodicity: {
                    value: periodicityValue,
                    unit: periodicityUnit
                },
                startDate: new Date(startDate).toISOString()
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