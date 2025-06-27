import * as vscode from 'vscode';
import { Task, Comment } from './Task';

/**
 * Provides task details and comments in a webview panel
 */
export class TaskDetailsProvider {
    private static readonly viewType = 'recurringTasks.taskDetails';
    private static currentPanel: vscode.WebviewPanel | undefined;

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
     * Generates the HTML content for the webview
     */
    private static getWebviewContent(task: Task, webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'style.css'));
        
        const formatDate = (date: Date) => {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const getStatusClass = () => {
            const now = new Date();
            if (task.dueDate < now) {return 'overdue';}
            if (task.dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000) {return 'due-soon';}
            return 'normal';
        };

        const getStatusInfo = () => {
            const now = new Date();
            if (task.dueDate < now) {
                return {
                    name: 'Overdue',
                    timeRemaining: getTimeRemaining(),
                    class: 'overdue'
                };
            } else if (task.dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000) {
                return {
                    name: 'Due Soon',
                    timeRemaining: getTimeRemaining(),
                    class: 'due-soon'
                };
            } else {
                return {
                    name: 'On Track',
                    timeRemaining: getTimeRemaining(),
                    class: 'normal'
                };
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

        const commentsHtml = task.comments.length > 0 
            ? task.comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <span class="comment-date">${formatDate(comment.date)}</span>
                    </div>
                    <div class="comment-content">${comment.text}</div>
                </div>
            `).join('')
            : '<p class="no-comments">No comments yet.</p>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
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
        }

        .comment-date {
            font-size: 0.8em;
            color: var(--vscode-descriptionForeground);
        }

        .comment-content {
            color: var(--vscode-editor-foreground);
            white-space: pre-wrap;
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

    <div class="task-meta">
        <div class="meta-item">
            <div class="meta-label">Status</div>
            <div class="meta-value">
                <div class="status-container">
                    <div class="status-header">
                        <span class="status-icon ${getStatusClass()}">${getStatusClass() === 'overdue' ? '⚠️' : getStatusClass() === 'due-soon' ? '⏰' : '📅'}</span>
                        <span class="status-badge ${getStatusInfo().class}">${getStatusInfo().name}</span>
                    </div>
                    <div class="time-remaining">${getStatusInfo().timeRemaining}</div>
                </div>
            </div>
        </div>
        
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
    </div>

    <div class="comments-section">
        <div class="comments-header">
            <span class="comments-icon">💬</span>
            Comments (${task.comments.length})
        </div>
        ${commentsHtml}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Handle any webview interactions here
        document.addEventListener('DOMContentLoaded', function() {
            // Add any interactive functionality if needed
        });
    </script>
</body>
</html>`;
    }
} 