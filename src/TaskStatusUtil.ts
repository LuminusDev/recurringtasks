import { Task } from './Task';

/**
 * Utility class for calculating task status, progress, and time-related information
 */
export class TaskStatusUtil {
    
    /**
     * Calculates and returns the time remaining until the task is due
     */
    static getTimeRemaining(task: Task): string {
        const now = new Date();
        const dueDate = task.dueDate;
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
        } else if (diffDays === 0) {
            return 'Due today';
        } else if (diffDays === 1) {
            return 'Due tomorrow';
        } else if (diffDays <= 7) {
            return `Due in ${diffDays} days`;
        } else {
            const diffWeeks = Math.ceil(diffDays / 7);
            return `Due in ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Calculates the time progress percentage
     */
    static getTimeProgress(task: Task): number {
        const now = new Date();
        const dueDate = task.dueDate;
        
        // For recurring tasks, calculate progress based on the current period
        // Find the start of the current period (previous due date or start date)
        const currentPeriodStart = TaskStatusUtil.getCurrentPeriodStart(task);
        
        // Calculate progress based on position within the current period
        const totalDuration = dueDate.getTime() - currentPeriodStart.getTime();
        const elapsed = now.getTime() - currentPeriodStart.getTime();
        
        // Ensure progress is between 0 and 100
        const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
        return Math.round(progress);
    }

    /**
     * Gets the start date of the current period
     */
    static getCurrentPeriodStart(task: Task): Date {
        const { value, unit } = task.periodicity;
        const dueDate = task.dueDate;
        
        // Calculate the start of the current period by subtracting the periodicity
        const currentPeriodStart = new Date(dueDate);
        
        switch (unit) {
            case 'days':
                currentPeriodStart.setDate(currentPeriodStart.getDate() - value);
                break;
            case 'weeks':
                currentPeriodStart.setDate(currentPeriodStart.getDate() - (value * 7));
                break;
            case 'months':
                currentPeriodStart.setMonth(currentPeriodStart.getMonth() - value);
                break;
            case 'years':
                currentPeriodStart.setFullYear(currentPeriodStart.getFullYear() - value);
                break;
        }
        
        return currentPeriodStart;
    }

    /**
     * Calculates the "due soon" threshold in milliseconds based on periodicity
     */
    static getDueSoonThreshold(task: Task): number {
        const { value, unit } = task.periodicity;
        
        // Special handling for daily tasks
        if (unit === 'days' && value === 1) {
            // For daily tasks, consider "due soon" if due within 6 hours
            return 6 * 60 * 60 * 1000; // 6 hours
        }
        
        // Calculate threshold as a percentage of the periodicity
        // For example: 25% of the period for most cases, but with minimums and maximums
        let thresholdPercentage = 0.25; // 25% of the period
        
        // Adjust percentage based on periodicity type
        switch (unit) {
            case 'days':
                if (value <= 3) {
                    thresholdPercentage = 0.33; // 33% for 2-3 day tasks
                } else {
                    thresholdPercentage = 0.25; // 25% for longer daily tasks
                }
                break;
            case 'weeks':
                if (value <= 1) {
                    thresholdPercentage = 0.3; // 30% for weekly tasks
                } else if (value <= 2) {
                    thresholdPercentage = 0.25; // 25% for bi-weekly tasks
                } else {
                    thresholdPercentage = 0.2; // 20% for longer weekly tasks
                }
                break;
            case 'months':
                if (value <= 1) {
                    thresholdPercentage = 0.2; // 20% for monthly tasks
                } else if (value <= 3) {
                    thresholdPercentage = 0.15; // 15% for quarterly tasks
                } else {
                    thresholdPercentage = 0.1; // 10% for longer monthly tasks
                }
                break;
            case 'years':
                thresholdPercentage = 0.05; // 5% for yearly tasks
                break;
        }
        
        // Calculate threshold in milliseconds
        let thresholdMs: number;
        switch (unit) {
            case 'days':
                thresholdMs = value * 24 * 60 * 60 * 1000 * thresholdPercentage;
                break;
            case 'weeks':
                thresholdMs = value * 7 * 24 * 60 * 60 * 1000 * thresholdPercentage;
                break;
            case 'months':
                // Approximate: 30.44 days per month
                thresholdMs = value * 30.44 * 24 * 60 * 60 * 1000 * thresholdPercentage;
                break;
            case 'years':
                // Approximate: 365.25 days per year
                thresholdMs = value * 365.25 * 24 * 60 * 60 * 1000 * thresholdPercentage;
                break;
            default:
                thresholdMs = value * 24 * 60 * 60 * 1000 * thresholdPercentage;
        }
        
        // Apply minimum and maximum bounds (but not for daily tasks)
        const minThreshold = 24 * 60 * 60 * 1000; // 1 day minimum
        const maxThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days maximum
        
        return Math.max(minThreshold, Math.min(maxThreshold, thresholdMs));
    }

    /**
     * Checks if the task is due soon based on its periodicity
     */
    static isDueSoon(task: Task): boolean {
        const now = new Date();
        const dueDate = task.dueDate;
        
        // Calculate "due soon" threshold based on periodicity
        const dueSoonThreshold = TaskStatusUtil.getDueSoonThreshold(task);
        const dueSoonDate = new Date(now.getTime() + dueSoonThreshold);
        
        return dueDate <= dueSoonDate && !TaskStatusUtil.isOverdue(task);
    }

    /**
     * Checks if the task is overdue
     */
    static isOverdue(task: Task): boolean {
        return task.dueDate < new Date();
    }

    /**
     * Creates a simple progress bar using Unicode characters
     */
    static createProgressBar(progress: number): string {
        const filledBlocks = Math.floor(progress / 10);
        const emptyBlocks = 10 - filledBlocks;
        
        return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    }

    /**
     * Returns a combined status and progress description
     */
    static getMixedStatusAndProgress(task: Task): string {
        const progress = TaskStatusUtil.getTimeProgress(task);
        const timeRemaining = TaskStatusUtil.getTimeRemaining(task);
        
        // Create status indicators
        let statusIndicator = '';
        if (TaskStatusUtil.isOverdue(task)) {
            statusIndicator = '🔴 ';
        } else if (TaskStatusUtil.isDueSoon(task)) {
            statusIndicator = '🟡 ';
        } else {
            statusIndicator = '✅ ';
        }
        
        // Create a simple progress bar using Unicode characters
        const progressBar = TaskStatusUtil.createProgressBar(progress);
        
        // Combine progress and status
        return `${statusIndicator}${progressBar} ${progress}% | ${timeRemaining}`;
    }

    /**
     * Creates a comprehensive status that considers both urgency and progress
     */
    static getComprehensiveStatus(task: Task): string {
        const progress = TaskStatusUtil.getTimeProgress(task);
        const timeRemaining = TaskStatusUtil.getTimeRemaining(task);
        
        // Determine status based on both urgency and progress
        if (TaskStatusUtil.isOverdue(task)) {
            if (progress >= 100) {
                return `🔴 Overdue (${timeRemaining})`;
            } else {
                return `🔴 Overdue - ${progress}% complete (${timeRemaining})`;
            }
        } else if (TaskStatusUtil.isDueSoon(task)) {
            if (progress >= 80) {
                return `🟡 Due soon - ${progress}% complete (${timeRemaining})`;
            } else {
                return `🟡 Due soon - ${progress}% complete (${timeRemaining})`;
            }
        } else {
            if (progress >= 100) {
                return `✅ Complete (${timeRemaining})`;
            } else {
                return `✅ ${progress}% complete (${timeRemaining})`;
            }
        }
    }
} 