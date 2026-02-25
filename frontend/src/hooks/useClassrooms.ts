import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Classroom, ClassroomFormData, ClassroomStats } from '../types/classroom';
import toast from 'react-hot-toast';

// ─── Query key factory ────────────────────────────────────────────────────────
export const classroomKeys = {
  all: ['classrooms'] as const,
  list: (includeArchived: boolean) => ['classrooms', 'list', includeArchived] as const,
  detail: (id: string) => ['classrooms', 'detail', id] as const,
  stats: (id: string) => ['classrooms', 'stats', id] as const,
};

// ─── Bare query/mutation fns (reusable outside hook) ────────────────────────
async function fetchClassroomsFn(includeArchived: boolean): Promise<Classroom[]> {
  let query = supabase
    .from('classrooms')
    .select('*')
    .order('is_archived', { ascending: true })
    .order('created_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useClassrooms(includeArchived: boolean = false) {
  const queryClient = useQueryClient();

  // ── List query ──────────────────────────────────────────────────────────────
  const {
    data: classrooms = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: classroomKeys.list(includeArchived),
    queryFn: () => fetchClassroomsFn(includeArchived),
    staleTime: 1000 * 30, // 30 s — classrooms change more often than default 5 min
  });

  const error = queryError as Error | null;

  const fetchClassrooms = () => {
    refetch();
  };

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: classroomKeys.all });
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (formData: ClassroomFormData): Promise<Classroom> => {
      const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code');
      if (codeError) throw codeError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
          invite_code: codeData as string,
          settings: formData.settings,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      toast.success('Classroom created successfully!');
      invalidateList();
    },
    onError: (err: Error) => {
      console.error('Error creating classroom:', err);
      toast.error('Failed to create classroom');
    },
  });

  const createClassroom = async (formData: ClassroomFormData): Promise<Classroom | null> => {
    try {
      return await createMutation.mutateAsync(formData);
    } catch {
      return null;
    }
  };

  // ── Update ──────────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClassroomFormData> }) => {
      const { error } = await supabase.from('classrooms').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Classroom updated successfully!');
      invalidateList();
    },
    onError: (err: Error) => {
      console.error('Error updating classroom:', err);
      toast.error('Failed to update classroom');
    },
  });

  const updateClassroom = async (
    id: string,
    updates: Partial<ClassroomFormData>
  ): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, updates });
      return true;
    } catch {
      return false;
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classrooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Classroom deleted successfully!');
      invalidateList();
    },
    onError: (err: Error) => {
      console.error('Error deleting classroom:', err);
      toast.error('Failed to delete classroom');
    },
  });

  const deleteClassroom = async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  // ── Archive / Unarchive ─────────────────────────────────────────────────────
  const archiveMutation = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from('classrooms')
        .update({ is_archived: archive })
        .eq('id', id);
      if (error) throw error;
      return archive;
    },
    onSuccess: (archive) => {
      toast.success(archive ? 'Classroom archived' : 'Classroom unarchived');
      invalidateList();
    },
    onError: (err: Error) => {
      console.error('Error archiving classroom:', err);
      toast.error('Failed to archive classroom');
    },
  });

  const archiveClassroom = async (id: string, archive: boolean = true): Promise<boolean> => {
    try {
      await archiveMutation.mutateAsync({ id, archive });
      return true;
    } catch {
      return false;
    }
  };

  // ── Regenerate invite code ──────────────────────────────────────────────────
  const regenerateMutation = useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { data: codeData, error: codeError } = await supabase.rpc('generate_invite_code');
      if (codeError) throw codeError;

      const newCode = codeData as string;
      const { error: updateError } = await supabase
        .from('classrooms')
        .update({ invite_code: newCode })
        .eq('id', id);

      if (updateError) throw updateError;
      return newCode;
    },
    onSuccess: () => {
      toast.success('Invite code regenerated!');
      invalidateList();
    },
    onError: (err: Error) => {
      console.error('Error regenerating code:', err);
      toast.error('Failed to regenerate code');
    },
  });

  const regenerateInviteCode = async (id: string): Promise<string | null> => {
    try {
      return await regenerateMutation.mutateAsync(id);
    } catch {
      return null;
    }
  };

  // ── Imperative per-ID helpers (used by ClassroomDetail) ────────────────────
  const getClassroom = async (id: string): Promise<Classroom | null> => {
    // Try cache first
    const cached = queryClient.getQueryData<Classroom[]>(classroomKeys.list(false)) ||
      queryClient.getQueryData<Classroom[]>(classroomKeys.list(true));
    const fromCache = cached?.find((c) => c.id === id);
    if (fromCache) return fromCache;

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching classroom:', err);
      toast.error('Failed to load classroom');
      return null;
    }
  };

  const getClassroomStats = async (id: string): Promise<ClassroomStats | null> => {
    try {
      const { data, error } = await supabase.rpc('get_classroom_stats', { p_classroom_id: id });
      if (error) throw error;
      return data as ClassroomStats;
    } catch (err) {
      console.error('Error fetching classroom stats:', err);
      return null;
    }
  };

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
