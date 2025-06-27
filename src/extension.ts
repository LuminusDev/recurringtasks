// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// Import our custom classes
import { StorageManager } from './StorageManager';
import { TaskManager } from './TaskManager';
import { TaskProvider } from './TaskProvider';
import { Commands } from './Commands';

// Global variables to maintain references
let taskProvider: TaskProvider;
let taskManager: TaskManager;
let storageManager: StorageManager;
let commands: Commands;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('RecurringTasks extension is now active!');

	try {
		// Initialize the storage manager
		storageManager = new StorageManager(context);
		
		// Initialize the task manager with storage
		taskManager = new TaskManager(storageManager);
		
		// Initialize the task provider
		taskProvider = new TaskProvider();
		
		// Initialize commands with task manager and provider
		commands = new Commands(taskManager, taskProvider, context.extensionUri);
		
		// Register the tree view
		const treeView = vscode.window.createTreeView('recurringTasks.view', {
			treeDataProvider: taskProvider
		});
		
		// Register all commands
		commands.registerCommands(context);
		
		// Load initial tasks and update the view
		const initialTasks = taskManager.getTasks();
		taskProvider.updateTasks(initialTasks);
		
		// Set up event listener for task updates
		// This ensures the view refreshes when tasks change
		const updateView = () => {
			const tasks = taskManager.getTasks();
			taskProvider.updateTasks(tasks);
		};
		
		// Add the tree view to subscriptions
		context.subscriptions.push(treeView);
		
		// Show activation message
		vscode.window.showInformationMessage('RecurringTasks extension activated! Use the sidebar to manage your tasks.');
		
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
}
