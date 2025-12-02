import { useState } from 'react';
import { Upload, X, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailWhitelistProps {
    emails: string[];
    onChange: (emails: string[]) => void;
}

const GROQ_API_KEY = 'AIzaSyCpZF9UZaNd_y8rTmretXWwmJvm-WEesZc';

export function EmailWhitelist({ emails, onChange }: EmailWhitelistProps) {
    const [newEmail, setNewEmail] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');

    const addEmail = () => {
        const trimmed = newEmail.trim().toLowerCase();
        if (!trimmed) return;

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (emails.includes(trimmed)) {
            toast.error('Email already in the list');
            return;
        }

        onChange([...emails, trimmed]);
        setNewEmail('');
        toast.success('Email added');
    };

    const removeEmail = (email: string) => {
        onChange(emails.filter(e => e !== email));
        toast.success('Email removed');
    };

    const extractEmailsWithAI = async (text: string): Promise<string[]> => {
        try {
            if (!GROQ_API_KEY) {
                throw new Error('Groq API key missing');
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an email extraction expert. Extract all valid email addresses from the given text. Return ONLY a JSON array of unique email addresses in lowercase, nothing else. If no emails are found, return an empty array []. Example: ["email1@example.com","email2@example.com"]'
                        },
                        {
                            role: 'user',
                            content: `Extract all email addresses from this text:\n\n${text}`
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000,
                }),
            });

            if (!response.ok) {
                throw new Error('AI API request failed');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content || '[]';

            // Try to parse the JSON response
            try {
                // Find the JSON array in the response content if there's extra text
                const jsonMatch = content.match(/\[.*\]/s);
                const jsonString = jsonMatch ? jsonMatch[0] : content;

                const extractedEmails = JSON.parse(jsonString) as unknown;
                if (Array.isArray(extractedEmails)) {
                    return (extractedEmails as string[]).map((email) => email.toLowerCase().trim()).filter((email) => {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        return emailRegex.test(email);
                    });
                }
            } catch (e) {
                console.error('Failed to parse AI response:', e);
                throw new Error('Failed to parse AI response');
            }

            return [];
        } catch (error) {
            console.error('AI extraction error:', error);
            throw error; // Propagate error instead of returning empty array or fallback
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setUploadedFileName(file.name);

        try {
            const text = await file.text();
            const extractedEmails = await extractEmailsWithAI(text);

            if (extractedEmails.length === 0) {
                toast.error('No valid email addresses found in the file');
                return;
            }

            // Filter out duplicates
            const newEmails = extractedEmails.filter(email => !emails.includes(email));

            if (newEmails.length === 0) {
                toast('All emails from the file are already in the list', { icon: 'ℹ️' });
                return;
            }

            onChange([...emails, ...newEmails]);
            toast.success(`Added ${newEmails.length} email(s) from ${file.name}`);
        } catch (error) {
            console.error('File processing error:', error);
            toast.error('Failed to extract emails. Please check the file format.');
        } finally {
            setIsProcessing(false);
            setUploadedFileName('');
            // Reset file input
            event.target.value = '';
        }
    };

    const clearAll = () => {
        if (window.confirm(`Are you sure you want to remove all ${emails.length} email(s)?`)) {
            onChange([]);
            toast.success('All emails cleared');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email Whitelist</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Only students with these email addresses can access the exam
                    </p>
                </div>
                {emails.length > 0 && (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs text-red-600 hover:text-red-700"
                    >
                        Clear All ({emails.length})
                    </button>
                )}
            </div>

            {/* Add Email Manually */}
            <div className="flex space-x-2">
                <div className="flex-1">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                        placeholder="student@example.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={addEmail}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm flex items-center"
                >
                    <Mail className="h-4 w-4 mr-1" />
                    Add
                </button>
            </div>

            {/* Bulk Upload */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <label className="cursor-pointer block">
                    <input
                        type="file"
                        accept=".txt,.csv,.doc,.docx,.pdf,.xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={isProcessing}
                        className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        AI Analyzing {uploadedFileName}...
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Extracting emails from file content
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-gray-400" />
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        Upload file with emails
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Supports TXT, CSV, PDF, DOC, DOCX, XLS, XLSX
                                    </p>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                        AI-powered extraction from any format
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </label>
            </div>

            {/* Email List */}
            {emails.length > 0 && (
                <div className="mt-4">
                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {emails.map((email, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <div className="flex items-center space-x-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-900 dark:text-white">{email}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeEmail(email)}
                                        className="text-gray-400 hover:text-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
