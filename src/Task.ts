/**
 * Represents the periodicity of a recurring task
 */
export interface Periodicity {
    /** The numeric value of the period */
    value: number;
    /** The unit of time for the period */
    unit: 'days' | 'weeks' | 'months' | 'years';
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
    description: string;
    /** The periodicity/recurrence pattern of the task */
    periodicity: Periodicity;
    /** The date when the task was first created */
    startDate: Date;
    /** The date when the next occurrence of the task is due */
    dueDate: Date;
    /** History of comments/validations for this task */
    comments: Comment[];
    /** The status of the task */
    status: 'active' | 'archived';
} 