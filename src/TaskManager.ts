import { Task, Periodicity, Comment, PeriodicityHelper } from './Task';
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
        return PeriodicityHelper.calculateNextDueDate(currentDueDate, periodicity);
    }

    /**
     * Returns all active tasks
     */
    getTasks(): Task[] {
        return this.tasks.filter(task => task.status === 'active');
    }

    /**
     * Adds a new task
     */
    addTask(title: string, periodicity: Periodicity, dueDate: Date, description?: string): Task {
        const newTask: Task = {
            id: this.generateId(),
            title,
            description,
            periodicity,
            creationDate: new Date(), // Automatically set to current date
            dueDate: new Date(dueDate), // Use the provided due date
            comments: [],
            status: 'active'
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
        
        // Generate auto-comment if no comment provided
        const finalCommentText = commentText.trim() || `Task validated on ${new Date().toLocaleDateString()}`;
        
        // Add the validation comment
        const comment: Comment = {
            id: this.generateCommentId(),
            text: finalCommentText,
            date: new Date(),
            isValidation: true
        };
        
        task.comments.push(comment);
        
        // Handle non-recurring tasks differently - archive them after validation
        if (!task.periodicity.isRecurring || task.periodicity.type === 'none') {
            task.status = 'archived';
        } else {
            // Calculate the next due date based on periodicity for recurring tasks
            task.dueDate = this.calculateNextDueDate(task.dueDate, task.periodicity);
        }
        
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
            date: new Date(),
            isValidation: false
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
     * Archives a task
     */
    archiveTask(taskId: string): boolean {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.status = 'archived';
            this.saveTasks();
            return true;
        }
        return false;
    }

    /**
     * Unarchives a task
     */
    unarchiveTask(taskId: string): boolean {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.status = 'active';
            this.saveTasks();
            return true;
        }
        return false;
    }

    /**
     * Deletes a task permanently
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
        return this.tasks.filter(task => task.status === 'active' && task.dueDate < now);
    }

    /**
     * Gets archived tasks
     */
    getArchivedTasks(): Task[] {
        return this.tasks.filter(task => task.status === 'archived');
    }

    /**
     * Gets all tasks (both active and archived) for export
     */
    getAllTasks(): Task[] {
        return [...this.tasks];
    }

    /**
     * Exports all tasks to JSON format
     */
    exportTasks(): string {
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            tasks: this.tasks
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Imports tasks from JSON data, adding them to existing tasks without deleting current ones
     * Returns the number of tasks imported and any errors encountered
     */
    importTasks(jsonData: string): { success: boolean; imported: number; errors: string[]; message: string } {
        try {
            const parsedData = JSON.parse(jsonData);
            const errors: string[] = [];
            let imported = 0;

            // Validate the JSON structure
            if (!parsedData.tasks || !Array.isArray(parsedData.tasks)) {
                return {
                    success: false,
                    imported: 0,
                    errors: ['Invalid JSON format: tasks array not found'],
                    message: 'Import failed: Invalid JSON format'
                };
            }

            // Get existing task IDs to avoid duplicates
            const existingIds = new Set(this.tasks.map(task => task.id));

            // Process each task in the import data
            for (let i = 0; i < parsedData.tasks.length; i++) {
                const taskData = parsedData.tasks[i];
                
                try {
                    // Validate required fields
                    if (!taskData.id || !taskData.title || !taskData.periodicity) {
                        errors.push(`Task ${i + 1}: Missing required fields (id, title, or periodicity)`);
                        continue;
                    }

                    // Check for duplicate IDs
                    if (existingIds.has(taskData.id)) {
                        // Generate a new unique ID for the duplicate
                        const originalId = taskData.id;
                        taskData.id = this.generateId();
                        errors.push(`Task "${taskData.title}": Duplicate ID ${originalId} found, assigned new ID ${taskData.id}`);
                    }

                    // Convert date strings back to Date objects
                    const task: Task = {
                        id: taskData.id,
                        title: taskData.title,
                        description: taskData.description || undefined,
                        periodicity: taskData.periodicity,
                        creationDate: new Date(taskData.creationDate || new Date()),
                        dueDate: new Date(taskData.dueDate || new Date()),
                        comments: taskData.comments ? taskData.comments.map((comment: any) => ({
                            id: comment.id || this.generateCommentId(),
                            text: comment.text || '',
                            date: new Date(comment.date || new Date()),
                            isValidation: comment.isValidation || false
                        })) : [],
                        status: taskData.status || 'active'
                    };

                    // Add the task
                    this.tasks.push(task);
                    existingIds.add(task.id);
                    imported++;

                } catch (taskError) {
                    errors.push(`Task ${i + 1}: ${taskError}`);
                }
            }

            // Save tasks if any were imported
            if (imported > 0) {
                this.saveTasks();
            }

            const message = imported > 0 
                ? `Successfully imported ${imported} task${imported === 1 ? '' : 's'}`
                : 'No tasks were imported';

            return {
                success: imported > 0,
                imported,
                errors,
                message: errors.length > 0 ? `${message}. ${errors.length} warning(s)/error(s) occurred.` : message
            };

        } catch (parseError) {
            return {
                success: false,
                imported: 0,
                errors: [`JSON parsing error: ${parseError}`],
                message: 'Import failed: Invalid JSON format'
            };
        }
    }
} 