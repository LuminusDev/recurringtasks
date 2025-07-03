import { Task } from './Task';
import { l10n } from 'vscode';

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
        
        // Compare dates by setting time to start of day for accurate day comparison
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        
        const diffTime = dueDateOnly.getTime() - nowDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return l10n.t('taskStatus.overdueBy', Math.abs(diffDays), Math.abs(diffDays) !== 1 ? 's' : '');
        } else if (diffDays === 0) {
            return l10n.t('taskStatus.dueToday');
        } else if (diffDays === 1) {
            return l10n.t('taskStatus.dueTomorrow');
        } else if (diffDays <= 7) {
            return l10n.t('taskStatus.dueInDays', diffDays);
        } else {
            const diffWeeks = Math.ceil(diffDays / 7);
            return l10n.t('taskStatus.dueInWeeks', diffWeeks, diffWeeks !== 1 ? 's' : '');
        }
    }

    /**
     * Calculates the time progress percentage
     */
    static getTimeProgress(task: Task): number {
        const now = new Date();
        const dueDate = task.dueDate;
        
        // For one-shot tasks, calculate progress from creation date to due date
        if (!task.periodicity.isRecurring || task.periodicity.type === 'none') {
            const creationDate = task.creationDate;
            
            // If the task is overdue, return 100% progress
            if (now > dueDate) {
                return 100;
            }
            
            const totalDuration = dueDate.getTime() - creationDate.getTime();
            const elapsed = now.getTime() - creationDate.getTime();
            
            // Ensure progress is between 0 and 100
            const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
            return Math.round(progress);
        }
        
        // For recurring tasks, calculate progress based on the current period
        // Find the start of the current period (previous due date or creation date)
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
        const periodicity = task.periodicity;
        const dueDate = task.dueDate;
        
        // For one-shot tasks, use the creation date as the period start
        if (!periodicity.isRecurring || periodicity.type === 'none') {
            return new Date(task.creationDate);
        }
        
        // Calculate the start of the current period by subtracting the periodicity
        const currentPeriodStart = new Date(dueDate);
        
        switch (periodicity.type) {
            case 'daily':
                currentPeriodStart.setDate(currentPeriodStart.getDate() - 1);
                break;
            case 'weekly':
                currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);
                break;
            case 'monthly':
                currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);
                break;
            case 'yearly':
                currentPeriodStart.setFullYear(currentPeriodStart.getFullYear() - 1);
                break;
            case 'custom':
                if (periodicity.interval) {
                    currentPeriodStart.setDate(currentPeriodStart.getDate() - periodicity.interval);
                } else {
                    // Fallback to daily
                    currentPeriodStart.setDate(currentPeriodStart.getDate() - 1);
                }
                break;
        }
        
        return currentPeriodStart;
    }

    /**
     * Calculates the "due soon" threshold in milliseconds based on periodicity
     */
    static getDueSoonThreshold(task: Task): number {
        const periodicity = task.periodicity;
        
        // For one-shot tasks, use a 1-day threshold
        if (!periodicity.isRecurring || periodicity.type === 'none') {
            return 24 * 60 * 60 * 1000; // 1 day
        }
        
        // Handle daily tasks - consider them "due soon" if due today or tomorrow
        if (periodicity.type === 'daily') {
            return 24 * 60 * 60 * 1000; // 1 day
        }
        
        // Calculate threshold as a percentage of the periodicity
        let thresholdPercentage = 0.25; // 25% of the period by default
        let periodInMs: number;
        
        // Adjust percentage and calculate period based on periodicity type
        switch (periodicity.type) {
            case 'weekly':
                thresholdPercentage = 0.3; // 30% for weekly tasks
                periodInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
                break;
            case 'monthly':
                thresholdPercentage = 0.2; // 20% for monthly tasks
                periodInMs = 30.44 * 24 * 60 * 60 * 1000; // ~30.44 days
                break;
            case 'yearly':
                thresholdPercentage = 0.05; // 5% for yearly tasks
                periodInMs = 365.25 * 24 * 60 * 60 * 1000; // ~365.25 days
                break;
            case 'custom':
                if (periodicity.interval) {
                    periodInMs = periodicity.interval * 24 * 60 * 60 * 1000;
                    // For custom intervals, use a more generous threshold for short periods
                    if (periodicity.interval <= 2) {
                        // For 1-2 day intervals, consider them due soon if due within 1 day
                        return 24 * 60 * 60 * 1000;
                    } else if (periodicity.interval <= 7) {
                        thresholdPercentage = 0.4; // 40% for short weekly intervals
                    } else if (periodicity.interval <= 30) {
                        thresholdPercentage = 0.25; // 25% for monthly intervals
                    } else {
                        thresholdPercentage = 0.1; // 10% for longer intervals
                    }
                } else {
                    // Fallback to daily
                    periodInMs = 24 * 60 * 60 * 1000;
                    thresholdPercentage = 0.33;
                }
                break;
            default:
                periodInMs = 24 * 60 * 60 * 1000; // Default to 1 day
                thresholdPercentage = 0.25;
        }
        
        // Calculate threshold in milliseconds
        const thresholdMs = periodInMs * thresholdPercentage;
        
        // Apply minimum and maximum bounds
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
        
        // Check if the task is overdue first
        if (TaskStatusUtil.isOverdue(task)) {
            return false;
        }
        
        // For daily tasks and short periodicity, consider them "due soon" if due today
        if (task.periodicity.type === 'daily' || 
            (task.periodicity.type === 'custom' && task.periodicity.interval && task.periodicity.interval <= 2)) {
            
            // Compare dates by setting time to start of day
            const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            
            return nowDate.getTime() === dueDateOnly.getTime();
        }
        
        // For other tasks, use the threshold-based calculation
        const dueSoonThreshold = TaskStatusUtil.getDueSoonThreshold(task);
        const dueSoonDate = new Date(now.getTime() + dueSoonThreshold);
        
        return dueDate <= dueSoonDate;
    }

    /**
     * Checks if the task is overdue
     */
    static isOverdue(task: Task): boolean {
        return task.dueDate < new Date();
    }

    /**
     * Creates a comprehensive status that considers both urgency and progress
     */
    static getComprehensiveStatus(task: Task): string {
        // For archived one-shot tasks, show completion message
        if (task.status === 'archived' && (!task.periodicity.isRecurring || task.periodicity.type === 'none')) {
            return l10n.t('taskStatus.oneShotCompleted');
        }
        
        const progress = TaskStatusUtil.getTimeProgress(task);
        const timeRemaining = TaskStatusUtil.getTimeRemaining(task);
        
        // Determine status based on both urgency and progress
        if (TaskStatusUtil.isOverdue(task)) {
            if (progress >= 100) {
                return l10n.t('taskStatus.overdueComplete', timeRemaining);
            } else {
                return l10n.t('taskStatus.overdueInProgress', timeRemaining);
            }
        } else if (TaskStatusUtil.isDueSoon(task)) {
            if (progress >= 80) {
                return l10n.t('taskStatus.dueSoonNearlyComplete', timeRemaining);
            } else {
                return l10n.t('taskStatus.dueSoonNeedsAttention', timeRemaining);
            }
        } else {
            if (progress >= 100) {
                return l10n.t('taskStatus.complete', timeRemaining);
            } else {
                return l10n.t('taskStatus.onTrackGoodProgress', timeRemaining);
            }
        }
    }
} 