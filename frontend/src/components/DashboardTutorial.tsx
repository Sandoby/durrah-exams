import { useTranslation } from 'react-i18next';
import Joyride, { STATUS } from 'react-joyride';
import type { CallBackProps, Step, Styles } from 'react-joyride';

interface DashboardTutorialProps {
    run: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

export function DashboardTutorial({ run, onComplete, onSkip }: DashboardTutorialProps) {
    const { t } = useTranslation();

    const steps: Step[] = [
        {
            target: 'body',
            content: (
                <div>
                    <h2 className="text-2xl font-bold mb-3">{t('tutorial.welcome.title')}</h2>
                    <p className="text-base">{t('tutorial.welcome.message')}</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '[data-tutorial="create-exam"]',
            content: (
                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('tutorial.createExam.title')}</h3>
                    <p>{t('tutorial.createExam.message')}</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '[data-tutorial="question-bank"]',
            content: (
                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('tutorial.questionBank.title')}</h3>
                    <p>{t('tutorial.questionBank.message')}</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '[data-tutorial="exam-card"]',
            content: (
                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('tutorial.examCard.title')}</h3>
                    <p>{t('tutorial.examCard.message')}</p>
                </div>
            ),
            placement: 'top',
        },
        {
            target: '[data-tutorial="exam-actions"]',
            content: (
                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('tutorial.examActions.title')}</h3>
                    <p>{t('tutorial.examActions.message')}</p>
                </div>
            ),
            placement: 'top',
        },
        {
            target: '[data-tutorial="exam-edit"]',
            content: (
                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('tutorial.examEdit.title')}</h3>
                    <p>{t('tutorial.examEdit.message')}</p>
                </div>
            ),
            placement: 'left',
        },
        {
            target: '[data-tutorial="settings"]',
            content: (
                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('tutorial.settings.title')}</h3>
                    <p>{t('tutorial.settings.message')}</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: 'body',
            content: (
                <div>
                    <h2 className="text-2xl font-bold mb-3">{t('tutorial.completion.title')}</h2>
                    <p className="text-base">{t('tutorial.completion.message')}</p>
                </div>
            ),
            placement: 'center',
        },
    ];

    // Check if dark mode is enabled
    const isDarkMode = document.documentElement.classList.contains('dark');

    const styles: Partial<Styles> = {
        options: {
            primaryColor: '#4F46E5', // Indigo-600
            textColor: isDarkMode ? '#F9FAFB' : '#1F2937',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            overlayColor: isDarkMode ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.7)',
            arrowColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            zIndex: 10000,
        },
        tooltip: {
            borderRadius: 12,
            padding: 20,
        },
        tooltipContent: {
            padding: '10px 0',
        },
        buttonNext: {
            backgroundColor: '#4F46E5',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
        },
        buttonBack: {
            color: '#6B7280',
            marginRight: 10,
            fontSize: '14px',
        },
        buttonSkip: {
            color: '#9CA3AF',
            fontSize: '14px',
        },
    };

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status, action } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            if (action === 'skip') {
                onSkip();
            } else {
                onComplete();
            }
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            styles={styles}
            callback={handleJoyrideCallback}
            locale={{
                back: t('tutorial.buttons.back'),
                close: t('tutorial.buttons.close'),
                last: t('tutorial.buttons.finish'),
                next: t('tutorial.buttons.next'),
                skip: t('tutorial.buttons.skip'),
            }}
            floaterProps={{
                disableAnimation: false,
            }}
        />
    );
}
