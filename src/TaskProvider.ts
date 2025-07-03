import * as vscode from 'vscode';
import { l10n } from 'vscode';
import { Task } from './Task';
import { TaskManager } from './TaskManager';
import { TaskStatusUtil } from './TaskStatusUtil';

/**
 * Tree item representing a task in the sidebar
 */
export class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly task: Task,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: 'overdue' | 'dueSoon' | 'normal' | 'archived'
    ) {
        super(task.title, collapsibleState);
        
        this.tooltip = task.description ? `${task.title} - ${task.description}` : task.title;
        if (contextValue !== 'archived') {
            this.description = TaskStatusUtil.getComprehensiveStatus(task);
        }
        
        // Add command to show task details when clicked
        this.command = {
            command: 'recurringtasks.showTaskDetails',
            title: l10n.t('taskStatus.showTaskDetails'),
            arguments: [task]
        };
        
        // Set icon based on task status
        if (contextValue === 'archived') {
            this.iconPath = new vscode.ThemeIcon('archive');
        } else if (TaskStatusUtil.isOverdue(task)) {
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

class CategoryTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public tasks: Task[]
    ) {
        super(label, collapsibleState);
        this.contextValue = 'category';
    }
}

/**
 * Tree data provider for displaying tasks in the sidebar
 */
export class TaskProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private taskManager: TaskManager) {}

    /**
     * Refreshes the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets the tree item for a given element
     */
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Sorts tasks by due date with overdue tasks at the top
     */
    private sortTasks(tasks: Task[]): Task[] {
        return tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }

    /**
     * Gets the children of a given element
     */
    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element instanceof CategoryTreeItem) {
            return Promise.resolve(
                this.sortTasks(element.tasks).map(task => {
                    if (element.label === 'Archived') {
                        return new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None, 'archived');
                    }
                    if (TaskStatusUtil.isOverdue(task)) {
                        return new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None, 'overdue');
                    }
                    if (TaskStatusUtil.isDueSoon(task)) {
                        return new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None, 'dueSoon');
                    }
                    return new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None, 'normal');
                })
            );
        } else {
            const overdueTasks = this.taskManager.getOverdueTasks();
            const dueSoonTasks = this.taskManager.getTasks().filter(task => TaskStatusUtil.isDueSoon(task));
            const otherTasks = this.taskManager.getTasks().filter(task => 
                !TaskStatusUtil.isOverdue(task) && !TaskStatusUtil.isDueSoon(task)
            );
            const archivedTasks = this.taskManager.getArchivedTasks();

            const categories: CategoryTreeItem[] = [];
            if (overdueTasks.length > 0) {
                categories.push(new CategoryTreeItem(l10n.t('taskProvider.overdue'), vscode.TreeItemCollapsibleState.Expanded, overdueTasks));
            }
            if (dueSoonTasks.length > 0) {
                categories.push(new CategoryTreeItem(l10n.t('taskProvider.dueSoon'), vscode.TreeItemCollapsibleState.Expanded, dueSoonTasks));
            }
            if (otherTasks.length > 0) {
                categories.push(new CategoryTreeItem(l10n.t('taskProvider.upcoming'), vscode.TreeItemCollapsibleState.Expanded, otherTasks));
            }
            if (archivedTasks.length > 0) {
                categories.push(new CategoryTreeItem(l10n.t('taskProvider.archived'), vscode.TreeItemCollapsibleState.Collapsed, archivedTasks));
            }

            return Promise.resolve(categories);
        }
    }
} 