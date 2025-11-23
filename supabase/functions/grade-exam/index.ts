--Supabase Edge Function for server - side exam grading
--Deploy this using: supabase functions deploy grade - exam

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with service role
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Parse request body
        const { exam_id, student_data, answers, violations, browser_info } = await req.json()

        // Validate required fields
        if (!exam_id || !student_data || !answers) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
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

        // Grade the exam
        let totalScore = 0
        let maxScore = 0
        const gradedAnswers = []

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
                    question_id: question.id,
                    answer: null,
                    is_correct: false
                })
                continue
            }

            let isCorrect = false

            // Handle multiple select (array answers)
            if (Array.isArray(question.correct_answer)) {
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
                const correctAnswer = String(question.correct_answer).trim().toLowerCase()
                const studentAnswerStr = String(studentAnswer.answer).trim().toLowerCase()

                if (question.type === 'numeric') {
                    try {
                        const correctNum = parseFloat(question.correct_answer)
                        const studentNum = parseFloat(studentAnswer.answer)
                        isCorrect = !isNaN(correctNum) && !isNaN(studentNum) && correctNum === studentNum
                    } catch {
                        isCorrect = correctAnswer === studentAnswerStr
                    }
                } else {
                    isCorrect = correctAnswer === studentAnswerStr
                }
            }

            if (isCorrect) {
                totalScore += question.points || 0
            }

            gradedAnswers.push({
                question_id: question.id,
                answer: typeof studentAnswer.answer === 'object'
                    ? JSON.stringify(studentAnswer.answer)
                    : studentAnswer.answer,
                is_correct: isCorrect
            })
        }

        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

        // Prepare student info
        const studentName = student_data.name || student_data.student_id || 'Anonymous'
        const studentEmail = student_data.email || `${student_data.student_id || 'student'}@example.com`

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
                browser_info: browser_info || {}
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
        const answersToInsert = gradedAnswers.map(a => ({
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

        // Return grading results
        return new Response(
            JSON.stringify({
                success: true,
                submission_id: submission.id,
                score: totalScore,
                max_score: maxScore,
                percentage: percentage,
                violations_count: (violations || []).length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
