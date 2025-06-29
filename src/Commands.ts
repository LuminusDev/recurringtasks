import * as vscode from 'vscode';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';
import { TaskTreeItem } from './TaskProvider';
import { Periodicity } from './Task';
import { TaskDetailsProvider } from './TaskDetailsProvider';

/**
 * Handles all command implementations for the recurring tasks extension
 */
export class Commands {
    private taskManager: TaskManager;
    private taskProvider: TaskProvider;
    private extensionUri: vscode.Uri;

    constructor(taskManager: TaskManager, taskProvider: TaskProvider, extensionUri: vscode.Uri) {
        this.taskManager = taskManager;
        this.taskProvider = taskProvider;
        this.extensionUri = extensionUri;
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

        // Add all commands to subscriptions
        context.subscriptions.push(
            addTaskCommand,
            validateTaskCommand,
            archiveTaskCommand,
            unarchiveTaskCommand,
            deleteTaskCommand,
            refreshTasksCommand,
            showTaskDetailsCommand
        );
    }

    /**
     * Shows create task form in a webview
     */
    private createTaskWebview(): void {
        try {
            TaskDetailsProvider.showCreateTaskForm(this.extensionUri);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show create task form: ${error}`);
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

            // Validate the task (comment can be empty)
            const updatedTask = this.taskManager.validateTask(item.task.id, comment || '');
            
            if (updatedTask) {
                // Refresh the view
                this.refreshTasks();
                
                const nextDueDate = updatedTask.dueDate.toLocaleDateString();
                vscode.window.showInformationMessage(
                    `Task "${item.task.title}" validated! Next due: ${nextDueDate}`
                );
            } else {
                vscode.window.showErrorMessage('Failed to validate task');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to validate task: ${error}`);
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
                vscode.window.showInformationMessage(`Task "${item.task.title}" archived.`);
            } else {
                vscode.window.showErrorMessage('Failed to archive task.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to archive task: ${error}`);
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
                vscode.window.showInformationMessage(`Task "${item.task.title}" unarchived.`);
            } else {
                vscode.window.showErrorMessage('Failed to unarchive task.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to unarchive task: ${error}`);
        }
    }

    /**
     * Handles deleting a task
     */
    private async deleteTask(item: TaskTreeItem): Promise<void> {
        try {
            // Confirm deletion
            const result = await vscode.window.showWarningMessage(
                `Are you sure you want to delete "${item.task.title}"?`,
                { modal: true },
                'Delete'
            );

            if (result === 'Delete') {
                const success = this.taskManager.deleteTask(item.task.id);
                
                if (success) {
                    // Refresh the view
                    this.refreshTasks();
                    vscode.window.showInformationMessage(`Task "${item.task.title}" deleted successfully!`);
                } else {
                    vscode.window.showErrorMessage('Failed to delete task');
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete task: ${error}`);
        }
    }

    /**
     * Refreshes the task view
     */
    private refreshTasks(): void {
        this.taskProvider.refresh();
    }

    /**
     * Shows task details in a webview panel
     */
    private showTaskDetails(task: any): void {
        try {
            TaskDetailsProvider.showTaskDetails(task, this.extensionUri);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show task details: ${error}`);
        }
    }
} 