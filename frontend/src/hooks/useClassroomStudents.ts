import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ClassroomStudent, BulkImportRow, BulkImportResult } from '../types/classroom';
import toast from 'react-hot-toast';

interface UseClassroomStudentsOptions {
  status?: 'active' | 'pending' | 'suspended' | 'removed';
  search?: string;
}

export function useClassroomStudents(classroomId: string) {
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStudents = async (options?: UseClassroomStudentsOptions) => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('classroom_students')
        .select(`
          *,
          profile:profiles!student_id (
            full_name,
            email,
            avatar_url,
            grade_level,
            school_name
          )
        `)
        .eq('classroom_id', classroomId)
        .order('enrolled_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let results = data || [];

      // Client-side search filter if provided
      if (options?.search && options.search.trim()) {
        const searchLower = options.search.toLowerCase();
        results = results.filter((student: any) => {
          const name = student.profile?.full_name?.toLowerCase() || '';
          const email = student.profile?.email?.toLowerCase() || '';
          return name.includes(searchLower) || email.includes(searchLower);
        });
      }

      setStudents(results as ClassroomStudent[]);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const addStudentByEmail = async (
    email: string
  ): Promise<{ success: boolean; status: string }> => {
    try {
      // Lookup user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (userError || !userData) {
        toast.error('Student not found. They need to create an account first.');
        return { success: false, status: 'not_found' };
      }

      // Check if already enrolled
      const { data: existing } = await supabase
        .from('classroom_students')
        .select('id, status')
        .eq('classroom_id', classroomId)
        .eq('student_id', userData.id)
        .single();

      if (existing) {
        toast.error('Student is already enrolled in this classroom');
        return { success: false, status: 'already_enrolled' };
      }

      // Get classroom settings for auto-approve
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('settings')
        .eq('id', classroomId)
        .single();

      const autoApprove = classroom?.settings?.auto_approve_students ?? true;

      // Insert enrollment
      const { error: insertError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: classroomId,
          student_id: userData.id,
          status: autoApprove ? 'active' : 'pending',
          enrollment_method: 'manual',
        });

      if (insertError) throw insertError;

      // Update role to student if not set
      if (!userData.role || userData.role === 'tutor') {
        // Don't override tutor role - they can be both
      } else {
        await supabase
          .from('profiles')
          .update({ role: 'student' })
          .eq('id', userData.id);
      }

      toast.success(`${userData.full_name || email} added to classroom!`);
      await fetchStudents(); // Refresh list
      return { success: true, status: autoApprove ? 'active' : 'pending' };
    } catch (err) {
      const error = err as Error;
      console.error('Error adding student:', error);
      toast.error('Failed to add student');
      return { success: false, status: 'error' };
    }
  };

  const bulkImportStudents = async (
    rows: BulkImportRow[]
  ): Promise<BulkImportResult> => {
    const result: BulkImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is headers and arrays are 0-indexed

      if (!row.email || !row.email.trim()) {
        result.errors.push({ row: rowNum, message: 'Email is required' });
        continue;
      }

      try {
        // Lookup user by email
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.email.toLowerCase().trim())
          .single();

        if (userError || !userData) {
          result.skipped++;
          result.errors.push({ row: rowNum, message: 'User not found' });
          continue;
        }

        // Check if already enrolled
        const { data: existing } = await supabase
          .from('classroom_students')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('student_id', userData.id)
          .single();

        if (existing) {
          result.skipped++;
          continue;
        }

        // Insert enrollment
        const { error: insertError } = await supabase
          .from('classroom_students')
          .insert({
            classroom_id: classroomId,
            student_id: userData.id,
            status: 'active',
            enrollment_method: 'csv_import',
          });

        if (insertError) throw insertError;

        result.imported++;
      } catch (err) {
        result.errors.push({ row: rowNum, message: (err as Error).message });
      }
    }

    await fetchStudents(); // Refresh list
    return result;
  };

  const updateStudentStatus = async (
    studentId: string,
    status: 'active' | 'suspended' | 'removed'
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('classroom_students')
        .update({ status })
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId);

      if (updateError) throw updateError;

      const statusText = status === 'active' ? 'activated' : status === 'suspended' ? 'suspended' : 'removed';
      toast.success(`Student ${statusText}`);
      await fetchStudents(); // Refresh list
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error updating student status:', error);
      toast.error('Failed to update student status');
      return false;
    }
  };

  const approveStudent = async (studentId: string): Promise<boolean> => {
    return updateStudentStatus(studentId, 'active');
  };

  const removeStudent = async (studentId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId);

      if (deleteError) throw deleteError;

      toast.success('Student removed from classroom');
      await fetchStudents(); // Refresh list
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error removing student:', error);
      toast.error('Failed to remove student');
      return false;
    }
  };

  const transferStudent = async (
    studentId: string,
    targetClassroomId: string,
    keepOriginal: boolean = false
  ): Promise<boolean> => {
    try {
      // Insert into target classroom
      const { error: insertError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: targetClassroomId,
          student_id: studentId,
          status: 'active',
          enrollment_method: 'manual',
        });

      if (insertError) throw insertError;

      // Remove from current classroom if not keeping
      if (!keepOriginal) {
        await supabase
          .from('classroom_students')
          .delete()
          .eq('classroom_id', classroomId)
          .eq('student_id', studentId);
      }

      toast.success(
        keepOriginal ? 'Student added to new classroom' : 'Student transferred successfully'
      );
      await fetchStudents(); // Refresh list
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error transferring student:', error);
      toast.error('Failed to transfer student');
      return false;
    }
  };

  useEffect(() => {
    if (classroomId) {
      fetchStudents();
    }
  }, [classroomId]);

  return {
    students,
    isLoading,
    error,
    fetchStudents,
    addStudentByEmail,
    bulkImportStudents,
    updateStudentStatus,
    approveStudent,
    removeStudent,
    transferStudent,
  };
}
