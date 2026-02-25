import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { JoinResult, ClassroomPreview } from '../types/classroom';
import toast from 'react-hot-toast';

export function useInviteCode() {
  const [isJoining, setIsJoining] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const lookupClassroom = async (inviteCode: string): Promise<ClassroomPreview | null> => {
    try {
      setIsLookingUp(true);

      const { data: results, error: rpcError } = await supabase
        .rpc('lookup_classroom_by_code', { p_code: inviteCode.toUpperCase().trim() });

      if (rpcError) {
        if (rpcError.message?.includes('Too many requests')) {
          toast.error('Too many attempts. Please wait a moment.');
        } else {
          toast.error('Invalid invite code');
        }
        return null;
      }

      const classroom = (results as ClassroomPreview[])?.[0];

      if (!classroom) {
        toast.error('Invalid invite code');
        return null;
      }

      if (classroom.is_archived) {
        toast.error('This classroom is no longer accepting students');
        return null;
      }

      return {
        id: classroom.id,
        name: classroom.name,
        subject: classroom.subject || '',
        grade_level: classroom.grade_level || '',
        academic_year: classroom.academic_year,
        description: classroom.description,
        color: classroom.color,
        invite_code: classroom.invite_code,
        tutor_name: classroom.tutor_name || 'Unknown',
        student_count: classroom.student_count || 0,
        settings: classroom.settings,
      };
    } catch (err) {
      console.error('Error looking up classroom:', err);
      toast.error('Failed to lookup classroom');
      return null;
    } finally {
      setIsLookingUp(false);
    }
  };

  const joinClassroom = async (inviteCode: string): Promise<JoinResult | null> => {
    try {
      setIsJoining(true);

      const { data, error: rpcError } = await supabase
        .rpc('join_classroom', { p_invite_code: inviteCode.toUpperCase().trim() });

      if (rpcError) {
        if (rpcError.message?.includes('Too many')) {
          toast.error('Too many join attempts. Please wait a moment.');
        } else {
          toast.error('Failed to join classroom');
        }
        return null;
      }

      const result = data as {
        success: boolean;
        error?: string;
        message?: string;
        status?: 'active' | 'pending';
        classroom?: { id: string; name: string; subject: string };
      };

      if (!result.success) {
        if (result.error === 'pending') {
          toast.success(result.message || 'Enrollment pending approval', { icon: 'ℹ️' });
        } else {
          toast.error(result.message || 'Failed to join classroom');
        }
        return null;
      }

      if (result.status === 'active') {
        toast.success(`Successfully joined ${result.classroom?.name}!`);
      } else {
        toast.success('Your enrollment request has been sent to the tutor', { icon: 'ℹ️' });
      }

      return {
        success: true,
        classroom: result.classroom,
        status: result.status,
      };
    } catch (err) {
      console.error('Error joining classroom:', err);
      toast.error('Failed to join classroom');
      return null;
    } finally {
      setIsJoining(false);
    }
  };

  return {
    isJoining,
    isLookingUp,
    lookupClassroom,
    joinClassroom,
  };
}
