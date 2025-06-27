import * as vscode from 'vscode';
import { Task, Comment } from './Task';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';

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
            TaskDetailsProvider.taskProvider.updateTasks(tasks);
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
            const now = new Date();
            if (task.dueDate < now) {return 'overdue';}
            if (isDueSoon(task)) {return 'due-soon';}
            return 'normal';
        };

        const isDueSoon = (task: Task) => {
            const now = new Date();
            const dueDate = task.dueDate;
            
            // Calculate "due soon" threshold based on periodicity
            const dueSoonThreshold = getDueSoonThreshold(task);
            const dueSoonDate = new Date(now.getTime() + dueSoonThreshold);
            
            return dueDate <= dueSoonDate && dueDate > now;
        };

        const getDueSoonThreshold = (task: Task) => {
            const { value, unit } = task.periodicity;
            
            // Special handling for daily tasks
            if (unit === 'days' && value === 1) {
                // For daily tasks, consider "due soon" if due within 6 hours
                return 6 * 60 * 60 * 1000; // 6 hours
            }
            
            // Calculate threshold as a percentage of the periodicity
            let thresholdPercentage = 0.25; // 25% of the period
            
            // Adjust percentage based on periodicity type
            switch (unit) {
                case 'days':
                    if (value <= 3) {
                        thresholdPercentage = 0.33; // 33% for 2-3 day tasks
                    } else {
                        thresholdPercentage = 0.25; // 25% for longer daily tasks
                    }
                    break;
                case 'weeks':
                    if (value <= 1) {
                        thresholdPercentage = 0.3; // 30% for weekly tasks
                    } else if (value <= 2) {
                        thresholdPercentage = 0.25; // 25% for bi-weekly tasks
                    } else {
                        thresholdPercentage = 0.2; // 20% for longer weekly tasks
                    }
                    break;
                case 'months':
                    if (value <= 1) {
                        thresholdPercentage = 0.2; // 20% for monthly tasks
                    } else if (value <= 3) {
                        thresholdPercentage = 0.15; // 15% for quarterly tasks
                    } else {
                        thresholdPercentage = 0.1; // 10% for longer monthly tasks
                    }
                    break;
                case 'years':
                    thresholdPercentage = 0.05; // 5% for yearly tasks
                    break;
            }
            
            // Calculate threshold in milliseconds
            let thresholdMs: number;
            switch (unit) {
                case 'days':
                    thresholdMs = value * 24 * 60 * 60 * 1000 * thresholdPercentage;
                    break;
                case 'weeks':
                    thresholdMs = value * 7 * 24 * 60 * 60 * 1000 * thresholdPercentage;
                    break;
                case 'months':
                    // Approximate: 30.44 days per month
                    thresholdMs = value * 30.44 * 24 * 60 * 60 * 1000 * thresholdPercentage;
                    break;
                case 'years':
                    // Approximate: 365.25 days per year
                    thresholdMs = value * 365.25 * 24 * 60 * 60 * 1000 * thresholdPercentage;
                    break;
                default:
                    thresholdMs = value * 24 * 60 * 60 * 1000 * thresholdPercentage;
            }
            
            // Apply minimum and maximum bounds (but not for daily tasks)
            const minThreshold = 24 * 60 * 60 * 1000; // 1 day minimum
            const maxThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days maximum
            
            return Math.max(minThreshold, Math.min(maxThreshold, thresholdMs));
        };

        const getStatusInfo = () => {
            const now = new Date();
            const progress = getTimeProgress();
            
            if (task.dueDate < now) {
                // Overdue
                if (progress >= 100) {
                    return {
                        name: 'Overdue - Complete',
                        timeRemaining: getTimeRemaining(),
                        class: 'overdue',
                        description: 'Task period is complete but overdue'
                    };
                } else {
                    return {
                        name: 'Overdue - In Progress',
                        timeRemaining: getTimeRemaining(),
                        class: 'overdue',
                        description: `${progress}% complete but overdue`
                    };
                }
            } else if (isDueSoon(task)) {
                // Due soon
                if (progress >= 80) {
                    return {
                        name: 'Due Soon - Nearly Complete',
                        timeRemaining: getTimeRemaining(),
                        class: 'due-soon',
                        description: `${progress}% complete, due soon`
                    };
                } else {
                    return {
                        name: 'Due Soon - Needs Attention',
                        timeRemaining: getTimeRemaining(),
                        class: 'due-soon',
                        description: `${progress}% complete, due soon`
                    };
                }
            } else {
                // On track
                if (progress >= 100) {
                    return {
                        name: 'Complete',
                        timeRemaining: getTimeRemaining(),
                        class: 'normal',
                        description: 'Task period is complete'
                    };
                } else if (progress >= 50) {
                    return {
                        name: 'On Track - Good Progress',
                        timeRemaining: getTimeRemaining(),
                        class: 'normal',
                        description: `${progress}% complete, on track`
                    };
                } else {
                    return {
                        name: 'On Track - Early Stage',
                        timeRemaining: getTimeRemaining(),
                        class: 'normal',
                        description: `${progress}% complete, on track`
                    };
                }
            }
        };

        const getTimeRemaining = () => {
            const now = new Date();
            const diffTime = task.dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
            } else if (diffDays === 0) {
                return 'Due today';
            } else if (diffDays === 1) {
                return 'Due tomorrow';
            } else if (diffDays <= 7) {
                return `Due in ${diffDays} days`;
            } else {
                const diffWeeks = Math.ceil(diffDays / 7);
                return `Due in ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`;
            }
        };

        const getTimeProgress = () => {
            const now = new Date();
            const dueDate = task.dueDate;
            
            // For recurring tasks, calculate progress based on the current period
            // Find the start of the current period (previous due date or start date)
            const currentPeriodStart = getCurrentPeriodStart();
            
            // Calculate progress based on position within the current period
            const totalDuration = dueDate.getTime() - currentPeriodStart.getTime();
            const elapsed = now.getTime() - currentPeriodStart.getTime();
            
            // Ensure progress is between 0 and 100
            const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
            return Math.round(progress);
        };

        const getCurrentPeriodStart = () => {
            const { value, unit } = task.periodicity;
            const dueDate = task.dueDate;
            
            // Calculate the start of the current period by subtracting the periodicity
            const currentPeriodStart = new Date(dueDate);
            
            switch (unit) {
                case 'days':
                    currentPeriodStart.setDate(currentPeriodStart.getDate() - value);
                    break;
                case 'weeks':
                    currentPeriodStart.setDate(currentPeriodStart.getDate() - (value * 7));
                    break;
                case 'months':
                    currentPeriodStart.setMonth(currentPeriodStart.getMonth() - value);
                    break;
                case 'years':
                    currentPeriodStart.setFullYear(currentPeriodStart.getFullYear() - value);
                    break;
            }
            
            return currentPeriodStart;
        };

        const commentsHtml = task.comments.length > 0 
            ? task.comments.map(comment => `
                <div class="comment" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <span class="comment-date">${formatDate(comment.date)}</span>
                        <div class="comment-actions">
                            <button class="edit-comment-btn codicon codicon-edit" onclick="editComment('${comment.id}')" title="Edit comment"></button>
                            <button class="delete-comment-btn codicon codicon-trash" onclick="deleteComment('${comment.id}')" title="Delete comment"></button>
                        </div>
                    </div>
                    <div class="comment-content" id="comment-content-${comment.id}">${comment.text}</div>
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
            background-color: var(--vscode-warningForeground);
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

        .comment-header {
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
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
            color: var(--vscode-warningForeground);
        }

        .status-icon.normal {
            color: var(--vscode-textPreformat-foreground);
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
            color: var(--vscode-warningForeground);
        }

        .task-icon.normal {
            color: var(--vscode-textPreformat-foreground);
        }

        .periodicity-icon {
            color: var(--vscode-textPreformat-foreground);
            margin-right: 5px;
        }

        .date-icon {
            color: var(--vscode-descriptionForeground);
            margin-right: 5px;
        }

        .comments-icon {
            color: var(--vscode-textPreformat-foreground);
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
            background: linear-gradient(90deg, var(--vscode-warningForeground) 0%, #ffd93d 100%);
        }

        .progress-fill.normal {
            background: linear-gradient(90deg, var(--vscode-textPreformat-foreground) 0%, #6bcf7f 100%);
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
            background: var(--vscode-warningForeground);
            color: white;
            border-color: var(--vscode-warningForeground);
        }

        .time-circle.normal {
            background: var(--vscode-textPreformat-foreground);
            color: white;
            border-color: var(--vscode-textPreformat-foreground);
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
    </style>
</head>
<body>
    <div class="task-header">
        <div class="task-title">
            <span class="task-icon ${getStatusClass()}">${getStatusClass() === 'overdue' ? '🔴' : getStatusClass() === 'due-soon' ? '🟡' : '✅'}</span>
            ${task.title}
        </div>
        <div class="task-description">${task.description}</div>
    </div>

    <div class="visual-section">
        <div class="visual-title">
            <span>📊</span>
            Status & Progress Overview
        </div>
        <div class="time-progress">
            <div class="status-progress-header">
                <div class="status-badge ${getStatusInfo().class}">${getStatusInfo().name}</div>
                <div class="progress-percentage">${getTimeProgress()}% Complete</div>
            </div>
            <div class="status-description">${getStatusInfo().description}</div>
            <div class="time-visual">
                <div class="time-circle ${getStatusClass()}">${getTimeProgress()}%</div>
                <div class="time-details">
                    <div class="time-label">Time Remaining</div>
                    <div class="time-value">${getStatusInfo().timeRemaining}</div>
                    <div class="time-label">Period Progress</div>
                    <div class="time-value">${getTimeProgress()}% of ${task.periodicity.value} ${task.periodicity.unit}</div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${getStatusClass()}" style="width: ${getTimeProgress()}%"></div>
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
                    <span class="periodicity-value">${task.periodicity.value}</span>
                    <span class="periodicity-unit">${task.periodicity.unit}</span>
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
                ${formatDate(task.dueDate)}
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

    <div class="comments-section">
        <div class="comments-header">
            <span class="comments-icon">💬</span>
            Comments (${task.comments.length})
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
    </script>
</body>
</html>`;
    }
} 