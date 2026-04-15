type AuthErrorKind =
    | 'rate_limit'
    | 'invalid_credentials'
    | 'email_unverified'
    | 'email_in_use'
    | 'weak_password'
    | 'unknown';

const normalize = (value: unknown) => String(value || '').toLowerCase();

export const getAuthErrorKind = (error: any): AuthErrorKind => {
    const status = error?.status;
    const code = normalize(error?.code);
    const message = normalize(error?.message || error?.error_description);

    if (
        status === 429 ||
        code.includes('rate_limit') ||
        message.includes('too many requests') ||
        message.includes('rate limit') ||
        message.includes('request rate limit reached')
    ) {
        return 'rate_limit';
    }

    if (
        message.includes('invalid login credentials') ||
        message.includes('invalid email or password') ||
        message.includes('invalid credentials')
    ) {
        return 'invalid_credentials';
    }

    if (message.includes('email not confirmed') || message.includes('email not verified')) {
        return 'email_unverified';
    }

    if (message.includes('user already registered') || message.includes('already registered')) {
        return 'email_in_use';
    }

    if (message.includes('password should be at least') || message.includes('weak password')) {
        return 'weak_password';
    }

    return 'unknown';
};
