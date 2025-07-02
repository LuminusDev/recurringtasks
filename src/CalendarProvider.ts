import * as vscode from 'vscode';
import { Task } from './Task';
import { TaskManager } from './TaskManager';
import { TaskStatusUtil } from './TaskStatusUtil';

/**
 * Provides a calendar view of recurring tasks
 */
export class CalendarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'recurringTasks.calendar';

    private _view?: vscode.WebviewView;
    private currentDate: Date;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private taskManager: TaskManager
    ) {
        this.currentDate = new Date();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'previousMonth':
                        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                        this.refresh();
                        break;
                    case 'nextMonth':
                        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                        this.refresh();
                        break;
                    case 'today':
                        this.currentDate = new Date();
                        this.refresh();
                        break;
                    case 'showTaskDetails':
                        if (message.taskId) {
                            const task = this.taskManager.getTask(message.taskId);
                            if (task) {
                                vscode.commands.executeCommand('recurringtasks.showTaskDetails', task);
                            }
                        }
                        break;
                    case 'validateTask':
                        if (message.taskId) {
                            vscode.commands.executeCommand('recurringtasks.validateTask', message.taskId);
                        }
                        break;
                    case 'refresh':
                        this.refresh();
                        break;
                }
            },
            undefined,
        );
    }

    public refresh(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    private _getHtmlForWebview() {
        const tasks = this.taskManager.getTasks();
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Get first day of week setting
        const firstDayOfWeekSetting = vscode.workspace.getConfiguration('recurringTasks.calendar').get<string>('firstDayOfWeek', 'auto');
        const firstDayOfWeek = this._getFirstDayOfWeek(firstDayOfWeekSetting);

        // Month names
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Group tasks by date
        const tasksByDate = this._groupTasksByDate(tasks, year, month);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tasks Calendar</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 5px;
        }

        .calendar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding: 6px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            gap: 8px;
        }

        .calendar-nav {
            display: flex;
            gap: 10px;
        }

        .nav-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .nav-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .month-title {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .refresh-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .refresh-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            border-radius: 4px;
            overflow: hidden;
            table-layout: fixed;
            min-width: 0;
        }

        .day-header {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 4px 2px;
            text-align: center;
            font-weight: bold;
            font-size: 10px;
            min-width: 0;
            overflow: hidden;
        }

        .day-cell {
            background-color: var(--vscode-editor-background);
            min-height: 60px;
            height: auto;
            width: 100%;
            padding: 2px;
            position: relative;
            border: 1px solid transparent;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            min-width: 0;
            overflow: hidden;
        }

        .day-cell:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .day-number {
            font-weight: bold;
            margin-bottom: 2px;
            font-size: 11px;
            flex-shrink: 0;
        }

        .empty-day {
            background-color: transparent !important;
            opacity: 0.3;
        }

        .today {
            background-color: var(--vscode-focusBorder);
            color: var(--vscode-input-background);
        }

        .tasks-container {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 1px;
            min-width: 0;
            min-height: 0;
        }

        /* Responsive adjustments for very small widths */
        @media (max-width: 300px) {
            .calendar-header {
                padding: 4px;
                margin-bottom: 6px;
            }
            
            .nav-button, .refresh-button {
                width: 24px;
                height: 24px;
                padding: 4px;
                font-size: 10px;
            }
            
            .month-title {
                font-size: 12px;
            }
            
            .day-cell {
                min-height: 50px;
                height: auto;
                padding: 1px;
            }
            
            .day-number {
                font-size: 10px;
                margin-bottom: 1px;
            }
            
            .task-item {
                width: 8px;
                height: 8px;
                min-width: 8px;
            }
        }

        .task-item {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            width: 10px;
            height: 10px;
            border-radius: 50%;
            padding: 0;
            margin: 1px;
            font-size: 0;
            cursor: pointer;
            display: inline-block;
            flex-shrink: 0;
            min-width: 10px;
        }

        /* Smaller dots for very small width */
        @media (max-width: 250px) {
            .task-item {
                width: 6px !important;
                height: 6px !important;
                margin: 0.5px !important;
                min-width: 6px;
            }
            
            .day-cell {
                min-height: 40px !important;
                height: auto !important;
            }
        }

        .task-item:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
        }

        .task-overdue {
            background-color: var(--vscode-errorForeground);
            color: var(--vscode-activityBarBadge-foreground);
        }

        .task-due-soon {
            background-color: var(--vscode-notificationsWarningIcon-foreground);
            color: var(--vscode-activityBarBadge-foreground);
        }


    </style>
