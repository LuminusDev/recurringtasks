import * as vscode from 'vscode';
import { Task } from './Task';

/**
 * Interface for JIRA configuration
 */
export interface JiraConfig {
    baseUrl: string;
    email: string;
    apiToken: string;
    defaultProjectKey: string;
    defaultIssueType: string;
}

/**
 * Interface for JIRA issue creation response
 */
export interface JiraIssueResponse {
    id: string;
    key: string;
    self: string;
}

/**
 * Interface for JIRA user response
 */
interface JiraUserResponse {
    displayName: string;
    emailAddress: string;
    accountId?: string;
}

/**
 * Interface for JIRA project response
 */
interface JiraProjectResponse {
    values: Array<{
        key: string;
        name: string;
    }>;
    startAt: number;
    maxResults: number;
    total: number;
    isLast: boolean;
}

/**
 * Interface for JIRA project details response
 */
interface JiraProjectDetailsResponse {
    issueTypes: Array<{
        name: string;
        description?: string;
    }>;
}

/**
 * Interface for JIRA error response
 */
interface JiraErrorResponse {
    message?: string;
    errorMessages?: string[];
}

/**
 * Service for interacting with JIRA API
 */
export class JiraService {
    private config: JiraConfig | null = null;

    /**
     * Initializes the JIRA service with configuration from VS Code settings
     */
    public async initialize(): Promise<boolean> {
        try {
            const configuration = vscode.workspace.getConfiguration('recurringTasks.jira');
            
            const baseUrl = configuration.get<string>('baseUrl');
            const email = configuration.get<string>('email');
            const apiToken = configuration.get<string>('apiToken');
            const defaultProjectKey = configuration.get<string>('defaultProjectKey');
            const defaultIssueType = configuration.get<string>('defaultIssueType');

            if (!baseUrl || !email || !apiToken || !defaultProjectKey || !defaultIssueType) {
                return false;
            }

            this.config = {
                baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
                email,
                apiToken,
                defaultProjectKey,
                defaultIssueType
            };

            return true;
        } catch (error) {
            console.error('Failed to initialize JIRA service:', error);
            return false;
        }
    }

    /**
     * Checks if JIRA is properly configured
     */
    public isConfigured(): boolean {
        return this.config !== null;
    }

    /**
     * Gets the current JIRA configuration
     */
    public getConfig(): JiraConfig | null {
        return this.config;
    }

