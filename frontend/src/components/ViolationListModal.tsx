import { X, AlertTriangle, Clock } from 'lucide-react';

interface Violation {
    type: string;
    timestamp: string;
}

interface ViolationListModalProps {
    isOpen: boolean;
    onClose: () => void;
    violations: Violation[];
    studentName: string;
}

export function ViolationListModal({ isOpen, onClose, violations, studentName }: ViolationListModalProps) {
    if (!isOpen) return null;

    const formatViolationType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-center mb-4">
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Violation History</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Student: {studentName}</p>
                        </div>
                    </div>

                    <div className="mt-4 max-h-96 overflow-y-auto">
                        {violations.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No violations recorded.</p>
                        ) : (
                            <div className="space-y-3">
                                {violations.map((v, i) => (
                                    <div key={i} className="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-100 text-red-800 text-xs font-bold rounded-full mr-3">
                                            {i + 1}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {formatViolationType(v.type)}
                                            </p>
                                            <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {new Date(v.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={onClose}
                            className="w-full inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
