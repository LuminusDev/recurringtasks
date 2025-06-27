import { Task, Periodicity, Comment } from './Task';
import { StorageManager } from './StorageManager';

/**
 * Manages all task operations and business logic
 */
export class TaskManager {
    private tasks: Task[] = [];
    private storageManager: StorageManager;

    constructor(storageManager: StorageManager) {
        this.storageManager = storageManager;
        this.loadTasks();
    }

    /**
     * Loads tasks from storage
     */
    private loadTasks(): void {
        this.tasks = this.storageManager.getTasks();
    }

    /**
     * Saves tasks to storage
     */
    private saveTasks(): void {
        this.storageManager.saveTasks(this.tasks);
    }

    /**
     * Generates a unique ID for a task
     */
    private generateId(): string {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generates a unique ID for a comment
     */
    private generateCommentId(): string {
        return 'comment_' + Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Calculates the next due date based on periodicity
     */
    private calculateNextDueDate(currentDueDate: Date, periodicity: Periodicity): Date {
        const nextDate = new Date(currentDueDate);
        
        switch (periodicity.unit) {
            case 'days':
                nextDate.setDate(nextDate.getDate() + periodicity.value);
                break;
            case 'weeks':
                nextDate.setDate(nextDate.getDate() + (periodicity.value * 7));
                break;
            case 'months':
                nextDate.setMonth(nextDate.getMonth() + periodicity.value);
                break;
            case 'years':
                nextDate.setFullYear(nextDate.getFullYear() + periodicity.value);
                break;
        }
        
        return nextDate;
    }

    /**
     * Returns all tasks
     */
    getTasks(): Task[] {
        return [...this.tasks]; // Return a copy to prevent external modifications
    }

    /**
     * Adds a new task
     */
    addTask(title: string, description: string, periodicity: Periodicity, startDate: Date): Task {
        const newTask: Task = {
            id: this.generateId(),
            title,
            description,
            periodicity,
            startDate,
            dueDate: new Date(startDate), // Initial due date is the same as start date
            comments: []
        };

        this.tasks.push(newTask);
        this.saveTasks();
        
        return newTask;
    }

    /**
     * Validates a task with a comment and calculates the next due date
     */
    validateTask(taskId: string, commentText: string): Task | null {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            return null; // Task not found
        }

        const task = this.tasks[taskIndex];
        
        // Add the validation comment
        const comment: Comment = {
            id: this.generateCommentId(),
            text: commentText,
            date: new Date()
        };
        
        task.comments.push(comment);
        
        // Calculate the next due date based on periodicity
        task.dueDate = this.calculateNextDueDate(task.dueDate, task.periodicity);
        
        this.saveTasks();
        
        return task;
    }

    /**
     * Adds a comment to a task
     */
    addComment(taskId: string, commentText: string): Task | null {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            return null; // Task not found
        }

        const task = this.tasks[taskIndex];
        
        // Add the comment
        const comment: Comment = {
            id: this.generateCommentId(),
            text: commentText,
            date: new Date()
        };
        
        task.comments.push(comment);
        this.saveTasks();
        
        return task;
    }

    /**
     * Updates a comment
     */
    updateComment(taskId: string, commentId: string, newText: string): Task | null {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            return null; // Task not found
        }

        const task = this.tasks[taskIndex];
        const commentIndex = task.comments.findIndex(comment => comment.id === commentId);
        
        if (commentIndex === -1) {
            return null; // Comment not found
        }

        // Update the comment
        task.comments[commentIndex].text = newText;
        task.comments[commentIndex].date = new Date(); // Update the date to show it was modified
        
        this.saveTasks();
        
        return task;
    }

    /**
     * Deletes a comment
     */
    deleteComment(taskId: string, commentId: string): Task | null {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            return null; // Task not found
        }

        const task = this.tasks[taskIndex];
        const commentIndex = task.comments.findIndex(comment => comment.id === commentId);
        
        if (commentIndex === -1) {
            return null; // Comment not found
        }

        // Remove the comment
        task.comments.splice(commentIndex, 1);
        this.saveTasks();
        
        return task;
    }

    /**
     * Deletes a task
     */
    deleteTask(taskId: string): boolean {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            return false; // Task not found
        }

        this.tasks.splice(taskIndex, 1);
        this.saveTasks();
        
        return true;
    }

    /**
     * Updates an existing task
     */
    updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'comments'>>): Task | null {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            return null; // Task not found
        }

        const task = this.tasks[taskIndex];
        
        // Update the task with new values
        Object.assign(task, updates);
        
        this.saveTasks();
        
        return task;
    }

    /**
     * Gets a specific task by ID
     */
    getTask(taskId: string): Task | null {
        return this.tasks.find(task => task.id === taskId) || null;
    }

    /**
     * Gets overdue tasks
     */
    getOverdueTasks(): Task[] {
        const now = new Date();
        return this.tasks.filter(task => task.dueDate < now);
    }

    /**
     * Gets tasks due within the next specified number of days
     */
    getTasksDueWithinDays(days: number): Task[] {
        const now = new Date();
        const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
        return this.tasks.filter(task => 
            task.dueDate >= now && task.dueDate <= futureDate
        );
    }
} 