import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Classroom, ClassroomFormData, ClassroomStats } from '../types/classroom';
import toast from 'react-hot-toast';

export function useClassrooms(includeArchived: boolean = false) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClassrooms = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('classrooms')
        .select('*')
        .order('is_archived', { ascending: true })
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setClassrooms(data || []);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching classrooms:', error);
      toast.error('Failed to load classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  const createClassroom = async (formData: ClassroomFormData): Promise<Classroom | null> => {
    try {
      // Generate invite code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) throw codeError;

      const inviteCode = codeData as string;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert classroom
      const { data, error: insertError } = await supabase
        .from('classrooms')
        .insert({
          tutor_id: user.id,
          name: formData.name,
          description: formData.description,
          subject: formData.subject,
          grade_level: formData.grade_level,
          color: formData.color,
          academic_year: formData.academic_year,
          invite_code: inviteCode,
          settings: formData.settings,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Classroom created successfully!');
      await fetchClassrooms(); // Refresh list
      return data;
    } catch (err) {
      const error = err as Error;
      console.error('Error creating classroom:', error);
      toast.error('Failed to create classroom');
      return null;
    }
  };

  const updateClassroom = async (
    id: string,
    updates: Partial<ClassroomFormData>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('classrooms')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Classroom updated successfully!');
      await fetchClassrooms(); // Refresh list
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error updating classroom:', error);
      toast.error('Failed to update classroom');
      return false;
    }
  };

  const deleteClassroom = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Classroom deleted successfully!');
      await fetchClassrooms(); // Refresh list
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error deleting classroom:', error);
      toast.error('Failed to delete classroom');
      return false;
    }
  };

  const archiveClassroom = async (id: string, archive: boolean = true): Promise<boolean> => {
    try {
      const { error: archiveError } = await supabase
        .from('classrooms')
        .update({ is_archived: archive })
        .eq('id', id);

      if (archiveError) throw archiveError;

      toast.success(archive ? 'Classroom archived' : 'Classroom unarchived');
      await fetchClassrooms(); // Refresh list
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error archiving classroom:', error);
      toast.error('Failed to archive classroom');
      return false;
    }
  };

  const getClassroom = async (id: string): Promise<Classroom | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching classroom:', error);
      toast.error('Failed to load classroom');
      return null;
    }
  };

  const getClassroomStats = async (id: string): Promise<ClassroomStats | null> => {
    try {
      const { data, error: statsError } = await supabase
        .rpc('get_classroom_stats', { p_classroom_id: id });

      if (statsError) throw statsError;
      return data as ClassroomStats;
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching classroom stats:', error);
      return null;
    }
  };

  const regenerateInviteCode = async (id: string): Promise<string | null> => {
    try {
      // Generate new code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) throw codeError;

      const newCode = codeData as string;

      // Update classroom
      const { error: updateError } = await supabase
        .from('classrooms')
        .update({ invite_code: newCode })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Invite code regenerated!');
      await fetchClassrooms(); // Refresh list
      return newCode;
    } catch (err) {
      const error = err as Error;
      console.error('Error regenerating code:', error);
      toast.error('Failed to regenerate code');
      return null;
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, [includeArchived]);

  return {
    classrooms,
    isLoading,
    error,
    fetchClassrooms,
    createClassroom,
    updateClassroom,
    deleteClassroom,
    archiveClassroom,
    getClassroom,
    getClassroomStats,
    regenerateInviteCode,
  };
}
