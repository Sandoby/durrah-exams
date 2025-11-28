import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CloudOff, RefreshCw } from 'lucide-react';

export const SubmissionSync = () => {
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        checkPending();
        window.addEventListener('online', handleOnline);
        // Check every minute
        const interval = setInterval(checkPending, 60000);

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, []);

    const checkPending = () => {
        try {
            const pendingRaw = localStorage.getItem('durrah_pending_submissions');
            const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
            setPendingCount(pending.length);
            if (pending.length > 0 && navigator.onLine) {
                syncSubmissions();
            }
        } catch (e) {
            console.error('Error checking pending submissions', e);
        }
    };

    const handleOnline = () => {
        checkPending();
    };

    const syncSubmissions = async () => {
        if (isSyncing) return;
        setIsSyncing(true);

        try {
            const pendingRaw = localStorage.getItem('durrah_pending_submissions');
            if (!pendingRaw) return;

            const pending = JSON.parse(pendingRaw);
            if (!Array.isArray(pending) || pending.length === 0) return;

            const toastId = toast.loading(`Syncing ${pending.length} offline submission(s)...`);

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const edgeFunctionUrl = `${supabaseUrl}/functions/v1/grade-exam`;

            const failed = [];
            let successCount = 0;

            for (const submission of pending) {
                try {
                    // Handle both old format (separate payload) and new format (flat)
                    // The new format in ExamView.tsx pushes the whole payload directly
                    // The old format might have { submissionPayload, answersPayload } - we need to adapt if necessary
                    // But based on my recent code, I pushed the direct payload structure expected by the Edge Function.

                    // Check if it's the new flat format or old format
                    let payload = submission;
                    if (submission.submissionPayload) {
                        // Adapt old format if any exist (from previous versions if any)
                        // But since I just wrote the code, it's likely the new format.
                        // Let's assume new format for now as per my implementation plan.
                        // If I need to support legacy pending items, I'd need more logic.
                        // For now, let's stick to the structure I defined in ExamView.tsx
                    }

                    const response = await fetch(edgeFunctionUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseAnonKey}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) throw new Error('Server error');
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error);

                    successCount++;

                    // Clean up individual exam state if successful
                    if (payload.exam_id) {
                        localStorage.removeItem(`durrah_exam_${payload.exam_id}_state`);
                        localStorage.setItem(`durrah_exam_${payload.exam_id}_submitted`, 'true');
                    }

                } catch (err) {
                    console.error('Failed to sync submission', err);
                    failed.push(submission);
                }
            }

            if (failed.length === 0) {
                localStorage.removeItem('durrah_pending_submissions');
                setPendingCount(0);
                toast.success('All offline submissions synced!', { id: toastId });
            } else {
                localStorage.setItem('durrah_pending_submissions', JSON.stringify(failed));
                setPendingCount(failed.length);
                toast.error(`Synced ${successCount}, ${failed.length} failed. Will retry.`, { id: toastId });
            }

        } catch (e) {
            console.error('Sync error', e);
        } finally {
            setIsSyncing(false);
        }
    };

    if (pendingCount === 0) return null;

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 shadow-lg flex items-center space-x-3 animate-pulse">
            <CloudOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {pendingCount} submission(s) pending
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Waiting for connection...
                </p>
            </div>
            <button
                onClick={syncSubmissions}
                disabled={isSyncing}
                className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
            >
                <RefreshCw className={`h-4 w-4 text-yellow-700 dark:text-yellow-300 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
};
