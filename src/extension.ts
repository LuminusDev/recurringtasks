// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our custom classes
import { StorageManager } from './StorageManager';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';
import { CalendarProvider } from './CalendarProvider';
import { TaskDetailsProvider } from './TaskDetailsProvider';
import { Commands } from './Commands';
import { NotificationManager } from './NotificationManager';
import { l10n } from 'vscode';

// Global variables to maintain references
let taskProvider: TaskProvider;
let calendarProvider: CalendarProvider;
let taskManager: TaskManager;
let storageManager: StorageManager;
let commands: Commands;
let notificationManager: NotificationManager;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log(l10n.t('RecurringTasks extension is now active!'));

	try {
		// Initialize the storage manager
		storageManager = new StorageManager(context);
		
		// Initialize the task manager with storage
		taskManager = new TaskManager(storageManager);
		
		// Set the task manager in the TaskDetailsProvider for comment management
		TaskDetailsProvider.setTaskManager(taskManager);
		
		// Initialize the task provider
		taskProvider = new TaskProvider(taskManager);
		
		// Initialize the calendar provider
		calendarProvider = new CalendarProvider(context.extensionUri, taskManager);
		
		// Set the task provider in the TaskDetailsProvider for refreshing the sidebar
		TaskDetailsProvider.setTaskProvider(taskProvider);
		
		// Set the calendar provider in the TaskDetailsProvider for refreshing the calendar
		TaskDetailsProvider.setCalendarProvider(calendarProvider);
		
		// Initialize the notification manager
		notificationManager = new NotificationManager(taskManager, taskProvider, calendarProvider, context);
		
		// Set the notification manager in the TaskDetailsProvider for notification state display
		TaskDetailsProvider.setNotificationManager(notificationManager);
		
		// Initialize commands with task manager, providers, and notification manager
		commands = new Commands(taskManager, taskProvider, calendarProvider, context.extensionUri, notificationManager);
		
		// Register the tree view
		const treeView = vscode.window.createTreeView('recurringTasks.view', {
			treeDataProvider: taskProvider
		});

		// Register the calendar webview provider
		const calendarWebview = vscode.window.registerWebviewViewProvider(
			CalendarProvider.viewType,
			calendarProvider
		);
		
		// Register all commands
		commands.registerCommands(context);
		
		// Register notification commands
		context.subscriptions.push(
			vscode.commands.registerCommand('recurringtasks.checkNotifications', () => {
				notificationManager.checkNow();
			}),
			vscode.commands.registerCommand('recurringtasks.resetNotifications', () => {
				notificationManager.resetNotificationStates();
			}),
			vscode.commands.registerCommand('recurringtasks.notificationSettings', () => {
				vscode.commands.executeCommand('workbench.action.openSettings', 'recurringTasks.notifications');
			}),
			vscode.commands.registerCommand('recurringtasks.showCalendar', () => {
				vscode.commands.executeCommand('recurringTasks.calendar.focus');
			})
		);
		
		taskProvider.refresh();
		calendarProvider.refresh();
		
		// Add the tree view and calendar webview to subscriptions
		context.subscriptions.push(treeView, calendarWebview);
		
		console.log(l10n.t('RecurringTasks extension initialized successfully'));
		
	} catch (error) {
		console.error('Failed to initialize RecurringTasks extension:', error);
		vscode.window.showErrorMessage(l10n.t('Failed to initialize RecurringTasks extension. Please check the console for details.'));
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log(l10n.t('RecurringTasks extension is now deactivated'));
	
	// Clean up any resources if needed
	if (taskProvider) {
		taskProvider.refresh();
	}
	
	// Clean up notification manager
	if (notificationManager) {
		notificationManager.dispose();
	}
}
