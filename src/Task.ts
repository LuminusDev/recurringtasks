/**
 * Represents different types of task recurrence patterns
 */
export type RecurrenceType = 
    | 'none'          // One-shot task (no recurrence)
    | 'daily'         // Daily recurrence
    | 'weekly'        // Weekly recurrence  
    | 'monthly'       // Monthly recurrence
    | 'yearly'        // Yearly recurrence
    | 'custom';       // Custom interval

/**
 * Represents the periodicity/recurrence of a task
 */
export interface Periodicity {
    /** The type of recurrence */
    type: RecurrenceType;
    /** The interval value (only used for custom and some built-in types) */
    interval?: number;
    /** Human-readable description of the periodicity */
    description: string;
    /** Whether this task recurs */
    isRecurring: boolean;
}

/**
 * Represents a comment/validation for a task
 */
export interface Comment {
    /** Unique identifier for the comment */
    id: string;
    /** The text content of the comment */
    text: string;
    /** The date when the comment was added */
    date: Date;
    /** Whether this comment is associated with a task validation */
    isValidation: boolean;
}

/**
 * Represents a recurring task
 */
export interface Task {
    /** Unique identifier for the task */
    id: string;
    /** The title/name of the task */
    title: string;
    /** Detailed description of the task */
    description?: string;
    /** The periodicity/recurrence pattern of the task */
    periodicity: Periodicity;
    /** The date when the task was first created */
    creationDate: Date;
    /** The date when the next occurrence of the task is due */
    dueDate: Date;
    /** History of comments/validations for this task */
    comments: Comment[];
    /** The status of the task */
    status: 'active' | 'archived';
}

/**
 * Utility class for creating and managing periodicity configurations
 */
export class PeriodicityHelper {
    /**
     * Creates a one-shot (non-recurring) periodicity
     */
    static createOneShot(): Periodicity {
        return {
            type: 'none',
            description: 'One-shot task',
            isRecurring: false
        };
    }

    /**
     * Creates a daily periodicity
     */
    static createDaily(days: number = 1): Periodicity {
        if (days === 1) {
            return {
                type: 'daily',
                description: 'Daily',
                isRecurring: true
            };
        } else {
            return {
                type: 'custom',
                interval: days,
                description: `Every ${days} days`,
                isRecurring: true
            };
        }
    }

    /**
     * Creates a weekly periodicity
     */
    static createWeekly(weeks: number = 1): Periodicity {
        if (weeks === 1) {
            return {
                type: 'weekly',
                description: 'Weekly',
                isRecurring: true
            };
        } else {
            return {
                type: 'custom',
                interval: weeks * 7,
                description: `Every ${weeks} weeks`,
                isRecurring: true
            };
        }
    }

    /**
     * Creates a monthly periodicity
     */
    static createMonthly(months: number = 1): Periodicity {
        if (months === 1) {
            return {
                type: 'monthly',
                description: 'Monthly',
                isRecurring: true
            };
        } else {
            return {
                type: 'custom',
                interval: months * 30, // Approximate for custom intervals
                description: `Every ${months} months`,
                isRecurring: true
            };
        }
    }

    /**
     * Creates a yearly periodicity
     */
    static createYearly(years: number = 1): Periodicity {
        if (years === 1) {
            return {
                type: 'yearly',
                description: 'Yearly',
                isRecurring: true
            };
        } else {
            return {
                type: 'custom',
                interval: years * 365, // Approximate for custom intervals
                description: `Every ${years} years`,
                isRecurring: true
            };
        }
    }

    /**
     * Creates a custom periodicity with specific day interval
     */
    static createCustom(days: number, description?: string): Periodicity {
        return {
            type: 'custom',
            interval: days,
            description: description || `Every ${days} days`,
            isRecurring: true
        };
    }

    /**
     * Calculates the next due date based on the new periodicity system
     */
    static calculateNextDueDate(currentDueDate: Date, periodicity: Periodicity): Date {
        // For non-recurring tasks, return the current due date
        if (!periodicity.isRecurring || periodicity.type === 'none') {
            return new Date(currentDueDate);
        }

        const nextDate = new Date();

        switch (periodicity.type) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            case 'custom':
                if (periodicity.interval) {
                    nextDate.setDate(nextDate.getDate() + periodicity.interval);
                } else {
                    // Fallback to daily if no interval specified
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                break;
        }

        return nextDate;
    }

    /**
     * Gets available periodicity options for UI
     */
    static getPeriodicityOptions(): Array<{value: string, label: string, description: string}> {
        return [
            { value: 'none', label: 'One-shot', description: 'Complete once, no recurrence' },
            { value: 'daily', label: 'Daily', description: 'Repeat every day' },
            { value: 'weekly', label: 'Weekly', description: 'Repeat every week' },
            { value: 'monthly', label: 'Monthly', description: 'Repeat every month' },
            { value: 'yearly', label: 'Yearly', description: 'Repeat every year' },
            { value: 'custom', label: 'Custom', description: 'Custom interval in days' }
        ];
    }
} 