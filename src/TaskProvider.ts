import * as vscode from 'vscode';
import { Task } from './Task';

/**
 * Tree item representing a task in the sidebar
 */
export class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly task: Task,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(task.title, collapsibleState);
        
        this.tooltip = `${task.title} - ${task.description}`;
        this.description = this.getComprehensiveStatus();
        
        // Add command to show task details when clicked
        this.command = {
            command: 'recurringtasks.showTaskDetails',
            title: 'Show Task Details',
            arguments: [task]
        };
        
        // Set icon based on task status
        if (this.isOverdue()) {
            this.iconPath = new vscode.ThemeIcon('error');
            this.contextValue = 'overdue';
        } else if (this.isDueSoon()) {
            this.iconPath = new vscode.ThemeIcon('warning');
            this.contextValue = 'dueSoon';
        } else {
            this.iconPath = new vscode.ThemeIcon('tasklist');
            this.contextValue = 'normal';
        }
    }

    /**
     * Calculates and returns the time remaining until the task is due
     */
    private getTimeRemaining(): string {
        const now = new Date();
        const dueDate = this.task.dueDate;
        const diffTime = dueDate.getTime() - now.getTime();
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
    }

    /**
     * Calculates the time progress percentage
     */
    private getTimeProgress(): number {
        const now = new Date();
        const dueDate = this.task.dueDate;
        
        // For recurring tasks, calculate progress based on the current period
        // Find the start of the current period (previous due date or start date)
        const currentPeriodStart = this.getCurrentPeriodStart();
        
        // Calculate progress based on position within the current period
        const totalDuration = dueDate.getTime() - currentPeriodStart.getTime();
        const elapsed = now.getTime() - currentPeriodStart.getTime();
        
        // Ensure progress is between 0 and 100
        const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
        return Math.round(progress);
    }

    /**
     * Gets the start date of the current period
     */
    private getCurrentPeriodStart(): Date {
        const { value, unit } = this.task.periodicity;
        const dueDate = this.task.dueDate;
        
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
    }

    /**
     * Returns a combined status and progress description
     */
    private getMixedStatusAndProgress(): string {
        const progress = this.getTimeProgress();
        const timeRemaining = this.getTimeRemaining();
        
        // Create status indicators
        let statusIndicator = '';
        if (this.isOverdue()) {
            statusIndicator = '🔴 ';
        } else if (this.isDueSoon()) {
            statusIndicator = '🟡 ';
        } else {
            statusIndicator = '✅ ';
        }
        
        // Create a simple progress bar using Unicode characters
        const progressBar = this.createProgressBar(progress);
        
        // Combine progress and status
        return `${statusIndicator}${progressBar} ${progress}% | ${timeRemaining}`;
    }

    /**
     * Creates a comprehensive status that considers both urgency and progress
     */
    private getComprehensiveStatus(): string {
        const progress = this.getTimeProgress();
        const timeRemaining = this.getTimeRemaining();
        
        // Determine status based on both urgency and progress
        if (this.isOverdue()) {
            if (progress >= 100) {
                return `🔴 Overdue (${timeRemaining})`;
            } else {
                return `🔴 Overdue - ${progress}% complete (${timeRemaining})`;
            }
        } else if (this.isDueSoon()) {
            if (progress >= 80) {
                return `🟡 Due soon - ${progress}% complete (${timeRemaining})`;
            } else {
                return `🟡 Due soon - ${progress}% complete (${timeRemaining})`;
            }
        } else {
            if (progress >= 100) {
                return `✅ Complete (${timeRemaining})`;
            } else {
                return `✅ ${progress}% complete (${timeRemaining})`;
            }
        }
    }

    /**
     * Creates a simple progress bar using Unicode characters
     */
    private createProgressBar(progress: number): string {
        const filledBlocks = Math.floor(progress / 10);
        const emptyBlocks = 10 - filledBlocks;
        
        return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    }

    /**
     * Checks if the task is overdue
     */
    private isOverdue(): boolean {
        return this.task.dueDate < new Date();
    }

    /**
     * Checks if the task is due soon based on its periodicity
     */
    private isDueSoon(): boolean {
        const now = new Date();
        const dueDate = this.task.dueDate;
        
        // Calculate "due soon" threshold based on periodicity
        const dueSoonThreshold = this.getDueSoonThreshold();
        const dueSoonDate = new Date(now.getTime() + dueSoonThreshold);
        
        return dueDate <= dueSoonDate && !this.isOverdue();
    }

    /**
     * Calculates the "due soon" threshold in milliseconds based on periodicity
     */
    private getDueSoonThreshold(): number {
        const { value, unit } = this.task.periodicity;
        
        // Special handling for daily tasks
        if (unit === 'days' && value === 1) {
            // For daily tasks, consider "due soon" if due within 6 hours
            return 6 * 60 * 60 * 1000; // 6 hours
        }
        
        // Calculate threshold as a percentage of the periodicity
        // For example: 25% of the period for most cases, but with minimums and maximums
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
    }
}

/**
 * Tree data provider for displaying tasks in the sidebar
 */
export class TaskProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | null | void> = new vscode.EventEmitter<TaskTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private tasks: Task[] = [];

    constructor() {}

    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Updates the tasks and refreshes the view
     */
    updateTasks(tasks: Task[]): void {
        this.tasks = tasks;
        this.refresh();
    }

    /**
     * Gets the tree item for a given element
     */
    getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Sorts tasks by due date with overdue tasks at the top
     */
    private sortTasks(tasks: Task[]): Task[] {
        const now = new Date();
        
        return tasks.sort((a, b) => {
            const aIsOverdue = a.dueDate < now;
            const bIsOverdue = b.dueDate < now;
            
            // If both are overdue or both are not overdue, sort by due date
            if (aIsOverdue === bIsOverdue) {
                return a.dueDate.getTime() - b.dueDate.getTime();
            }
            
            // Overdue tasks come first
            return aIsOverdue ? -1 : 1;
        });
    }

    /**
     * Gets the children of a given element
     */
    getChildren(element?: TaskTreeItem): Thenable<TaskTreeItem[]> {
        if (element) {
            // If we implement task details/children later, they would go here
            return Promise.resolve([]);
        } else {
            // Sort tasks and return as root items
            const sortedTasks = this.sortTasks(this.tasks);
            return Promise.resolve(
                sortedTasks.map(task => new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None))
            );
        }
    }
} 