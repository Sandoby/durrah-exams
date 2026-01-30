export interface Question {
    id?: string;
    clientId?: string;
    type: string;
    question_text: string;
    options: string[];
    correct_answer?: string | string[];
    points: number;
    randomize_options: boolean;
    media_url?: string | null;
    media_type?: string | null;
}

export interface ExamSettings {
    require_fullscreen: boolean;
    detect_tab_switch: boolean;
    disable_copy_paste: boolean;
    disable_right_click: boolean;
    max_violations: number;
    randomize_questions: boolean;
    show_results_immediately: boolean;
    show_detailed_results: boolean;
    time_limit_minutes: number | null;
    start_time: string | null;
    end_time: string | null;
    timezone?: string;
    restrict_by_email: boolean;
    allowed_emails: string[];
    child_mode_enabled?: boolean;
    attempt_limit?: number | null;
    leaderboard_visibility?: 'hidden' | 'after_submit' | 'always';
}

export interface ExamForm {
    id?: string; // Add ID for editing existing exams
    title: string;
    description: string;
    tutor_instructions?: string;
    required_fields: string[];
    questions: Question[];
    settings: ExamSettings;
}

export const defaultQuestion: Question = {
    type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
    randomize_options: true,
};

export const defaultExam: ExamForm = {
    title: '',
    description: '',
    tutor_instructions: '',
    required_fields: ['name', 'email'],
    questions: [defaultQuestion],
    settings: {
        require_fullscreen: false,
        detect_tab_switch: false,
        disable_copy_paste: false,
        disable_right_click: false,
        max_violations: 3,
        randomize_questions: false,
        show_results_immediately: true,
        show_detailed_results: false,
        time_limit_minutes: null,
        start_time: null,
        end_time: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        restrict_by_email: false,
        allowed_emails: [],
        child_mode_enabled: false,
        attempt_limit: null,
        leaderboard_visibility: 'always',
    },
};
