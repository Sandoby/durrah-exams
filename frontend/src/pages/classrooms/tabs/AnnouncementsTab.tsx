import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Plus, MessageCircle, Trash2, Loader2, Pin } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { notifyClassroomStudents } from '../../../lib/notificationsService';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

interface Announcement {
  id: string;
  classroom_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    full_name: string;
    email: string;
  };
  comments?: AnnouncementComment[];
  comment_count?: number;
}

interface AnnouncementComment {
  id: string;
  announcement_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string;
  };
}

interface AnnouncementsTabProps {
  classroomId: string;
  isTutor: boolean;
}

export function AnnouncementsTab({ classroomId, isTutor }: AnnouncementsTabProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classroom_announcements')
        .select(`
          id, classroom_id, author_id, title, content, is_pinned, created_at, updated_at,
          author:author_id(full_name, email)
        `)
        .eq('classroom_id', classroomId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Load comment counts and comments for each announcement
        const announcementsWithComments = await Promise.all(
          (data as Record<string, unknown>[]).map(async (announcement) => {
            const { data: comments, count } = await supabase
              .from('classroom_announcement_comments')
              .select(`
                id, announcement_id, author_id, content, created_at,
                author:author_id(full_name)
              `, { count: 'exact' })
              .eq('announcement_id', announcement.id as string)
              .order('created_at', { ascending: true });

            return {
              ...announcement,
              comment_count: count || 0,
              comments: comments || [],
            };
          })
        );
        setAnnouncements(announcementsWithComments as Announcement[]);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
      toast.error(t('classrooms.detail.announcementsTab.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [classroomId, t]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error(t('classrooms.detail.announcementsTab.fillRequired'));
      return;
    }

    setCreating(true);
    try {
      const { data: newAnnouncement, error } = await supabase.from('classroom_announcements').insert({
        classroom_id: classroomId,
        author_id: user?.id,
        title: formData.title,
        content: formData.content,
        is_pinned: false,
      }).select().single();

      if (error) throw error;

      // Send notifications to all students in the classroom
      await notifyClassroomStudents(classroomId, {
        type: 'announcement',
        title: formData.title,
        message: 'New announcement: ' + formData.title,
        relatedId: newAnnouncement?.id || classroomId,
      });

      toast.success(t('classrooms.detail.announcementsTab.created'));
      setFormData({ title: '', content: '' });
      setShowCreateModal(false);
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to create announcement:', err);
      toast.error(t('classrooms.detail.announcementsTab.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from('classroom_announcements')
        .delete()
        .eq('id', confirmDelete);

      if (error) throw error;
      toast.success(t('classrooms.detail.announcementsTab.deleted'));
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      toast.error(t('classrooms.detail.announcementsTab.deleteFailed'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleTogglePin = async (announcementId: string, currentPin: boolean) => {
    try {
      const { error } = await supabase
        .from('classroom_announcements')
        .update({ is_pinned: !currentPin })
        .eq('id', announcementId);

      if (error) throw error;
      toast.success(currentPin ? t('classrooms.detail.announcementsTab.unpinned') : t('classrooms.detail.announcementsTab.pinned'));
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      toast.error(t('classrooms.detail.announcementsTab.pinFailed'));
    }
  };

  const toggleComments = (announcementId: string) => {
    const newSet = new Set(expandedComments);
    if (newSet.has(announcementId)) {
      newSet.delete(announcementId);
    } else {
      newSet.add(announcementId);
    }
    setExpandedComments(newSet);
  };

  const handlePostComment = async (announcementId: string) => {
    const commentText = newComment[announcementId]?.trim();
    if (!commentText) {
      toast.error(t('classrooms.detail.announcementsTab.enterComment'));
      return;
    }

    setPostingComment((prev) => ({ ...prev, [announcementId]: true }));
    try {
      const { error } = await supabase.from('classroom_announcement_comments').insert({
        announcement_id: announcementId,
        author_id: user?.id,
        content: commentText,
      });

      if (error) throw error;
      setNewComment((prev) => ({ ...prev, [announcementId]: '' }));
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to post comment:', err);
      toast.error(t('classrooms.detail.announcementsTab.commentFailed'));
    } finally {
      setPostingComment((prev) => ({ ...prev, [announcementId]: false }));
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('classroom_announcement_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success(t('classrooms.detail.announcementsTab.commentDeleted'));
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to delete comment:', err);
      toast.error(t('classrooms.detail.announcementsTab.commentDeleteFailed'));
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('classrooms.detail.announcementsTab.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('classrooms.detail.announcementsTab.description')}
            </p>
          </div>
          {isTutor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('classrooms.detail.announcementsTab.create')}
            </button>
          )}
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Bell className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-900 dark:text-white font-medium mb-2">
              {t('classrooms.detail.announcementsTab.noAnnouncements')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isTutor ? t('classrooms.detail.announcementsTab.createFirstAnnouncement') : t('classrooms.detail.announcementsTab.noAnnouncementsStudent')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  {/* Announcement Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {announcement.title}
                        </h3>
                        {announcement.is_pinned && (
                          <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{announcement.author?.full_name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {isTutor && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePin(announcement.id, announcement.is_pinned)}
                          title={announcement.is_pinned ? 'Unpin' : 'Pin'}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(announcement.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4 line-clamp-3">
                    {announcement.content}
                  </div>

                  {/* Comments Button */}
                  <button
                    onClick={() => toggleComments(announcement.id)}
                    className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {announcement.comment_count || 0} Comments
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments.has(announcement.id) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/30 space-y-4">
                    {/* Comments List */}
                    {announcement.comments && announcement.comments.length > 0 && (
                      <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
                        {announcement.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {comment.author?.full_name || 'Anonymous'}
                                </div>
                                {(isTutor || user?.id === comment.author_id) && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New Comment Input */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <textarea
                          value={newComment[announcement.id] || ''}
                          onChange={(e) =>
                            setNewComment((prev) => ({
                              ...prev,
                              [announcement.id]: e.target.value,
                            }))
                          }
                          placeholder={t('classrooms.detail.announcementsTab.addComment')}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <button
                          onClick={() => handlePostComment(announcement.id)}
                          disabled={postingComment[announcement.id]}
                          className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                        >
                          {postingComment[announcement.id] ? 'Posting...' : 'Post Comment'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('classrooms.detail.announcementsTab.createAnnouncement')}
              </h2>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.detail.announcementsTab.title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.detail.announcementsTab.content')} *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your announcement..."
                  rows={5}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? t('classrooms.detail.announcementsTab.creating') : t('classrooms.detail.announcementsTab.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  {t('classrooms.detail.announcementsTab.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!confirmDelete}
        title={t('classrooms.detail.announcementsTab.deleteTitle')}
        message={t('classrooms.detail.announcementsTab.deleteConfirm')}
        confirmLabel={t('classrooms.detail.announcementsTab.delete')}
        variant="danger"
        onConfirm={handleDeleteAnnouncement}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
