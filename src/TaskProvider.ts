import * as vscode from 'vscode';
import { Task } from './Task';
import { TaskStatusUtil } from './TaskStatusUtil';

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
        this.description = TaskStatusUtil.getComprehensiveStatus(task);
        
        // Add command to show task details when clicked
        this.command = {
            command: 'recurringtasks.showTaskDetails',
            title: 'Show Task Details',
            arguments: [task]
        };
        
        // Set icon based on task status
        if (TaskStatusUtil.isOverdue(task)) {
            this.iconPath = new vscode.ThemeIcon('error');
            this.contextValue = 'overdue';
        } else if (TaskStatusUtil.isDueSoon(task)) {
            this.iconPath = new vscode.ThemeIcon('warning');
            this.contextValue = 'dueSoon';
        } else {
            this.iconPath = new vscode.ThemeIcon('tasklist');
            this.contextValue = 'normal';
        }
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