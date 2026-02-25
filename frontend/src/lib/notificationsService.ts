import { supabase } from './supabase';

/**
 * Service for managing push notifications for classrooms
 * Uses Capacitor's PushNotifications API for native support
 */

export interface NotificationPayload {
  type: 'announcement' | 'assignment' | 'grade' | 'attendance' | 'discussion' | 'general';
  title: string;
  message: string;
  classroomId: string;
  relatedId?: string;
  icon?: string;
  sound?: string;
}

/**
 * Send push notification to all students in a classroom
 * Creates notification records in database for in-app display
 */
export async function notifyClassroomStudents(
  classroomId: string,
  payload: Omit<NotificationPayload, 'classroomId'>
) {
  try {
    // Get all active students in the classroom
    const { data: enrollments } = await supabase
      .from('classroom_students')
      .select('student_id')
      .eq('classroom_id', classroomId)
      .eq('status', 'active');

    if (!enrollments || enrollments.length === 0) {
      return; // No students to notify
    }

    // Create notification records for each student
    const notifications = enrollments.map((enrollment: { student_id: string }) => ({
      user_id: enrollment.student_id,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      related_id: payload.relatedId || classroomId,
      is_read: false,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;

    // In a production app, you would also:
    // 1. Call your backend to send FCM messages
    // 2. Use Capacitor PushNotifications API for native notifications
    // For now, we're creating in-app notification records
    console.log(`Created ${enrollments.length} notification records`);
  } catch (error) {
    console.error('Failed to notify classroom students:', error);
  }
}

/**
 * Send notification to specific user
 */
export async function notifyUser(
  userId: string,
  payload: NotificationPayload
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        related_id: payload.relatedId,
        is_read: false,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to notify user:', error);
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete notification:', error);
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  unreadOnly: boolean = false
) {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}
