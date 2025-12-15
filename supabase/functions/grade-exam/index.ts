// Supabase Edge Function for server-side exam grading
// Deploy this using: supabase functions deploy grade-exam

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type GradedAnswerRow = {
    question_id: string
    answer: string | null
    is_correct: boolean
}

const getEnv = (key: string): string => {
    const deno = (globalThis as any).Deno
    return (deno?.env?.get?.(key) ?? '') as string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            status: 200,
            headers: corsHeaders
        })
    }

    try {
        // Create Supabase client with service role
        const supabaseClient = createClient(
            getEnv('SUPABASE_URL'),
            getEnv('SUPABASE_SERVICE_ROLE_KEY'),
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Parse request body
        // Kids Mode additions: child_mode, nickname, quiz_code
        const {
            exam_id,
            student_data,
            answers,
            violations,
            browser_info,
            time_taken,
            child_mode,
            nickname,
            quiz_code,
        } = await req.json()

        const isChildMode = child_mode === true || child_mode === 'true'
        const safeNickname = typeof nickname === 'string' ? nickname.trim().slice(0, 40) : null
        const safeQuizCode = typeof quiz_code === 'string' ? quiz_code.trim().toUpperCase().replace(/\s+/g, '') : null

        // Validate required fields
        if (!exam_id || !student_data || !Array.isArray(answers)) {
            console.error('Validation failed:', { exam_id, student_data, answers })
            return new Response(
                JSON.stringify({
                    error: 'Missing required fields',
                    details: {
                        has_exam_id: !!exam_id,
                        has_student_data: !!student_data,
                        has_answers: Array.isArray(answers)
                    }
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (isChildMode && !safeNickname) {
            return new Response(
                JSON.stringify({ error: 'Missing nickname for kids mode' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Fetch exam and questions (with correct answers)
        const { data: exam, error: examError } = await supabaseClient
            .from('exams')
            .select('*, questions(*)')
            .eq('id', exam_id)
            .single()

        if (examError || !exam) {
            return new Response(
                JSON.stringify({ error: 'Exam not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // If quiz_code is provided (kids flow), validate it matches the exam's quiz_code when available.
        // We only enforce when exam.quiz_code exists to avoid breaking older DB schemas.
        if (safeQuizCode && exam.quiz_code && String(exam.quiz_code).toUpperCase() !== safeQuizCode) {
            return new Response(
                JSON.stringify({ error: 'Invalid quiz code' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check time-based availability
        const now = new Date()
        const settings = exam.settings || {}

        if (settings.start_time) {
            const startTime = new Date(settings.start_time)
            if (now < startTime) {
                return new Response(
                    JSON.stringify({ error: 'Exam has not started yet' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        if (settings.end_time) {
            const endTime = new Date(settings.end_time)
            if (now > endTime) {
                return new Response(
                    JSON.stringify({ error: 'Exam has ended' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // Kids Mode: attempt limiting (server-side enforcement)
        // Only enforce when:
        // - child_mode is enabled on exam settings
        // - attempt_limit is a positive number
        // - nickname is present
        const childModeEnabled = settings.child_mode_enabled === true || settings.child_mode_enabled === 'true'
        const attemptLimitRaw = settings.attempt_limit
        const attemptLimit = typeof attemptLimitRaw === 'number'
            ? attemptLimitRaw
            : (typeof attemptLimitRaw === 'string' ? parseInt(attemptLimitRaw, 10) : null)

        if (isChildMode && childModeEnabled && safeNickname && attemptLimit && attemptLimit > 0) {
            // Prefer counting by dedicated columns if the DB has them. If not, safely fall back to student_name.
            // This is best-effort and will become strict once DB columns are added.
            const { count: cntNickname, error: cntNicknameErr } = await supabaseClient
                .from('submissions')
                .select('id', { count: 'exact', head: true })
                .eq('exam_id', exam_id)
                .eq('nickname', safeNickname)

            const nicknameCount = !cntNicknameErr && typeof cntNickname === 'number' ? cntNickname : null

            let attemptsSoFar: number | null = nicknameCount
            if (attemptsSoFar === null) {
                const { count: cntName, error: cntNameErr } = await supabaseClient
                    .from('submissions')
                    .select('id', { count: 'exact', head: true })
                    .eq('exam_id', exam_id)
                    .eq('student_name', safeNickname)

                attemptsSoFar = !cntNameErr && typeof cntName === 'number' ? cntName : 0
            }

            if ((attemptsSoFar ?? 0) >= attemptLimit) {
                return new Response(
                    JSON.stringify({
                        error: 'Attempt limit reached',
                        code: 'ATTEMPT_LIMIT',
                        attempt_limit: attemptLimit,
                        attempts: attemptsSoFar ?? 0
                    }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // Grade the exam
        let totalScore = 0
        let maxScore = 0
        const gradedAnswers: GradedAnswerRow[] = []

        for (const question of exam.questions) {
            // Skip short answer questions (manual grading required)
            if (question.type === 'short_answer') {
                continue
            }

            maxScore += question.points || 0

            // Find student's answer
            const studentAnswer = answers.find((a: any) => a.question_id === question.id)
            if (!studentAnswer) {
                gradedAnswers.push({
                    question_id: String(question.id),
                    answer: null,
                    is_correct: false
                })
                continue
            }

            let isCorrect = false

            // Handle kids question types with special grading
            if (question.type === 'kids_picture_pairing') {
                // Picture pairing: pairs is an array [leftIdx, rightIdx, leftIdx, rightIdx, ...]
                // Correct pairing is when left[i] pairs with right[i]
                const studentPairs = Array.isArray(studentAnswer.answer) ? studentAnswer.answer : []
                let correctPairs = 0
                let totalPairs = 0
                
                // Process pairs in groups of 2
                for (let i = 0; i < studentPairs.length; i += 2) {
                    if (i + 1 < studentPairs.length) {
                        totalPairs++
                        const leftIdx = studentPairs[i]
                        const rightIdx = studentPairs[i + 1]
                        // Correct if left index equals right index (positional matching)
                        if (leftIdx === rightIdx) {
                            correctPairs++
                        }
                    }
                }
                
                // Award partial credit: each correct pair gets proportional points
                if (totalPairs > 0) {
                    const pointsPerPair = (question.points || 0) / totalPairs
                    totalScore += correctPairs * pointsPerPair
                    isCorrect = correctPairs === totalPairs
                } else {
                    isCorrect = false
                }
            } else if (question.type === 'kids_story_sequence') {
                // Story sequence: answer is array of indices in the order student arranged them
                // Correct answer should be [0, 1, 2] (the original/intended order)
                const studentOrder = Array.isArray(studentAnswer.answer) ? studentAnswer.answer : []
                
                // Parse correct_answer: it might be stored as JSON string or array
                let correctOrder: number[] = [0, 1, 2]
                if (question.correct_answer) {
                    if (Array.isArray(question.correct_answer)) {
                        correctOrder = question.correct_answer.map(x => typeof x === 'number' ? x : parseInt(String(x), 10))
                    } else if (typeof question.correct_answer === 'string') {
                        try {
                            const parsed = JSON.parse(question.correct_answer)
                            correctOrder = Array.isArray(parsed) ? parsed.map(x => typeof x === 'number' ? x : parseInt(String(x), 10)) : [0, 1, 2]
                        } catch (e) {
                            correctOrder = [0, 1, 2]
                        }
                    }
                }
                
                // Convert student order to numbers for comparison
                const studentOrderNums = studentOrder.map(x => typeof x === 'number' ? x : parseInt(String(x), 10))
                
                isCorrect = studentOrderNums.length === correctOrder.length &&
                    studentOrderNums.every((val: number, idx: number) => val === correctOrder[idx])
            } else if (question.type === 'kids_color_picker') {
                // Color picker: compare hex colors (normalize for comparison)
                const normalizeColor = (color: any) => {
                    const str = String(color).trim().toLowerCase();
                    // Ensure color is in #RRGGBB format
                    if (str.startsWith('#') && (str.length === 7 || str.length === 4)) {
                        return str;
                    }
                    return str;
                };
                const correctAnswer = question.correct_answer ? normalizeColor(question.correct_answer) : '';
                const studentAnswerColor = normalizeColor(studentAnswer.answer);
                isCorrect = correctAnswer === studentAnswerColor && correctAnswer !== '';
            } else if (question.type === 'kids_odd_one_out') {
                // Odd one out: compare indices
                const correctIdx = String(question.correct_answer || '').trim();
                const studentIdx = String(studentAnswer.answer || '').trim();
                isCorrect = correctIdx === studentIdx && correctIdx !== ''
            } else if (Array.isArray(question.correct_answer)) {
                // Handle multiple select (array answers)
                let studentArr: string[] = []

                if (Array.isArray(studentAnswer.answer)) {
                    studentArr = studentAnswer.answer
                } else if (typeof studentAnswer.answer === 'string') {
                    try {
                        studentArr = JSON.parse(studentAnswer.answer)
                    } catch {
                        studentArr = studentAnswer.answer.split('||').filter(Boolean)
                    }
                }

                const correctSorted = question.correct_answer.map((s: string) => String(s).trim().toLowerCase()).sort()
                const studentSorted = studentArr.map((s: string) => String(s).trim().toLowerCase()).sort()

                isCorrect = correctSorted.length === studentSorted.length &&
                    correctSorted.every((val: string, idx: number) => val === studentSorted[idx])
            } else {
                // Handle single answer questions
                // Normalize Unicode strings to handle Arabic and other languages properly
                const normalizeString = (str: any) => {
                    return String(str)
                        .trim()
                        .normalize('NFC') // Normalize Unicode
                        .toLowerCase()
                        .replace(/\s+/g, ' '); // Normalize whitespace
                };

                const correctAnswer = normalizeString(question.correct_answer);
                const studentAnswerStr = normalizeString(studentAnswer.answer);

                isCorrect = correctAnswer === studentAnswerStr
            }

            if (isCorrect) {
                totalScore += question.points || 0
            }

            gradedAnswers.push({
                question_id: String(question.id),
                answer: typeof studentAnswer.answer === 'object'
                    ? JSON.stringify(studentAnswer.answer)
                    : String(studentAnswer.answer ?? ''),
                is_correct: isCorrect
            })
        }

        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

        // Prepare student info
        const studentName = student_data.name || student_data.student_id || (safeNickname ?? 'Anonymous')
        const studentEmail = student_data.email || `${student_data.student_id || safeNickname || 'student'}@example.com`

        // Insert submission
        const { data: submission, error: submissionError } = await supabaseClient
            .from('submissions')
            .insert({
                exam_id,
                student_name: studentName,
                student_email: studentEmail,
                score: totalScore,
                max_score: maxScore,
                percentage,
                violations: violations || [],
                browser_info: browser_info || {},
                student_data: student_data || {},
                time_taken: typeof time_taken === 'number' ? time_taken : null,
                // Kids Mode (optional columns)
                child_mode: isChildMode ? true : false,
                nickname: isChildMode ? safeNickname : null,
                quiz_code: safeQuizCode
            })
            .select()
            .single()

        if (submissionError) {
            console.error('Submission error:', submissionError)
            return new Response(
                JSON.stringify({ error: 'Failed to save submission', details: submissionError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Insert graded answers
        const answersToInsert = gradedAnswers.map((a) => ({
            ...a,
            submission_id: submission.id
        }))

        const { error: answersError } = await supabaseClient
            .from('submission_answers')
            .insert(answersToInsert)

        if (answersError) {
            console.error('Answers error:', answersError)
            // Don't fail the whole submission if answers fail
        }

        // Update question analytics for each graded answer
        for (const gradedAnswer of gradedAnswers) {
            try {
                await supabaseClient.rpc('update_question_analytics', {
                    p_exam_id: exam_id,
                    p_question_id: gradedAnswer.question_id,
                    p_is_correct: gradedAnswer.is_correct,
                    p_time_seconds: null // Time tracking not implemented yet
                })
            } catch (analyticsError) {
                console.error('Analytics error for question:', gradedAnswer.question_id, analyticsError)
                // Don't fail submission if analytics fails
            }
        }

        // Return grading results
        // Note: JSONB can store booleans as strings, so check for both true and "true"
        const shouldShowDetailedResults = settings.show_detailed_results === true ||
            settings.show_detailed_results === 'true';

        return new Response(
            JSON.stringify({
                success: true,
                submission_id: submission.id,
                score: totalScore,
                max_score: maxScore,
                percentage: percentage,
                violations_count: (violations || []).length,
                detailed_results: shouldShowDetailedResults ? gradedAnswers.map((a: any) => {
                    const q = exam.questions.find((q: any) => q.id === a.question_id);
                    return {
                        ...a,
                        correct_answer: q?.correct_answer
                    };
                }) : undefined,
                // Debug info
                debug_info: {
                    answers_count: answers.length,
                    first_graded: gradedAnswers.length > 0 ? gradedAnswers[0] : null,
                    first_question_id: gradedAnswers.length > 0 ? gradedAnswers[0].question_id : null,
                    expected_answer_for_first: gradedAnswers.length > 0 ?
                        exam.questions.find((q: any) => q.id === gradedAnswers[0].question_id)?.correct_answer : null
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({ error: error?.message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
