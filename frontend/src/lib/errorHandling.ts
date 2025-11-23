/**
 * Error Handling Utilities
 * Centralized error handling for the Durrah Exams platform
 */

import toast from 'react-hot-toast';

export class AppError extends Error {
    code: string;
    statusCode: number;
    details?: any;

    constructor(
        message: string,
        code: string,
        statusCode: number = 500,
        details?: any
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export class NetworkError extends AppError {
    constructor(message: string = 'Network error occurred', details?: any) {
        super(message, 'NETWORK_ERROR', 503, details);
        this.name = 'NetworkError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 'AUTH_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}

export class SubmissionError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 'SUBMISSION_ERROR', 500, details);
        this.name = 'SubmissionError';
    }
}

/**
 * Handle errors with user-friendly messages
 */
export function handleError(error: unknown, context?: string): void {
    console.error(`Error in ${context || 'application'}:`, error);

    if (error instanceof AppError) {
        toast.error(error.message, {
            duration: 5000,
            icon: '❌',
        });
        return;
    }

    if (error instanceof Error) {
        if (error.message.includes('fetch')) {
            toast.error('Network error. Please check your connection.', {
                duration: 5000,
                icon: '🌐',
            });
            return;
        }

        if (error.message.includes('timeout')) {
            toast.error('Request timed out. Please try again.', {
                duration: 5000,
                icon: '⏱️',
            });
            return;
        }

        toast.error(error.message, {
            duration: 4000,
            icon: '⚠️',
        });
        return;
    }

    toast.error('An unexpected error occurred. Please try again.', {
        duration: 4000,
        icon: '❌',
    });
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('Retry failed');
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    timeout: number = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(input, {
            ...init,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new NetworkError('Request timed out');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Parse API error response
 */
export async function parseApiError(response: Response): Promise<AppError> {
    try {
        const data = await response.json();
        return new AppError(
            data.error || data.message || 'API request failed',
            data.code || 'API_ERROR',
            response.status,
            data
        );
    } catch {
        return new AppError(
            `Request failed with status ${response.status}`,
            'API_ERROR',
            response.status
        );
    }
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[]
): void {
    const missing = requiredFields.filter(field => !data[field]);

    if (missing.length > 0) {
        throw new ValidationError(
            `Missing required fields: ${missing.join(', ')}`,
            { missing }
        );
    }
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof NetworkError) return true;
    if (error instanceof Error) {
        return (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.name === 'AbortError'
        );
    }
    return false;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): Record<string, any> {
    if (error instanceof AppError) {
        return {
            name: error.name,
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            details: error.details,
            stack: error.stack,
        };
    }

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }

    return {
        error: String(error),
    };
}

/**
 * Create a user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
    if (error instanceof ValidationError) {
        return error.message;
    }

    if (error instanceof AuthenticationError) {
        return 'Please log in to continue.';
    }

    if (error instanceof NetworkError) {
        return 'Unable to connect. Please check your internet connection.';
    }

    if (error instanceof SubmissionError) {
        return 'Failed to submit. Your answers have been saved locally and will be retried.';
    }

    if (error instanceof AppError) {
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error to monitoring service (placeholder)
 */
export function logErrorToService(error: unknown, context?: string): void {
    const errorData = formatErrorForLogging(error);

    console.error('Error logged:', {
        context,
        timestamp: new Date().toISOString(),
        ...errorData,
    });
}