</head>
<body>
    <div class="calendar-header">
        <div class="calendar-nav">
            <button class="nav-button" onclick="previousMonth()" title="Previous Month">‹</button>
            <button class="nav-button" onclick="nextMonth()" title="Next Month">›</button>
            <button class="nav-button" onclick="goToToday()" title="Go to Today">⌂</button>
        </div>
        <div class="month-title">${monthNames[month]} ${year}</div>
        <button class="refresh-button" onclick="refresh()" title="Refresh Calendar">⟳</button>
    </div>

    <div class="calendar-grid">
        ${this._generateDayHeaders(firstDayOfWeek)}
        
        ${this._generateCalendarDays(startingDayOfWeek, daysInMonth, tasksByDate, year, month, firstDayOfWeek)}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function previousMonth() {
            vscode.postMessage({ command: 'previousMonth' });
        }

        function nextMonth() {
            vscode.postMessage({ command: 'nextMonth' });
        }

        function goToToday() {
            vscode.postMessage({ command: 'today' });
        }

        function showTaskDetails(taskId) {
            vscode.postMessage({ command: 'showTaskDetails', taskId: taskId });
        }

        function validateTask(taskId, event) {
            event.stopPropagation();
            vscode.postMessage({ command: 'validateTask', taskId: taskId });
        }

        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
    </script>
</body>
</html>`;
    }

    private _groupTasksByDate(tasks: Task[], year: number, month: number): Map<string, Task[]> {
        const tasksByDate = new Map<string, Task[]>();

        tasks.forEach(task => {
            const taskDate = new Date(task.dueDate);
            if (taskDate.getFullYear() === year && taskDate.getMonth() === month) {
                const dateKey = taskDate.getDate().toString();
                if (!tasksByDate.has(dateKey)) {
                    tasksByDate.set(dateKey, []);
                }
                tasksByDate.get(dateKey)!.push(task);
            }
        });

        return tasksByDate;
    }

    private _generateDayHeaders(firstDayOfWeek: number): string {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = '';
        
        // Generate headers starting from the specified first day
        for (let i = 0; i < 7; i++) {
            const dayIndex = (firstDayOfWeek + i) % 7;
            html += `<div class="day-header">${dayNames[dayIndex]}</div>`;
        }
        
        return html;
    }

    private _generateCalendarDays(startingDayOfWeek: number, daysInMonth: number, tasksByDate: Map<string, Task[]>, year: number, month: number, firstDayOfWeek: number): string {
        let html = '';
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const todayDate = today.getDate();

        // Calculate how many empty cells we need at the start
        // Adjust starting day based on the custom first day of week
        let adjustedStartingDay = startingDayOfWeek - firstDayOfWeek;
        if (adjustedStartingDay < 0) {
            adjustedStartingDay += 7;
        }
        
        // Empty cells for days before the month starts
        for (let i = 0; i < adjustedStartingDay; i++) {
            html += '<div class="day-cell empty-day"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && day === todayDate;
            const dayTasks = tasksByDate.get(day.toString()) || [];
            
            html += `<div class="day-cell ${isToday ? 'today' : ''}">
                <div class="day-number">${day}</div>
                <div class="tasks-container">`;

            // Add tasks for this day
            dayTasks.forEach(task => {
                const taskClass = TaskStatusUtil.isOverdue(task) ? 'task-overdue' : 
                                TaskStatusUtil.isDueSoon(task) ? 'task-due-soon' : '';
                
                html += `<div class="task-item ${taskClass}" 
                    onclick="showTaskDetails('${task.id}')" 
                    title="${task.description ? `${task.title} - ${task.description}` : task.title}">
                    ${task.title}
                </div>`;
            });

            html += '</div></div>';
        }

        return html;
    }

    /**
     * Gets the first day of week based on user setting and locale
     */
    private _getFirstDayOfWeek(setting: string): number {
        if (setting === 'monday') {
            return 1; // Monday
        } else if (setting === 'sunday') {
            return 0; // Sunday
        } else {
            // Auto - use locale
            try {
                // Get locale from VS Code or use default
                const locale = vscode.env.language || 'en-US';
                
                // For most European locales, Monday is first day (day 1)
                // For US locale, Sunday is first day (day 0)
                if (locale.startsWith('en-') && !locale.includes('GB')) {
                    return 0; // Sunday for US English
                } else {
                    return 1; // Monday for most other locales
                }
            } catch {
                return 1; // Default to Monday if locale detection fails
            }
        }
    }
} 