import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, FileText, MessageSquare, Bell, Settings, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

interface CoTeacher {
  id: string;
  classroom_id: string;
  teacher_id: string;
  role: 'owner' | 'co-teacher' | 'assistant';
  teacher?: {
    full_name: string;
    email: string;
  };
}

interface Resource {
  id: string;
  classroom_id: string;
  title: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'link';
  file_url: string;
  folder: string;
  sort_order: number;
}

interface Discussion {
  id: string;
  classroom_id: string;
  author_id: string;
  title: string;
  content: string;
  is_answered: boolean;
  reply_count?: number;
  created_at: string;
  author?: {
    full_name: string;
  };
}

interface AdvancedFeaturesTabProps {
  classroomId: string;
  isTutor: boolean;
}

export function AdvancedFeaturesTab({ classroomId, isTutor }: AdvancedFeaturesTabProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'teachers' | 'resources' | 'forum'>('teachers');
  const [loading, setLoading] = useState(false);

  // Co-Teachers State
  const [coTeachers, setCoTeachers] = useState<CoTeacher[]>([]);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState<'co-teacher' | 'assistant'>('co-teacher');

  // Resources State
  const [resources, setResources] = useState<Resource[]>([]);
  const [showAddResource, setShowAddResource] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', type: 'pdf', folder: 'General', file_url: '' });

  // Forum State
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [discussionForm, setDiscussionForm] = useState({ title: '', content: '' });

  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string } | null>(null);

  // Load co-teachers
  const loadCoTeachers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('classroom_teachers')
        .select(`
          id, classroom_id, teacher_id, role,
          teacher:teacher_id(full_name, email)
        `)
        .eq('classroom_id', classroomId);

      if (data) setCoTeachers(data as CoTeacher[]);
    } catch (err) {
      console.error('Failed to load co-teachers:', err);
    }
  }, [classroomId]);

  // Load resources
  const loadResources = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('classroom_resources')
        .select('*')
        .eq('classroom_id', classroomId)
        .order('sort_order', { ascending: true });

      if (data) setResources(data as Resource[]);
    } catch (err) {
      console.error('Failed to load resources:', err);
    }
  }, [classroomId]);

  // Load discussions
  const loadDiscussions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('classroom_discussions')
        .select(`
          id, classroom_id, author_id, title, content, is_answered, created_at,
          author:author_id(full_name)
        `)
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false });

      if (data) {
        // Load reply counts
        const discussionsWithCounts = await Promise.all(
          (data as Record<string, unknown>[]).map(async (discussion) => {
            const { count } = await supabase
              .from('classroom_discussion_replies')
              .select('id', { count: 'exact', head: true })
              .eq('discussion_id', discussion.id as string);

            return { ...discussion, reply_count: count || 0 };
          })
        );
        setDiscussions(discussionsWithCounts as Discussion[]);
      }
    } catch (err) {
      console.error('Failed to load discussions:', err);
    }
  }, [classroomId]);

  useEffect(() => {
    loadCoTeachers();
    loadResources();
    loadDiscussions();
  }, [loadCoTeachers, loadResources, loadDiscussions]);

  const handleAddTeacher = async () => {
    if (!newTeacherEmail.trim()) {
      toast.error('Please enter an email');
      return;
    }

    setLoading(true);
    try {
      // Find user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newTeacherEmail)
        .single();

      if (!profile) {
        toast.error('User not found');
        return;
      }

      // Add as co-teacher
      const { error } = await supabase.from('classroom_teachers').insert({
        classroom_id: classroomId,
        teacher_id: profile.id,
        role: newTeacherRole,
      });

      if (error) throw error;
      toast.success('Co-teacher added successfully');
      setNewTeacherEmail('');
      loadCoTeachers();
      setShowAddTeacher(false);
    } catch (err) {
      console.error('Failed to add co-teacher:', err);
      toast.error('Failed to add co-teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async () => {
    if (!resourceForm.title.trim() || !resourceForm.file_url.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const maxOrder = Math.max(...resources.map((r) => r.sort_order), -1);
      const { error } = await supabase.from('classroom_resources').insert({
        classroom_id: classroomId,
        title: resourceForm.title,
        type: resourceForm.type,
        file_url: resourceForm.file_url,
        folder: resourceForm.folder,
        sort_order: maxOrder + 1,
      });

      if (error) throw error;
      toast.success('Resource added successfully');
      setResourceForm({ title: '', type: 'pdf', folder: 'General', file_url: '' });
      loadResources();
      setShowAddResource(false);
    } catch (err) {
      console.error('Failed to add resource:', err);
      toast.error('Failed to add resource');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDiscussion = async () => {
    if (!discussionForm.title.trim() || !discussionForm.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('classroom_discussions').insert({
        classroom_id: classroomId,
        author_id: user?.id,
        title: discussionForm.title,
        content: discussionForm.content,
        is_answered: false,
        is_anonymous: false,
      });

      if (error) throw error;
      toast.success('Discussion created successfully');
      setDiscussionForm({ title: '', content: '' });
      loadDiscussions();
      setShowNewDiscussion(false);
    } catch (err) {
      console.error('Failed to create discussion:', err);
      toast.error('Failed to create discussion');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setLoading(true);
    try {
      if (confirmDelete.type === 'teacher') {
        const { error } = await supabase
          .from('classroom_teachers')
          .delete()
          .eq('id', confirmDelete.id);

        if (error) throw error;
        toast.success('Co-teacher removed');
        loadCoTeachers();
      } else if (confirmDelete.type === 'resource') {
        const { error } = await supabase
          .from('classroom_resources')
          .delete()
          .eq('id', confirmDelete.id);

        if (error) throw error;
        toast.success('Resource deleted');
        loadResources();
      } else if (confirmDelete.type === 'discussion') {
        const { error } = await supabase
          .from('classroom_discussions')
          .delete()
          .eq('id', confirmDelete.id);

        if (error) throw error;
        toast.success('Discussion deleted');
        loadDiscussions();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete item');
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'teachers'
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            Co-Teachers
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'resources'
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            Resources
          </button>
          <button
            onClick={() => setActiveTab('forum')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'forum'
                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Forum
          </button>
        </div>

        {/* Co-Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="space-y-4">
            {isTutor && (
              <button
                onClick={() => setShowAddTeacher(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Co-Teacher
              </button>
            )}

            {coTeachers.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No co-teachers yet
              </div>
            ) : (
              <div className="space-y-2">
                {coTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{teacher.teacher?.full_name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{teacher.teacher?.email}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 capitalize">{teacher.role}</div>
                    </div>
                    {isTutor && (
                      <button
                        onClick={() => setConfirmDelete({ type: 'teacher', id: teacher.id })}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAddTeacher && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <input
                  type="email"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  placeholder="Enter teacher's email..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newTeacherRole}
                  onChange={(e) => setNewTeacherRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="co-teacher">Co-Teacher</option>
                  <option value="assistant">Assistant</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTeacher}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddTeacher(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            {isTutor && (
              <button
                onClick={() => setShowAddResource(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Resource
              </button>
            )}

            {resources.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No resources yet
              </div>
            ) : (
              <div className="space-y-2">
                {resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-blue-600 dark:text-blue-400 hover:underline">
                        {resource.title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{resource.folder}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 capitalize">{resource.type}</div>
                    </div>
                    {isTutor && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setConfirmDelete({ type: 'resource', id: resource.id });
                        }}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </a>
                ))}
              </div>
            )}

            {showAddResource && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <input
                  type="text"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  placeholder="Resource title..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  value={resourceForm.file_url}
                  onChange={(e) => setResourceForm({ ...resourceForm, file_url: e.target.value })}
                  placeholder="File URL..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="doc">Document</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="link">Link</option>
                </select>
                <input
                  type="text"
                  value={resourceForm.folder}
                  onChange={(e) => setResourceForm({ ...resourceForm, folder: e.target.value })}
                  placeholder="Folder name..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddResource}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddResource(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Forum Tab */}
        {activeTab === 'forum' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowNewDiscussion(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start Discussion
            </button>

            {discussions.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No discussions yet
              </div>
            ) : (
              <div className="space-y-3">
                {discussions.map((discussion) => (
                  <div
                    key={discussion.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{discussion.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{discussion.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <span>{discussion.author?.full_name}</span>
                          <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                          <span>{discussion.reply_count} replies</span>
                          {discussion.is_answered && <span className="text-green-600 dark:text-green-400">✓ Answered</span>}
                        </div>
                      </div>
                      {isTutor && (
                        <button
                          onClick={() => setConfirmDelete({ type: 'discussion', id: discussion.id })}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showNewDiscussion && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <input
                  type="text"
                  value={discussionForm.title}
                  onChange={(e) => setDiscussionForm({ ...discussionForm, title: e.target.value })}
                  placeholder="Discussion title..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={discussionForm.content}
                  onChange={(e) => setDiscussionForm({ ...discussionForm, content: e.target.value })}
                  placeholder="Your question or topic..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleStartDiscussion}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Post
                  </button>
                  <button
                    onClick={() => setShowNewDiscussion(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!confirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