    /**
     * Tests the JIRA connection
     */
    public async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.config) {
            return { success: false, message: 'JIRA is not configured' };
        }

        try {
            const response = await this.makeJiraRequest('/rest/api/3/myself', 'GET');
            
            if (response.ok) {
                const user = await response.json() as JiraUserResponse;
                return { 
                    success: true, 
                    message: `Connected successfully as ${user.displayName} (${user.emailAddress})` 
                };
            } else {
                return { 
                    success: false, 
                    message: `Connection failed: ${response.status} ${response.statusText}` 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    }

    /**
     * Gets the current user's account ID for assignment
     */
    public async getCurrentUserAccountId(): Promise<string | null> {
        if (!this.config) {
            return null;
        }

        try {
            const response = await this.makeJiraRequest('/rest/api/3/myself', 'GET');
            
            if (response.ok) {
                const user = await response.json() as JiraUserResponse;
                return user.accountId || null;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Failed to get current user account ID:', error);
            return null;
        }
    }

    /**
     * Creates a JIRA issue from a task
     */
    public async createIssueFromTask(
        task: Task, 
        projectKey?: string, 
        issueType?: string,
        additionalFields?: Record<string, any>
    ): Promise<{ success: boolean; issueKey?: string; message: string; url?: string }> {
        if (!this.config) {
            return { success: false, message: 'JIRA is not configured' };
        }

        try {
            const finalProjectKey = projectKey || this.config.defaultProjectKey;
            const finalIssueType = issueType || this.config.defaultIssueType;

            // Check if auto-assign is enabled
            const autoAssignToMe = vscode.workspace.getConfiguration('recurringTasks.jira').get<boolean>('autoAssignToMe', true);
            let assigneeField = {};
            
            if (autoAssignToMe) {
                const accountId = await this.getCurrentUserAccountId();
                if (accountId) {
                    assigneeField = {
                        assignee: {
                            accountId: accountId
                        }
                    };
                }
            }

            // Prepare the issue data
            const issueData = {
                fields: {
                    project: {
                        key: finalProjectKey
                    },
                    summary: task.title,
                    description: {
                        type: 'doc',
                        version: 1,
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: task.description
                                    }
                                ]
                            },
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: `\n\nRecurring Task Details:`
                                    }
                                ]
                            },
                            {
                                type: 'bulletList',
                                content: [
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: `Periodicity: Every ${task.periodicity.value} ${task.periodicity.unit}`
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: `Due Date: ${task.dueDate.toLocaleDateString()}`
                                                    }
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        type: 'listItem',
                                        content: [
                                            {
                                                type: 'paragraph',
                                                content: [
                                                    {
                                                        type: 'text',
                                                        text: `Start Date: ${task.startDate.toLocaleDateString()}`
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    issuetype: {
                        name: finalIssueType
                    },
                    ...assigneeField,
                    ...additionalFields
                }
            };

            const response = await this.makeJiraRequest('/rest/api/3/issue', 'POST', issueData);

            if (response.ok) {
                const result = await response.json() as JiraIssueResponse;
                const issueUrl = `${this.config.baseUrl}/browse/${result.key}`;
                
                const assignMessage = autoAssignToMe ? ' and assigned to you' : '';
                return {
                    success: true,
                    issueKey: result.key,
                    message: `JIRA issue ${result.key} created successfully${assignMessage}`,
                    url: issueUrl
                };
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' })) as JiraErrorResponse;
                return {
                    success: false,
                    message: `Failed to create JIRA issue: ${errorData.message || response.statusText}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Error creating JIRA issue: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Gets available projects from JIRA
     */
    public async getProjects(): Promise<{ success: boolean; projects?: Array<{key: string; name: string}>; message: string }> {
        if (!this.config) {
            return { success: false, message: 'JIRA is not configured' };
        }

        try {
            const allProjects: Array<{key: string; name: string}> = [];
            let startAt = 0;
            const maxResults = 50; // JIRA default page size
            const maxProjectsToFetch = vscode.workspace.getConfiguration('recurringTasks.jira').get<number>('maxProjectsToFetch', 1000);
            let isLast = false;

            // Fetch all pages of projects
            while (!isLast && allProjects.length < maxProjectsToFetch) {
                const response = await this.makeJiraRequest(`/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}`, 'GET');
                
                if (response.ok) {
                    const data = await response.json() as JiraProjectResponse;
                    
                    // Add projects from this page (respecting the max limit)
                    const projects = data.values.map((project) => ({
                        key: project.key,
                        name: project.name
                    }));
                    
                    const remainingSlots = maxProjectsToFetch - allProjects.length;
                    const projectsToAdd = projects.slice(0, remainingSlots);
                    allProjects.push(...projectsToAdd);
                    
                    // Update pagination info
                    startAt = data.startAt + data.maxResults;
                    isLast = data.isLast || allProjects.length >= maxProjectsToFetch;
                } else {
                    return { success: false, message: `Failed to get projects: ${response.statusText}` };
                }
            }
            
            const limitMessage = allProjects.length >= maxProjectsToFetch ? ` (limited to ${maxProjectsToFetch})` : '';
            return { 
                success: true, 
                projects: allProjects, 
                message: `${allProjects.length} projects retrieved successfully${limitMessage}` 
            };
        } catch (error) {
            return { 
                success: false, 
                message: `Error getting projects: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    }

    /**
     * Gets available issue types for a project
     */
    public async getIssueTypes(projectKey: string): Promise<{ success: boolean; issueTypes?: Array<{name: string; description: string}>; message: string }> {
        if (!this.config) {
            return { success: false, message: 'JIRA is not configured' };
        }

        try {
            const response = await this.makeJiraRequest(`/rest/api/3/project/${projectKey}`, 'GET');
            
            if (response.ok) {
                const data = await response.json() as JiraProjectDetailsResponse;
                const issueTypes = data.issueTypes.map((type) => ({
                    name: type.name,
                    description: type.description || type.name
                }));
                
                return { success: true, issueTypes, message: 'Issue types retrieved successfully' };
            } else {
                return { success: false, message: `Failed to get issue types: ${response.statusText}` };
            }
        } catch (error) {
            return { 
                success: false, 
                message: `Error getting issue types: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    }

    /**
     * Makes an authenticated request to JIRA API
     */
    private async makeJiraRequest(endpoint: string, method: string, body?: any): Promise<Response> {
        if (!this.config) {
            throw new Error('JIRA is not configured');
        }

        const url = `${this.config.baseUrl}${endpoint}`;
        const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');

        const options: RequestInit = {
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }

        return fetch(url, options);
    }
} 