import { useState } from 'react';
import { Copy, Share2, CheckCircle2, MessageCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface InviteCodeDisplayProps {
  code: string;
  classroomName: string;
}

export function InviteCodeDisplay({ code, classroomName }: InviteCodeDisplayProps) {
  const { t } = useTranslation();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteLink = `${window.location.origin}/join/${code}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success(t('classrooms.detail.codeCopied', 'Invite code copied!'));
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast.success(t('classrooms.detail.linkCopied', 'Invite link copied!'));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `Join my classroom "${classroomName}" on Durrah Tutors!\n\nInvite Code: ${code}\nOr click: ${inviteLink}`
    );
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShare = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: t('classrooms.join.title', 'Join Classroom'),
          text: `Join my classroom "${classroomName}" on Durrah Tutors!\n\nCode: ${code}`,
          url: inviteLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: t('classrooms.join.title', 'Join Classroom'),
          text: `Join my classroom "${classroomName}" on Durrah Tutors!\n\nCode: ${code}`,
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t('classrooms.detail.inviteCode', 'Invite Code')}
      </h3>

      {/* Code Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Share this code with students:
            </div>
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
              {code}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="ml-4 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            title={t('classrooms.detail.copyCode', 'Copy Code')}
          >
            {copiedCode ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Link Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Or share this link:
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inviteLink}
            readOnly
            className="flex-1 text-sm text-gray-600 dark:text-gray-300 bg-transparent border-none outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            title={t('classrooms.detail.copyLink', 'Copy Link')}
          >
            {copiedLink ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors font-medium text-sm"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors font-medium text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
