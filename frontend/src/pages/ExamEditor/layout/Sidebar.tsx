import { useExamStore } from '../store';
import { Plus, GripVertical, Trash2, FileText } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
    index: number;
    id: string;
    isSelected: boolean;
}

function SortableQuestionItem({ index, id, isSelected }: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const { exam, setSelectedQuestion, removeQuestion } = useExamStore();
    const question = exam.questions[index];

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-2 p-2 mx-2 rounded-lg cursor-pointer transition-all ${isSelected
                ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-800'
                : 'hover:bg-teal-50/50 dark:hover:bg-teal-900/10'
                } border border-transparent`}
            onClick={() => setSelectedQuestion(index)}
        >
            <div {...attributes} {...listeners} className="p-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-400">
                <GripVertical className="w-3.5 h-3.5" />
            </div>

            <div className={`flex-1 min-w-0 flex items-center gap-2`}>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>
                    Q{index + 1}
                </span>
                <p className={`text-xs truncate font-medium ${isSelected ? 'text-teal-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {question.question_text.replace(/<[^>]*>/g, '') || 'Empty Question'}
                </p>
            </div>

            {exam.questions.length > 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); removeQuestion(index); }}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

export function Sidebar() {
    const { exam, selectedQuestionIndex, addQuestion, reorderQuestions, updateExam } = useExamStore();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: any) {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = exam.questions.findIndex((_, i) => `q-${i}` === active.id);
            const newIndex = exam.questions.findIndex((_, i) => `q-${i}` === over.id);
            reorderQuestions(oldIndex, newIndex);
        }
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
            {/* Exam Header Edit in Sidebar */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={exam.title}
                        onChange={(e) => updateExam({ title: e.target.value })}
                        placeholder="Exam Title"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 p-0"
                    />
                </div>
            </div>

            {/* Question List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={exam.questions.map((_, i) => `q-${i}`)} strategy={verticalListSortingStrategy}>
                        {exam.questions.map((_, index) => (
                            <SortableQuestionItem
                                key={`q-${index}`}
                                id={`q-${index}`}
                                index={index}
                                isSelected={selectedQuestionIndex === index}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                <div className="px-4 mt-4">
                    <button
                        onClick={() => addQuestion()}
                        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-teal-100 dark:border-teal-900/50 text-teal-600 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all text-sm font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Add Question
                    </button>
                </div>
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span>Total Points:</span>
                    <span className="text-gray-900 dark:text-white">{exam.questions.reduce((acc, q) => acc + q.points, 0)}</span>
                </div>
            </div>
        </div>
    );
}
