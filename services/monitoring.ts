import { supabase } from './supabase';

export const logErrorToSupabase = async (error: Error, info?: any) => {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        await supabase.from('error_logs').insert({
            user_id: session?.user?.id || null,
            error_message: error.message || 'Unknown Error',
            stack_trace: error.stack || JSON.stringify(info) || null,
            metadata: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                ...info
            }
        });
    } catch (loggingError) {
        console.error('Failed to log error to Supabase:', loggingError);
    }
};

export const initMonitoring = () => {
    // Global Uncaught Exception Handler
    window.addEventListener('error', (event) => {
        logErrorToSupabase(event.error);
    });

    // Global Unhandled Promise Rejection Handler
    window.addEventListener('unhandledrejection', (event) => {
        logErrorToSupabase(new Error(`Unhandled Promise Rejection: ${event.reason}`));
    });

};
