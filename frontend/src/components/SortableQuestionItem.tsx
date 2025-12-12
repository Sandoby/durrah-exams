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
        <div ref={setNodeRef} style={style} className="bg-white dark:bg-gray-800 shadow rounded-lg p-0 transition-shadow hover:shadow-md mb-6">
            <div className="flex">
                {/* Drag Handle Area */}
                <div
                    {...attributes}
                    {...listeners}
                    className="w-10 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-l-lg cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <GripVertical className="h-5 w-5 text-gray-400" />
                </div>

                {/* Content */}
                <div className="flex-1 p-6 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
