import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableQuestionItemProps {
    id: string;
    children: React.ReactNode;
}

export function SortableQuestionItem({ id, children }: SortableQuestionItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.3 : 1,
        position: 'relative' as 'relative', // TypeScript fix
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-3xl transition-all hover:shadow-md mb-6 relative group overflow-hidden">
            {/* Gradient accent on hover */}
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex">
                {/* Drag Handle Area */}
                <div
                    {...attributes}
                    {...listeners}
                    className="w-12 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <GripVertical className="h-5 w-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                </div>

                {/* Content */}
                <div className="flex-1 p-6 sm:p-8 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
