import { useState } from 'react';
import { useExamStore } from '../store';
import { Sliders, Timer, Shield, GraduationCap, StickyNote, Globe, Settings, Calendar } from 'lucide-react';

export function Properties() {
    const { exam, selectedQuestionIndex, updateQuestion, updateSettings, updateExam } = useExamStore();
    const [activeTab, setActiveTab] = useState<'question' | 'exam'>('question');
    const question = selectedQuestionIndex !== null ? exam.questions[selectedQuestionIndex] : null;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('question')}
                    className={`flex-1 p-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'question'
                        ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/30'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Question
                </button>
                <button
                    onClick={() => setActiveTab('exam')}
                    className={`flex-1 p-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'exam'
                        ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/30'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Global
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {activeTab === 'question' && question && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Question Type */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Sliders className="w-3 h-3" />
                                Response Type
                            </label>
                            <select
                                value={question.type}
                                onChange={(e) => updateQuestion(selectedQuestionIndex!, { type: e.target.value })}
                                className="w-full bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-800/30 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20"
                            >
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="multiple_select">Multiple Select</option>
                                <option value="dropdown">Dropdown</option>
                                <option value="true_false">True/False</option>
                                <option value="text_entry">Text Entry</option>
                            </select>
                        </div>

                        {/* Points */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <GraduationCap className="w-3 h-3" />
                                Score Weight
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    value={question.points}
                                    onChange={(e) => updateQuestion(selectedQuestionIndex!, { points: parseInt(e.target.value) || 1 })}
                                    className="w-full bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-800/30 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20 pr-12"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">PTS</span>
                            </div>
                        </div>

                        {/* Options Settings */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Settings className="w-3 h-3" />
                                Behavior
                            </label>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-transparent hover:border-indigo-100 cursor-pointer transition-all">
                                    <input
                                        type="checkbox"
                                        checked={question.randomize_options}
                                        onChange={(e) => updateQuestion(selectedQuestionIndex!, { randomize_options: e.target.checked })}
                                        className="h-4 w-4 text-gray-900 rounded"
                                    />
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Randomize Options</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'exam' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* Tutor Instructions */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <StickyNote className="w-3 h-3" />
                                Tutor Instructions (Optional)
                            </label>
                            <textarea
                                placeholder="Instructions for students before they start..."
                                value={exam.tutor_instructions || ''}
                                onChange={(e) => updateExam({ tutor_instructions: e.target.value })}
                                className="w-full bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-800/30 rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20 min-h-[100px] resize-y"
                            />
                            <p className="text-[10px] text-gray-400 font-medium">
                                Shown on the start screen before students begin the exam.
                            </p>
                        </div>

                        {/* Time Settings */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <Timer className="w-3 h-3" />
                                    Time Limit
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="No limit"
                                        value={exam.settings.time_limit_minutes || ''}
                                        onChange={(e) => updateSettings({ time_limit_minutes: parseInt(e.target.value) || null })}
                                        className="w-full bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-800/30 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20 pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">MIN</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <Globe className="w-3 h-3" />
                                    Time Zone
                                </label>
                                <select
                                    value={exam.settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                                    onChange={(e) => updateSettings({ timezone: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20"
                                >
                                    <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Local ({Intl.DateTimeFormat().resolvedOptions().timeZone})</option>
                                    <option value="UTC">UTC</option>
                                    {Intl.supportedValuesOf('timeZone').map(tz => (
                                        <option key={tz} value={tz}>{tz}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Availability Window */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    Availability Window
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Starts At</span>
                                        <input
                                            type="datetime-local"
                                            value={exam.settings.start_time || ''}
                                            onChange={(e) => updateSettings({ start_time: e.target.value || null })}
                                            className="w-full bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-800/30 rounded-2xl px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Ends At</span>
                                        <input
                                            type="datetime-local"
                                            value={exam.settings.end_time || ''}
                                            onChange={(e) => updateSettings({ end_time: e.target.value || null })}
                                            className="w-full bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-800/30 rounded-2xl px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Settings */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                <Shield className="w-3 h-3" />
                                Anti-Cheat Measures
                            </label>
                            <div className="space-y-2">
                                {[
                                    { id: 'fullscreen', label: 'Force Fullscreen', key: 'require_fullscreen' },
                                    { id: 'tab', label: 'Tab Detection', key: 'detect_tab_switch' },
                                    { id: 'copy', label: 'Disable Clipboard', key: 'disable_copy_paste' },
                                    { id: 'results', label: 'Show Results Immediately', key: 'show_results_immediately' },
                                    { id: 'answers', label: 'Show Correct Answers', key: 'show_detailed_results' },
                                ].map((item) => (
                                    <label key={item.id} className="relative flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border border-transparent hover:border-indigo-100 cursor-pointer transition-all group">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{item.label}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={!!exam.settings[item.key as keyof typeof exam.settings]}
                                            onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
                                            className="h-4 w-4 text-teal-600 rounded"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
