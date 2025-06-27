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
        // Add Task command
        const addTaskCommand = vscode.commands.registerCommand('recurringtasks.addTask', () => {
            this.addTask();
        });

        // Validate Task command
        const validateTaskCommand = vscode.commands.registerCommand('recurringtasks.validateTask', (item: TaskTreeItem) => {
            this.validateTask(item);
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
            deleteTaskCommand,
            refreshTasksCommand,
            showTaskDetailsCommand
        );
    }

    /**
     * Handles adding a new task
     */
    private async addTask(): Promise<void> {
        try {
            // Get task title
            const title = await vscode.window.showInputBox({
                prompt: 'Enter task title',
                placeHolder: 'e.g., Review weekly reports'
            });

            if (!title) {return;}

            // Get task description
            const description = await vscode.window.showInputBox({
                prompt: 'Enter task description',
                placeHolder: 'e.g., Review and approve weekly team reports'
            });

            if (!description) {return;}

            // Get periodicity value
            const periodicityValueStr = await vscode.window.showInputBox({
                prompt: 'Enter periodicity value (number)',
                placeHolder: 'e.g., 7'
            });

            if (!periodicityValueStr) {return;}

            const periodicityValue = parseInt(periodicityValueStr);
            if (isNaN(periodicityValue) || periodicityValue <= 0) {
                vscode.window.showErrorMessage('Periodicity value must be a positive number');
                return;
            }

            // Get periodicity unit
            const periodicityUnit = await vscode.window.showQuickPick(['days', 'weeks', 'months', 'years'], {
                placeHolder: 'Select periodicity unit'
            });

            if (!periodicityUnit) {return;}

            const periodicity: Periodicity = {
                value: periodicityValue,
                unit: periodicityUnit as 'days' | 'weeks' | 'months' | 'years'
            };

            // Get start date
            const startDateStr = await vscode.window.showInputBox({
                prompt: 'Enter start date (YYYY-MM-DD)',
                placeHolder: 'e.g., 2024-01-15',
                value: new Date().toISOString().split('T')[0] // Default to today
            });

            if (!startDateStr) {return;}

            const startDate = new Date(startDateStr);
            if (isNaN(startDate.getTime())) {
                vscode.window.showErrorMessage('Invalid date format. Please use YYYY-MM-DD');
                return;
            }

            // Create the task
            const newTask = this.taskManager.addTask(title, description, periodicity, startDate);
            
            // Refresh the view
            this.refreshTasks();
            
            vscode.window.showInformationMessage(`Task "${title}" created successfully!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create task: ${error}`);
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
        const tasks = this.taskManager.getTasks();
        this.taskProvider.updateTasks(tasks);
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