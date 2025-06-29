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

        // Create Outlook Meeting command
        const createMeetingCommand = vscode.commands.registerCommand('recurringtasks.createOutlookMeeting', async (item?: TaskTreeItem) => {
            // If no item provided (e.g., called via keybinding), try to get selected task
            if (!item) {
                const selectedTask = await this.getSelectedTask();
                if (selectedTask) {
                    this.createOutlookMeeting(selectedTask);
                } else {
                    vscode.window.showWarningMessage('Please select a task first to create a calendar meeting.');
                }
            } else {
                this.createOutlookMeeting(item);
            }
        });

        // Set Preferred Calendar command
        const setPreferredCalendarCommand = vscode.commands.registerCommand('recurringtasks.setPreferredCalendar', () => {
            this.setPreferredCalendar();
        });

        // Add all commands to subscriptions
        context.subscriptions.push(
            addTaskCommand,
            validateTaskCommand,
            archiveTaskCommand,
            unarchiveTaskCommand,
            deleteTaskCommand,
            refreshTasksCommand,
            showTaskDetailsCommand,
            createMeetingCommand,
            setPreferredCalendarCommand
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

    /**
     * Creates a calendar meeting from a task using web-based calendars
     */
    private async createOutlookMeeting(item: TaskTreeItem): Promise<void> {
        try {
            const task = item.task;
            const subject = encodeURIComponent(task.title);
            const body = encodeURIComponent(task.description);
            const startDate = task.dueDate.toISOString();
            
            // Get user's preferred calendar from settings
            const preferredCalendar = vscode.workspace.getConfiguration('recurringTasks').get<string>('preferredCalendar', 'Ask each time');
            
            let calendarChoice: string;
            
            if (preferredCalendar === 'Ask each time') {
                // Ask user which web calendar to use
                const userChoice = await vscode.window.showQuickPick(
                    ['Outlook Web', 'Google Calendar'],
                    {
                        placeHolder: 'Choose calendar application for meeting creation',
                        canPickMany: false
                    }
                );
                
                if (!userChoice) {
                    vscode.window.showInformationMessage('Calendar meeting creation cancelled.');
                    return;
                }
                
                calendarChoice = userChoice;
            } else {
                // Use the preferred calendar setting
                calendarChoice = preferredCalendar;
            }
            
            let meetingUrl: string;
            
            if (calendarChoice === 'Outlook Web') {
                meetingUrl = `https://outlook.office.com/calendar/action/compose?subject=${subject}&body=${body}&startdt=${startDate}`;
            } else if (calendarChoice === 'Google Calendar') {
                // Google Calendar requires dates in YYYYMMDDTHHMMSSZ format
                const googleStartDate = this.formatDateForGoogleCalendar(task.dueDate);
                const googleEndDate = this.formatDateForGoogleCalendar(new Date(task.dueDate.getTime() + 60 * 60 * 1000)); // 1 hour later
                meetingUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${subject}&details=${body}&dates=${googleStartDate}/${googleEndDate}`;
            } else {
                vscode.window.showErrorMessage('Invalid calendar choice');
                return;
            }
            
            // Open the meeting URL
            await vscode.env.openExternal(vscode.Uri.parse(meetingUrl));
            vscode.window.showInformationMessage(`Opening ${calendarChoice} for: ${task.title}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create calendar meeting: ${error}`);
        }
    }

    /**
     * Formats a date for Google Calendar URL (YYYYMMDDTHHMMSSZ format)
     */
    private formatDateForGoogleCalendar(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    /**
     * Allows users to set their preferred calendar provider
     */
    private async setPreferredCalendar(): Promise<void> {
        const currentSetting = vscode.workspace.getConfiguration('recurringTasks').get<string>('preferredCalendar', 'Ask each time');
        
        const choice = await vscode.window.showQuickPick(
            ['Outlook Web', 'Google Calendar', 'Ask each time'],
            {
                placeHolder: `Current setting: ${currentSetting}. Choose your preferred calendar:`,
                canPickMany: false
            }
        );
        
        if (choice) {
            await vscode.workspace.getConfiguration('recurringTasks').update('preferredCalendar', choice, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Preferred calendar set to: ${choice}`);
        }
    }

    /**
     * Gets the currently selected task from the tree view
     */
    private async getSelectedTask(): Promise<TaskTreeItem | undefined> {
        try {
            // For now, let's get the first available task as a fallback
            // In a more sophisticated implementation, we would get the actually selected task
            const tasks = this.taskManager.getTasks();
            if (tasks.length > 0) {
                // Create a TaskTreeItem from the first task
                return {
                    task: tasks[0],
                    label: tasks[0].title,
                    collapsibleState: vscode.TreeItemCollapsibleState.None
                } as TaskTreeItem;
            }

            return undefined;
        } catch (error) {
            console.error('Error getting selected task:', error);
            return undefined;
        }
    }
} 