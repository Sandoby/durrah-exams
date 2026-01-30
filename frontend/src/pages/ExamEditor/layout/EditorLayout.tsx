import { useState } from 'react';
import { useExamStore } from '../store';
import { Loader2, List, Type, Settings2 } from 'lucide-react';

interface EditorLayoutProps {
    sidebar: React.ReactNode;
    canvas: React.ReactNode;
    properties: React.ReactNode;
}

export function EditorLayout({ sidebar, canvas, properties }: EditorLayoutProps) {
    const isLoading = useExamStore((state) => state.isLoading);
    const isPreviewMode = useExamStore((state) => state.isPreviewMode);
    const [mobileTab, setMobileTab] = useState<'sidebar' | 'canvas' | 'properties'>('canvas');

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-teal-600 dark:text-teal-400" />
                    <p className="text-gray-500 font-medium">Loading your exam...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] w-full bg-[#F8FAFC] dark:bg-[#0B1120] flex flex-col overflow-hidden font-sans">
            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Sidebar Navigation - Premium Mobile Slide Panel */}
                <aside className={`
                    fixed top-16 bottom-16 left-0 right-0 z-40 
                    lg:relative lg:top-auto lg:bottom-auto lg:left-auto lg:right-auto lg:flex lg:w-[300px] 
                    border-r border-gray-200 dark:border-gray-800 
                    bg-white dark:bg-gray-900 
                    overflow-y-auto transition-transform duration-300
                    ${mobileTab === 'sidebar' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <div className="lg:hidden px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                        <h2 className="text-gray-900 dark:text-gray-100 font-bold text-sm uppercase tracking-wider">Exam Questions</h2>
                    </div>
                    {sidebar}
                </aside>

                {/* Primary Canvas */}
                <main className={`
                    flex-1 overflow-y-auto relative transition-all duration-300
                    ${mobileTab === 'canvas' ? 'opacity-100 visible' : 'opacity-0 invisible lg:visible lg:opacity-100'}
                `}>
                    <div className="max-w-4xl mx-auto h-full flex flex-col pb-24 lg:pb-0">
                        {canvas}
                    </div>
                </main>

                {/* Properties Panel - Premium Mobile Slide Panel */}
                <aside className={`
                    fixed top-16 bottom-16 left-0 right-0 z-40 
                    lg:relative lg:top-auto lg:bottom-auto lg:left-auto lg:right-auto lg:flex lg:w-[350px] 
                    border-l border-gray-200 dark:border-gray-800 
                    bg-white dark:bg-gray-900 
                    overflow-y-auto transition-transform duration-300
                    ${mobileTab === 'properties' ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    <div className="lg:hidden px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                        <h2 className="text-gray-900 dark:text-gray-100 font-bold text-sm uppercase tracking-wider">Settings & Config</h2>
                    </div>
                    {properties}
                </aside>
            </div>

            {/* Simple Mobile Navigation Bar */}
            {!isPreviewMode && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
                    <div className="flex h-16">
                        {[
                            { id: 'sidebar', label: 'Questions', icon: List },
                            { id: 'canvas', label: 'Editor', icon: Type },
                            { id: 'properties', label: 'Settings', icon: Settings2 }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                //@ts-ignore
                                onClick={() => setMobileTab(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${mobileTab === tab.id
                                    ? 'text-teal-600 bg-teal-50 dark:bg-teal-900/30'
                                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
