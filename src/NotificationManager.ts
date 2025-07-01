import * as vscode from 'vscode';
import { Task } from './Task';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';

/**
 * Notification frequency options
 */
export type NotificationFrequency = 
    | 'immediate'  // Show immediately when task becomes due/overdue
    | 'hourly'     // Show at most once per hour
    | 'daily'      // Show at most once per day
    | 'disabled';  // Never show notifications

/**
 * Represents a notification state for a task
 */
interface TaskNotificationState {
    taskId: string;
    lastNotificationTime: Date;
    notificationCount: number;
    isOverdue: boolean;
}

/**
 * Manages task notifications with smart throttling and user preferences
 */
export class NotificationManager {
    private taskManager: TaskManager;
    private taskProvider: TaskProvider;
    private context: vscode.ExtensionContext;
    private notificationStates: Map<string, TaskNotificationState> = new Map();
    private checkInterval: NodeJS.Timeout | undefined;
    private readonly CHECK_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes

    constructor(taskManager: TaskManager, taskProvider: TaskProvider, context: vscode.ExtensionContext) {
        this.taskManager = taskManager;
        this.taskProvider = taskProvider;
        this.context = context;
        this.loadNotificationStates();
        this.startPeriodicCheck();
        this.setupConfigurationListener();
    }

    /**
     * Starts the periodic check for due/overdue tasks
     */
    private startPeriodicCheck(): void {
        this.checkInterval = setInterval(() => {
            this.checkAndNotifyDueTasks();
        }, this.CHECK_INTERVAL_MS);
    }

