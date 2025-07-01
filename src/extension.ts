// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our custom classes
import { StorageManager } from './StorageManager';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';
import { TaskDetailsProvider } from './TaskDetailsProvider';
import { Commands } from './Commands';
import { NotificationManager } from './NotificationManager';

// Global variables to maintain references
let taskProvider: TaskProvider;
let taskManager: TaskManager;
let storageManager: StorageManager;
let commands: Commands;
let notificationManager: NotificationManager;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('RecurringTasks extension is now active!');

	try {
		// Initialize the storage manager
		storageManager = new StorageManager(context);
		
		// Initialize the task manager with storage
		taskManager = new TaskManager(storageManager);
		
		// Set the task manager in the TaskDetailsProvider for comment management
		TaskDetailsProvider.setTaskManager(taskManager);
		
		// Initialize the task provider
		taskProvider = new TaskProvider(taskManager);
		
		// Set the task provider in the TaskDetailsProvider for refreshing the sidebar
		TaskDetailsProvider.setTaskProvider(taskProvider);
		
		// Initialize the notification manager
		notificationManager = new NotificationManager(taskManager, taskProvider, context);
		
		// Set the notification manager in the TaskDetailsProvider for notification state display
		TaskDetailsProvider.setNotificationManager(notificationManager);
		
		// Initialize commands with task manager, provider, and notification manager
		commands = new Commands(taskManager, taskProvider, context.extensionUri, notificationManager);
		
		// Register the tree view
		const treeView = vscode.window.createTreeView('recurringTasks.view', {
			treeDataProvider: taskProvider
		});
		
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
			})
		);
		
		// Initial refresh of the view
		taskProvider.refresh();
		
		// Set up event listener for task updates
		// This ensures the view refreshes when tasks change
		const updateView = () => {
			taskProvider.refresh();
		};
		
		// Add the tree view to subscriptions
		context.subscriptions.push(treeView);
		
		console.log('RecurringTasks extension initialized successfully');
		
	} catch (error) {
		console.error('Failed to initialize RecurringTasks extension:', error);
		vscode.window.showErrorMessage('Failed to initialize RecurringTasks extension. Please check the console for details.');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('RecurringTasks extension is now deactivated');
	
	// Clean up any resources if needed
	if (taskProvider) {
		taskProvider.refresh();
	}
	
	// Clean up notification manager
	if (notificationManager) {
		notificationManager.dispose();
	}
}
