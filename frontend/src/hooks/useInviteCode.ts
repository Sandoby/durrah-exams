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

      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          subject,
          grade_level,
          academic_year,
          description,
          color,
          student_count,
          is_archived,
          settings,
          tutor:profiles!tutor_id (
            full_name
          )
        `)
        .eq('invite_code', inviteCode.toUpperCase().trim())
        .single();

      if (classroomError || !classroom) {
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
        invite_code: inviteCode.toUpperCase().trim(),
        tutor_name: (classroom.tutor as any)?.full_name || 'Unknown',
        student_count: classroom.student_count || 0,
        settings: classroom.settings,
      };
    } catch (err) {
      const error = err as Error;
      console.error('Error looking up classroom:', error);
      toast.error('Failed to lookup classroom');
      return null;
    } finally {
      setIsLookingUp(false);
    }
  };

  const joinClassroom = async (inviteCode: string): Promise<JoinResult | null> => {
    try {
      setIsJoining(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in first');
        return null;
      }

      // Lookup classroom
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase().trim())
        .single();

      if (classroomError || !classroom) {
        toast.error('Invalid invite code');
        return null;
      }

      // Validate not archived
      if (classroom.is_archived) {
        toast.error('This classroom is no longer accepting students');
        return null;
      }

      // Check capacity
      const maxCapacity = classroom.settings?.max_capacity || 100;
      if (classroom.student_count >= maxCapacity) {
        toast.error('This classroom is full');
        return null;
      }

      // Check if already enrolled
      const { data: existing } = await supabase
        .from('classroom_students')
        .select('id, status')
        .eq('classroom_id', classroom.id)
        .eq('student_id', user.id)
        .single();

      if (existing) {
        if (existing.status === 'active') {
          toast.error("You're already in this classroom");
        } else if (existing.status === 'pending') {
          toast.success('Your enrollment is pending approval from the tutor', { icon: 'ℹ️' });
        } else {
          toast.error('You were previously removed from this classroom');
        }
        return null;
      }

      // Determine status based on settings
      const autoApprove = classroom.settings?.auto_approve_students ?? true;
      const enrollmentStatus = autoApprove ? 'active' : 'pending';

      // Insert enrollment
      const { error: enrollError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: classroom.id,
          student_id: user.id,
          status: enrollmentStatus,
          enrollment_method: 'invite_code',
        });

      if (enrollError) throw enrollError;

      // Update user role to student if not set
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile?.role) {
        await supabase
          .from('profiles')
          .update({ role: 'student' })
          .eq('id', user.id);
      }

      // Create notification for tutor
      await supabase.from('notifications').insert({
        user_id: classroom.tutor_id,
        type: 'student_joined',
        title: 'New Student Joined',
        message: `A student has ${autoApprove ? 'joined' : 'requested to join'} ${classroom.name}`,
        read: false,
        metadata: {
          classroom_id: classroom.id,
          student_id: user.id,
          student_email: user.email,
        },
      });

      if (autoApprove) {
        toast.success(`Successfully joined ${classroom.name}!`);
      } else {
        toast.success('Your enrollment request has been sent to the tutor', { icon: 'ℹ️' });
      }

      return {
        success: true,
        classroom: {
          id: classroom.id,
          name: classroom.name,
          subject: classroom.subject || '',
        },
        status: enrollmentStatus,
      };
    } catch (err) {
      const error = err as Error;
      console.error('Error joining classroom:', error);
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