    /**
     * Sets up a listener for configuration changes
     */
    private setupConfigurationListener(): void {
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('recurringTasks.notifications')) {
                // Notify that settings have changed
                this.notifySettingsChanged();
                
                // Import TaskDetailsProvider to refresh webview
                const { TaskDetailsProvider } = require('./TaskDetailsProvider');
                TaskDetailsProvider.refreshWebviewForNotificationChange();
            }
        });
    }

    /**
     * Stops the periodic check
     */
    public stopPeriodicCheck(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
    }

    /**
     * Loads notification states from storage
     */
    private loadNotificationStates(): void {
        const savedStates = this.context.globalState.get<Record<string, any>>('notificationStates', {});
        
        // Convert serialized dates back to Date objects
        for (const [taskId, state] of Object.entries(savedStates)) {
            const restoredState: TaskNotificationState = {
                taskId: state.taskId,
                lastNotificationTime: new Date(state.lastNotificationTime),
                notificationCount: state.notificationCount || 0,
                isOverdue: state.isOverdue || false
            };
            this.notificationStates.set(taskId, restoredState);
        }
    }

    /**
     * Saves notification states to storage
     */
    private saveNotificationStates(): void {
        const statesObject = Object.fromEntries(this.notificationStates);
        this.context.globalState.update('notificationStates', statesObject);
    }

    /**
     * Gets the user's notification preferences from VS Code settings
     */
    private getNotificationSettings(): {
        enabled: boolean;
        frequency: NotificationFrequency;
        showOverdueOnly: boolean;
        maxNotificationsPerTask: number;
    } {
        const config = vscode.workspace.getConfiguration('recurringTasks.notifications');
        
        return {
            enabled: config.get<boolean>('enabled', true),
            frequency: config.get<NotificationFrequency>('frequency', 'hourly'),
            showOverdueOnly: config.get<boolean>('showOverdueOnly', false),
            maxNotificationsPerTask: config.get<number>('maxNotificationsPerTask', 5)
        };
    }

    /**
     * Checks if enough time has passed since the last notification for a task
     */
    private shouldShowNotification(taskId: string, isOverdue: boolean, settings: ReturnType<typeof this.getNotificationSettings>): boolean {
        if (!settings.enabled || settings.frequency === 'disabled') {
            return false;
        }

        // Get the notification state for this task
        const state = this.notificationStates.get(taskId);
        
        // If we've exceeded the max notifications for this task, don't show more
        if (state && state.notificationCount >= settings.maxNotificationsPerTask) {
            return false;
        }

        // If this is the first notification for this task, show it
        if (!state) {
            return true;
        }

        // Check if enough time has passed based on frequency setting
        const now = new Date();
        const timeSinceLastNotification = now.getTime() - state.lastNotificationTime.getTime();
        
        switch (settings.frequency) {
            case 'immediate':
                return true;
            case 'hourly':
                return timeSinceLastNotification >= 60 * 60 * 1000; // 1 hour
            case 'daily':
                return timeSinceLastNotification >= 24 * 60 * 60 * 1000; // 24 hours
            default:
                return false;
        }
    }

    /**
     * Updates the notification state for a task
     */
    private updateNotificationState(taskId: string, isOverdue: boolean): void {
        const existingState = this.notificationStates.get(taskId);
        
        const newState: TaskNotificationState = {
            taskId,
            lastNotificationTime: new Date(),
            notificationCount: existingState ? existingState.notificationCount + 1 : 1,
            isOverdue
        };
        
        this.notificationStates.set(taskId, newState);
        this.saveNotificationStates();
        
        // Refresh webview if it's showing this task
        this.refreshWebviewForTask(taskId);
    }

    /**
     * Creates a notification message for a task
     */
    private createNotificationMessage(task: Task, isOverdue: boolean): string {
        const overdueText = isOverdue ? 'OVERDUE: ' : '';
        const dueDateText = task.dueDate.toLocaleDateString();
        
        if (isOverdue) {
            const daysSinceOverdue = Math.floor((new Date().getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24));
            return `${overdueText}${task.title} (due ${dueDateText}, ${daysSinceOverdue} day${daysSinceOverdue === 1 ? '' : 's'} ago)`;
        } else {
            return `${task.title} is due today (${dueDateText})`;
        }
    }

    /**
     * Shows a notification for a task with appropriate actions
     */
    private async showTaskNotification(task: Task, isOverdue: boolean): Promise<void> {
        const message = this.createNotificationMessage(task, isOverdue);
        
        // Get snooze duration for the action text
        const settings = this.getNotificationSettings();
        const snoozeDuration = this.getSnoozeDuration(settings.frequency);
        const snoozeText = this.formatSnoozeDuration(snoozeDuration);
        
        // Define notification actions
        const validateAction = 'Validate Task';
        const showDetailsAction = 'Show Details';
        const snoozeAction = `Snooze (${snoozeText})`;
        const disableAction = 'Disable Notifications';
        
        // Show the notification with actions
        const selectedAction = await vscode.window.showWarningMessage(
            message,
            validateAction,
            showDetailsAction,
            snoozeAction,
            disableAction
        );
        
        // Handle the user's action
        switch (selectedAction) {
            case validateAction:
                await this.handleValidateTask(task);
                break;
            case showDetailsAction:
                await this.handleShowTaskDetails(task);
                break;
            case snoozeAction:
                this.handleSnoozeTask(task.id);
                break;
            case disableAction:
                await this.handleDisableNotifications();
                break;
        }
        
        // Refresh webview if it's showing this task
        this.refreshWebviewForTask(task.id);
    }

    /**
     * Handles task validation from notification
     */
    private async handleValidateTask(task: Task): Promise<void> {
        const comment = await vscode.window.showInputBox({
            prompt: 'Add a validation comment (optional)',
            placeHolder: 'Task completed successfully...'
        });
        
        this.taskManager.validateTask(task.id, comment || '');
        this.taskProvider.refresh();
        
        // Remove from notification states since task is validated
        this.notificationStates.delete(task.id);
        this.saveNotificationStates();
        
        vscode.window.showInformationMessage(`Task "${task.title}" validated successfully!`);
        
        // Refresh webview if it's showing this task
        this.refreshWebviewForTask(task.id);
    }

    /**
     * Handles showing task details from notification
     */
    private async handleShowTaskDetails(task: Task): Promise<void> {
        // Execute the existing show details command
        await vscode.commands.executeCommand('recurringtasks.showTaskDetails', task);
    }

    /**
     * Handles snoozing a task notification
     */
    private handleSnoozeTask(taskId: string): void {
        const settings = this.getNotificationSettings();
        const snoozeDuration = this.getSnoozeDuration(settings.frequency);
        
        const state = this.notificationStates.get(taskId);
        if (state) {
            // Set the last notification time to the snooze duration from now
            state.lastNotificationTime = new Date(Date.now() + snoozeDuration);
            this.notificationStates.set(taskId, state);
            this.saveNotificationStates();
        }
        
        const snoozeText = this.formatSnoozeDuration(snoozeDuration);
        vscode.window.showInformationMessage(`Task notification snoozed for ${snoozeText}`);
        
        // Refresh webview if it's showing this task
        this.refreshWebviewForTask(taskId);
    }

    /**
     * Gets the appropriate snooze duration based on notification frequency
     */
    private getSnoozeDuration(frequency: NotificationFrequency): number {
        switch (frequency) {
            case 'immediate':
                return 30 * 60 * 1000; // 30 minutes for immediate
            case 'hourly':
                return 2 * 60 * 60 * 1000; // 2 hours for hourly (longer than frequency)
            case 'daily':
                return 6 * 60 * 60 * 1000; // 6 hours for daily
            case 'disabled':
                return 24 * 60 * 60 * 1000; // 24 hours for disabled
            default:
                return 2 * 60 * 60 * 1000; // Default to 2 hours
        }
    }

    /**
     * Formats the snooze duration for display
     */
    private formatSnoozeDuration(durationMs: number): string {
        const hours = Math.floor(durationMs / (60 * 60 * 1000));
        const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));
        
        if (hours > 0 && minutes > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Handles disabling notifications
     */
    private async handleDisableNotifications(): Promise<void> {
        const config = vscode.workspace.getConfiguration('recurringTasks.notifications');
        await config.update('enabled', false, vscode.ConfigurationTarget.Global);
        
        // Notify that settings have changed
        this.notifySettingsChanged();
        
        // Import TaskDetailsProvider to refresh webview
        const { TaskDetailsProvider } = require('./TaskDetailsProvider');
        TaskDetailsProvider.refreshWebviewForNotificationChange();
        
        vscode.window.showInformationMessage(
            'Task notifications disabled. You can re-enable them in settings.',
            'Open Settings'
        ).then((action: string | undefined) => {
            if (action === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'recurringTasks.notifications');
            }
        });
    }

    /**
     * Main method to check and notify about due tasks
     */
    public checkAndNotifyDueTasks(): void {
        const settings = this.getNotificationSettings();
        
        if (!settings.enabled) {
            return;
        }
        
        const now = new Date();
        const activeTasks = this.taskManager.getTasks();
        
        // Check each active task
        for (const task of activeTasks) {
            const isOverdue = task.dueDate < now;
            const isDueToday = this.isSameDay(task.dueDate, now);
            
            // Skip if we only want overdue notifications and task is not overdue
            if (settings.showOverdueOnly && !isOverdue) {
                continue;
            }
            
            // Show notification for overdue tasks or tasks due today
            if (isOverdue || isDueToday) {
                if (this.shouldShowNotification(task.id, isOverdue, settings)) {
                    this.showTaskNotification(task, isOverdue);
                    this.updateNotificationState(task.id, isOverdue);
                }
            }
        }
        
        // Clean up notification states for tasks that no longer exist
        this.cleanupNotificationStates(activeTasks);
    }

    /**
     * Utility method to check if two dates are on the same day
     */
    private isSameDay(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    /**
     * Cleans up notification states for tasks that no longer exist
     */
    private cleanupNotificationStates(activeTasks: Task[]): void {
        const activeTaskIds = new Set(activeTasks.map(task => task.id));
        
        for (const [taskId] of this.notificationStates) {
            if (!activeTaskIds.has(taskId)) {
                this.notificationStates.delete(taskId);
            }
        }
        
        this.saveNotificationStates();
    }

    /**
     * Manually triggers a check for due tasks (useful for testing or immediate check)
     */
    public async checkNow(): Promise<void> {
        this.checkAndNotifyDueTasks();
        vscode.window.showInformationMessage('Task notification check completed');
    }

    /**
     * Resets all notification states (useful for testing or troubleshooting)
     */
    public async resetNotificationStates(): Promise<void> {
        this.notificationStates.clear();
        this.saveNotificationStates();
        vscode.window.showInformationMessage('All notification states have been reset');
    }

    /**
     * Reactivates notifications for a specific task by removing its notification state
     */
    public async reactivateNotificationsForTask(taskId: string): Promise<void> {
        const task = this.taskManager.getTasks().find(t => t.id === taskId);
        if (!task) {
            vscode.window.showErrorMessage('Task not found or is not active');
            return;
        }

        const wasRemoved = this.notificationStates.delete(taskId);
        this.saveNotificationStates();
        
        // Notify that settings have changed
        this.notifySettingsChanged();
        
        // Import TaskDetailsProvider to refresh webview
        const { TaskDetailsProvider } = require('./TaskDetailsProvider');
        TaskDetailsProvider.refreshWebviewForNotificationChange();
        
        if (wasRemoved) {
            vscode.window.showInformationMessage(`Notifications reactivated for task "${task.title}"`);
        } else {
            vscode.window.showInformationMessage(`Task "${task.title}" was not in notification state (notifications are already active)`);
        }
    }

    /**
     * Gets statistics about notifications
     */
    public getNotificationStats(): {
        totalTasks: number;
        notifiedTasks: number;
        overdueNotified: number;
        settings: ReturnType<NotificationManager['getNotificationSettings']>;
    } {
        const settings = this.getNotificationSettings();
        const overdueCount = Array.from(this.notificationStates.values())
            .filter(state => state.isOverdue).length;
        
        return {
            totalTasks: this.taskManager.getTasks().length,
            notifiedTasks: this.notificationStates.size,
            overdueNotified: overdueCount,
            settings
        };
    }

    /**
     * Notifies that notification settings have changed (for webview updates)
     */
    public notifySettingsChanged(): void {
        // This will be called when notification settings change
        // The TaskDetailsProvider can listen for this and refresh the webview
        this.taskProvider.refresh();
    }

    /**
     * Refreshes the webview for a specific task
     */
    private refreshWebviewForTask(taskId: string): void {
        try {
            // Import TaskDetailsProvider to refresh webview
            const { TaskDetailsProvider } = require('./TaskDetailsProvider');
            TaskDetailsProvider.refreshWebviewForNotificationChange();
        } catch (error) {
            // Silently fail if TaskDetailsProvider is not available
            console.log('Could not refresh webview for task:', taskId);
        }
    }

    /**
     * Cleanup method to be called when the extension is deactivated
     */
    public dispose(): void {
        this.stopPeriodicCheck();
        this.saveNotificationStates();
    }
} 