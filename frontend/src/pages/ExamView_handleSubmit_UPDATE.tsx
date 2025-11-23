/**
 * Updated handleSubmit function for ExamView.tsx
 * This version uses the Supabase Edge Function for server-side grading
 * 
 * INSTRUCTIONS:
 * Replace the existing handleSubmit function in ExamView.tsx (around line 410)
 * with this updated version
 */

const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (!exam || isSubmittingRef.current || submitted) return;

    // Prevent submission if outside allowed window
    const settings = exam.settings || {};
    const startStr = settings.start_time || settings.start_date;
    const endStr = settings.end_time || settings.end_date;
    const now = new Date();

    if (startStr) {
        const startD = new Date(startStr);
        if (!isNaN(startD.getTime()) && now < startD) {
            toast.error(`Exam is not open yet. Starts at ${startD.toLocaleString()}`);
            return;
        }
    }

    if (endStr) {
        const endD = new Date(endStr);
        if (!isNaN(endD.getTime()) && now > endD) {
            toast.error('Exam has already ended');
            return;
        }
    }

    // Double check local storage to prevent race conditions
    if (localStorage.getItem(`durrah_exam_${id}_submitted`)) {
        toast.error('Exam already submitted from this device.');
        setSubmitted(true);
        return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
        // Prepare student info
        const studentName = studentData.name || studentData.student_id || 'Anonymous';
        const studentEmail = studentData.email || `${studentData.student_id || 'student'}@example.com`;

        const browserInfo = {
            user_agent: navigator.userAgent,
            student_data: studentData,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            language: navigator.language
        };

        // Prepare answers for submission
        const answersPayload = Object.entries(answers).map(([question_id, answer]) => ({
            question_id,
            answer: Array.isArray(answer) ? answer : answer
        }));

        // Get Supabase credentials from environment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase configuration missing');
        }

        // Call the Edge Function for server-side grading
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/grade-exam`;

        console.log('Submitting to Edge Function:', edgeFunctionUrl);

        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({
                exam_id: id,
                student_data: {
                    name: studentName,
                    email: studentEmail,
                    ...studentData
                },
                answers: answersPayload,
                violations: violations,
                browser_info: browserInfo
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            // Set the score from server response
            setScore({
                score: result.score,
                max_score: result.max_score,
                percentage: result.percentage
            });

            setSubmitted(true);

            // Mark as submitted in local storage
            localStorage.setItem(`durrah_exam_${id}_submitted`, 'true');
            localStorage.setItem(`durrah_exam_${id}_score`, JSON.stringify({
                score: result.score,
                max_score: result.max_score,
                percentage: result.percentage
            }));

            // Clear temporary state
            localStorage.removeItem(`durrah_exam_${id}_state`);

            // Exit fullscreen if active
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }

            toast.success('Exam submitted successfully!', {
                duration: 5000,
                icon: '✅'
            });
        } else {
            throw new Error(result.error || 'Submission failed');
        }

    } catch (err: any) {
        console.error('Submission error:', err);

        // Show user-friendly error message
        const errorMessage = err.message || 'Failed to submit exam';
        toast.error(`Submission failed: ${errorMessage}`, {
            duration: 7000,
            icon: '❌'
        });

        // Save to pending submissions for retry
        try {
            const pendingRaw = localStorage.getItem('durrah_pending_submissions');
            const pending = pendingRaw ? JSON.parse(pendingRaw) : [];

            const studentName = studentData.name || studentData.student_id || 'Anonymous';
            const studentEmail = studentData.email || `${studentData.student_id || 'student'}@example.com`;

            const submissionPayload = {
                exam_id: id,
                student_data: {
                    name: studentName,
                    email: studentEmail,
                    ...studentData
                },
                answers: Object.entries(answers).map(([question_id, answer]) => ({
                    question_id,
                    answer
                })),
                violations,
                browser_info: {
                    user_agent: navigator.userAgent,
                    student_data: studentData
                },
                created_at: new Date().toISOString()
            };

            pending.push(submissionPayload);
            localStorage.setItem('durrah_pending_submissions', JSON.stringify(pending));

            toast('Submission saved locally and will be retried automatically.', {
                duration: 5000,
                icon: '💾'
            });
        } catch (e) {
            console.error('Failed to save pending submission:', e);
        }
    } finally {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
    }
};
