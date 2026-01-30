import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EditorLayout } from './layout/EditorLayout';
import { Sidebar } from './layout/Sidebar';
import { Canvas } from './layout/Canvas';
import { Properties } from './layout/Properties';
import { EditorNavbar } from './components/EditorNavbar';
import { useExamStore } from './store';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { PreviewMode } from './layout/PreviewMode';

export default function ExamEditor() {
    const { id } = useParams();
    const { setExam, setLoading, reset, isPreviewMode } = useExamStore();

    useEffect(() => {
        const fetchExam = async () => {
            if (!id) {
                reset();
                return;
            }

            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('exams')
                    .select('*, questions(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    // Port data structure to our state
                    setExam({
                        id: data.id,
                        title: data.title,
                        description: data.description,
                        required_fields: data.required_fields || [],
                        questions: data.questions || [],
                        settings: data.settings || {}
                    });
                }
            } catch (error: any) {
                console.error('Error fetching exam:', error);
                toast.error('Failed to load exam. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [id, setExam, setLoading, reset]);

    if (isPreviewMode) {
        return <PreviewMode />;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <EditorNavbar />
            <EditorLayout
                sidebar={<Sidebar />}
                canvas={<Canvas />}
                properties={<Properties />}
            />
        </div>
    );
}
