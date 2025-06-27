import * as vscode from 'vscode';
import { Task } from './Task';

/**
 * Manages the persistence of tasks using VS Code's globalState
 */
export class StorageManager {
    private readonly storageKey = 'recurringTasks';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Loads and returns all tasks from storage
     * @returns Array of tasks, or empty array if no tasks exist
     */
    getTasks(): Task[] {
        const storedTasks = this.context.globalState.get<Task[]>(this.storageKey, []);
        
        // Convert date strings back to Date objects
        return storedTasks.map(task => ({
            ...task,
            startDate: new Date(task.startDate),
            dueDate: new Date(task.dueDate),
            comments: task.comments.map(comment => ({
                ...comment,
                date: new Date(comment.date)
            }))
        }));
    }

    /**
     * Saves the provided array of tasks to storage
     * @param tasks Array of tasks to save
     */
    saveTasks(tasks: Task[]): void {
        this.context.globalState.update(this.storageKey, tasks);
    }

    /**
     * Clears all stored tasks
     */
    clearTasks(): void {
        this.context.globalState.update(this.storageKey, []);
    }
} 