import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const useDemoTour = (scenario: string | null, startTour: boolean) => {
    useEffect(() => {
        if (!startTour || !scenario) return;

        // Small delay to ensure DOM elements are ready
        const timer = setTimeout(() => {
            const tours: Record<string, any[]> = {
                'create-exam': [
                    {
                        element: '#exam-title',
                        popover: {
                            title: '📝 Exam Title',
                            description: 'Start by giving your exam a clear, descriptive title. This helps students understand what they\'re taking.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#exam-description',
                        popover: {
                            title: '📖 Exam Description',
                            description: 'Add a detailed description covering topics, instructions, or any important notes for students.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#required-fields',
                        popover: {
                            title: '👤 Student Information',
                            description: 'Choose which fields students must fill out (name, email, etc.) before taking the exam.',
                            side: 'right',
                            align: 'start'
                        }
                    },
                    {
                        element: '#questions-section',
                        popover: {
                            title: '❓ Add Questions',
                            description: 'Build your exam by adding questions. Support multiple choice, short answer, true/false, and more.',
                            side: 'top',
                            align: 'start'
                        }
                    },
                    {
                        element: '#exam-settings',
                        popover: {
                            title: '⚙️ Security Settings',
                            description: 'Enable fullscreen mode, tab-switch detection, and randomization to prevent cheating.',
                            side: 'left',
                            align: 'start'
                        }
                    },
                    {
                        element: '#time-settings',
                        popover: {
                            title: '⏱️ Time Limits',
                            description: 'Set time constraints and schedule exam availability for your students.',
                            side: 'left',
                            align: 'start'
                        }
                    },
                    {
                        element: '#save-exam',
                        popover: {
                            title: '💾 Save & Share',
                            description: 'When done, save your exam and you\'ll get an instant shareable link!',
                            side: 'top',
                            align: 'center'
                        }
                    }
                ],
                'share-monitor': [
                    {
                        popover: {
                            title: '🔗 Share & Monitor Dashboard',
                            description: 'Welcome! Here you can share exams with students and monitor submissions in real-time.',
                            side: 'bottom',
                            align: 'center'
                        }
                    },
                    {
                        element: '[data-tour="question-bank"]',
                        popover: {
                            title: '📚 Question Bank',
                            description: 'Manage your reusable question library here first.',
                            side: 'bottom',
                            align: 'center'
                        }
                    },
                    {
                        element: '[data-tour="create-exam"]',
                        popover: {
                            title: '➕ Create Exam',
                            description: 'Click to create new exams with custom questions and settings.',
                            side: 'bottom',
                            align: 'center'
                        }
                    },
                    {
                        element: '[data-tour="exam-card"]',
                        popover: {
                            title: '📋 Your Exams',
                            description: 'All your exams appear here. Each shows title, description, and current status.',
                            side: 'top',
                            align: 'start'
                        }
                    },
                    {
                        element: '[data-tour="copy-link"]',
                        popover: {
                            title: '🔗 Share With Students',
                            description: 'One-click copy exam link to share via email, chat, or messaging apps.',
                            side: 'top',
                            align: 'center'
                        }
                    },
                    {
                        element: '[data-tour="results"]',
                        popover: {
                            title: '📈 View Results',
                            description: 'Click to see student submissions and detailed analytics.',
                            side: 'left',
                            align: 'start'
                        }
                    }
                ],
                'view-analytics': [
                    {
                        element: '#analytics-header',
                        popover: {
                            title: '📊 Analytics Dashboard',
                            description: 'Comprehensive insights into student performance and exam effectiveness.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#performance-charts',
                        popover: {
                            title: '📈 Performance Charts',
                            description: 'Visual representations of class performance, difficulty analysis, and question effectiveness.',
                            side: 'left',
                            align: 'start'
                        }
                    },
                    {
                        element: '#individual-responses',
                        popover: {
                            title: '👥 Individual Responses',
                            description: 'Review each student\'s answers and provide detailed feedback.',
                            side: 'right',
                            align: 'start'
                        }
                    },
                    {
                        element: '#export-results',
                        popover: {
                            title: '💾 Export Results',
                            description: 'Download results as Excel, PDF, or CSV for records or further analysis.',
                            side: 'top',
                            align: 'center'
                        }
                    }
                ],
                'question-bank': [
                    {
                        element: '#bank-list',
                        popover: {
                            title: '📚 Question Banks',
                            description: 'Organize questions into banks for easy reuse across multiple exams.',
                            side: 'bottom',
                            align: 'start'
                        }
                    },
                    {
                        element: '#create-bank-btn',
                        popover: {
                            title: '➕ Create Bank',
                            description: 'Start a new question bank for a specific subject or topic.',
                            side: 'top',
                            align: 'center'
                        }
                    },
                    {
                        element: '#questions-list',
                        popover: {
                            title: '❓ Questions',
                            description: 'All questions in this bank appear here. Tag them by difficulty and category.',
                            side: 'left',
                            align: 'start'
                        }
                    },
                    {
                        element: '#import-to-exam',
                        popover: {
                            title: '🚀 Quick Import',
                            description: 'Reuse these questions when creating new exams - save time and maintain consistency!',
                            side: 'top',
                            align: 'center'
                        }
                    }
                ]
            };

            const steps = tours[scenario] || [];

            if (steps.length > 0) {
                try {
                    const driverObj = driver({
                        showProgress: true,
                        showButtons: ['next', 'previous', 'close'],
                        allowClose: true,
                        onDestroyed: () => {
                            console.log('Demo tour completed');
                        }
                    });

                    driverObj.setSteps(steps);
                    driverObj.drive();
                } catch (err) {
                    console.error('Error starting tour:', err);
                }
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [startTour, scenario]);
};
