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
        const startDate = this.task.startDate;
        const dueDate = this.task.dueDate;
        
        // Calculate progress based on position between start and due date
        const totalDuration = dueDate.getTime() - startDate.getTime();
        const elapsed = now.getTime() - startDate.getTime();
        
        // Ensure progress is between 0 and 100
        const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
        return Math.round(progress);
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
     * Checks if the task is due within the next 3 days
     */
    private isDueSoon(): boolean {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
        return this.task.dueDate <= threeDaysFromNow && !this.isOverdue();
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