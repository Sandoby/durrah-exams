import { AlertTriangle, X } from 'lucide-react';

interface ViolationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    severity?: 'warning' | 'critical';
}

export function ViolationModal({ isOpen, onClose, title, message, severity = 'warning' }: ViolationModalProps) {
    if (!isOpen) return null;

    const isCritical = severity === 'critical';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* Icon */}
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${isCritical ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                        }`}>
                        <AlertTriangle className={`h-6 w-6 ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                            }`} />
                    </div>

                    {/* Content */}
                    <div className="mt-4 text-center">
                        <h3 className={`text-lg font-semibold ${isCritical ? 'text-red-900 dark:text-red-200' : 'text-yellow-900 dark:text-yellow-200'
                            }`}>
                            {title}
                        </h3>
                        <div className="mt-3">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-6">
                        <button
                            onClick={onClose}
                            className={`w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${isCritical
                                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                    : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                                }`}
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
