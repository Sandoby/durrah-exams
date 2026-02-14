import { useState, useEffect } from 'react';
import {
  Mail, Send, Eye, AlertTriangle, CheckCircle, XCircle,
  Loader2, Sparkles, FileText, Zap, Edit, Wand2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { EmailVisualBuilder, blocksToHtml } from './EmailVisualBuilder';
import type { EmailBlock } from './EmailVisualBuilder';

interface User {
  id: string;
  email: string;
  full_name?: string;
  subscription_status?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'transactional' | 'announcement' | 'engagement';
  subject: string;
  preheader: string;
  bodyHtml: string;
  accentColor: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface SpamAnalysis {
  score: number;
  level: 'excellent' | 'good' | 'warning' | 'critical';
  issues: string[];
  suggestions: string[];
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'engagement',
    description: 'Warm welcome for new users',
    subject: 'Welcome to Durrah Tutors!',
    preheader: 'Start your learning journey with us',
    bodyHtml: `
      <p>Welcome to <strong>Durrah Tutors</strong>!</p>
      <p>We're thrilled to have you join our community of dedicated learners and educators. Your account is now active and ready to use.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Explore our extensive exam library</li>
        <li>Create your first custom exam</li>
        <li>Track your progress with detailed analytics</li>
      </ul>
      <p>If you have any questions, our support team is here to help!</p>
    `,
    accentColor: '#4b47d6',
    ctaText: 'Get Started',
    ctaUrl: 'https://durrahtutors.com/dashboard'
  },
  {
    id: 'subscription-reminder',
    name: 'Subscription Expiring',
    category: 'transactional',
    description: 'Remind users about expiring subscription',
    subject: 'Your subscription is expiring soon',
    preheader: 'Renew now to keep your access',
    bodyHtml: `
      <p>Hello!</p>
      <p>This is a friendly reminder that your <strong>Durrah Tutors</strong> subscription will expire in <strong>3 days</strong>.</p>
      <p>To continue enjoying:</p>
      <ul>
        <li>Unlimited exam access</li>
        <li>Advanced analytics</li>
        <li>Priority support</li>
        <li>Custom exam creation</li>
      </ul>
      <p>Renew your subscription now to avoid any interruption in service.</p>
    `,
    accentColor: '#f59e0b',
    ctaText: 'Renew Now',
    ctaUrl: 'https://durrahtutors.com/subscription'
  },
  {
    id: 'payment-success',
    name: 'Payment Confirmation',
    category: 'transactional',
    description: 'Confirm successful payment',
    subject: 'Payment received - Thank you!',
    preheader: 'Your subscription has been activated',
    bodyHtml: `
      <p>Thank you for your payment!</p>
      <p>We've successfully processed your payment and your subscription is now <strong>active</strong>.</p>
      <p><strong>Subscription Details:</strong></p>
      <ul>
        <li>Plan: Premium Monthly</li>
        <li>Amount: 299 EGP</li>
        <li>Next billing: 30 days from now</li>
      </ul>
      <p>You now have full access to all premium features. Happy learning!</p>
    `,
    accentColor: '#10b981',
    ctaText: 'View Dashboard',
    ctaUrl: 'https://durrahtutors.com/dashboard'
  },
  {
    id: 'new-feature',
    name: 'New Feature Announcement',
    category: 'announcement',
    description: 'Announce new features to users',
    subject: 'Exciting new features just launched!',
    preheader: 'Check out what\'s new on Durrah Tutors',
    bodyHtml: `
      <p>We've been working hard to bring you something special!</p>
      <p><strong>What's New:</strong></p>
      <ul>
        <li><strong>AI-Powered Study Assistant</strong> - Get personalized study recommendations</li>
        <li><strong>Live Progress Tracking</strong> - Monitor your improvement in real-time</li>
        <li><strong>Mobile App Updates</strong> - Faster and smoother experience</li>
      </ul>
      <p>These features are available now for all premium subscribers. Try them out today!</p>
    `,
    accentColor: '#8b5cf6',
    ctaText: 'Explore New Features',
    ctaUrl: 'https://durrahtutors.com/whats-new'
  },
  {
    id: 'special-offer',
    name: 'Special Offer',
    category: 'marketing',
    description: 'Limited-time promotional offer',
    subject: '🎉 Special Offer: 30% Off Premium',
    preheader: 'Limited time offer - Don\'t miss out!',
    bodyHtml: `
      <p><strong>Exclusive Offer Just For You!</strong></p>
      <p>For a limited time, get <strong>30% off</strong> our Premium subscription!</p>
      <p><strong>Premium includes:</strong></p>
      <ul>
        <li>Unlimited access to all exams</li>
        <li>Advanced analytics and insights</li>
        <li>Custom exam builder</li>
        <li>Priority support</li>
        <li>Ad-free experience</li>
      </ul>
      <p>This offer ends in 48 hours. Don't miss out on this amazing deal!</p>
    `,
    accentColor: '#ef4444',
    ctaText: 'Claim Offer Now',
    ctaUrl: 'https://durrahtutors.com/offer'
  },
  {
    id: 're-engagement',
    name: 'We Miss You',
    category: 'engagement',
    description: 'Re-engage inactive users',
    subject: 'We miss you! Come back and get 20% off',
    preheader: 'Special welcome back offer',
    bodyHtml: `
      <p>Hey there!</p>
      <p>We noticed you haven't been around lately. We miss you and want to welcome you back!</p>
      <p><strong>Here's what you've been missing:</strong></p>
      <ul>
        <li>New exam categories added</li>
        <li>Improved user interface</li>
        <li>Better mobile experience</li>
        <li>New community features</li>
      </ul>
      <p>As a welcome back gift, enjoy <strong>20% off</strong> your next subscription!</p>
    `,
    accentColor: '#06b6d4',
    ctaText: 'Welcome Me Back',
    ctaUrl: 'https://durrahtutors.com/welcome-back'
  },
  {
    id: 'exam-reminder',
    name: 'Upcoming Exam Reminder',
    category: 'engagement',
    description: 'Remind about scheduled exams',
    subject: 'Reminder: Your exam starts tomorrow',
    preheader: 'Get ready for your scheduled exam',
    bodyHtml: `
      <p>Quick reminder!</p>
      <p>You have an exam scheduled for <strong>tomorrow at 10:00 AM</strong>.</p>
      <p><strong>Exam Details:</strong></p>
      <ul>
        <li>Subject: Physics - Mechanics</li>
        <li>Duration: 60 minutes</li>
        <li>Questions: 40</li>
      </ul>
      <p><strong>Preparation Tips:</strong></p>
      <ul>
        <li>Review your study materials</li>
        <li>Get a good night's sleep</li>
        <li>Have a quiet space ready</li>
      </ul>
      <p>Good luck! You've got this!</p>
    `,
    accentColor: '#f59e0b',
    ctaText: 'View Exam Details',
    ctaUrl: 'https://durrahtutors.com/exams'
  },
  {
    id: 'achievement',
    name: 'Achievement Unlocked',
    category: 'engagement',
    description: 'Celebrate user achievements',
    subject: '🏆 Congratulations! Achievement unlocked',
    preheader: 'You\'ve reached a new milestone',
    bodyHtml: `
      <p><strong>Congratulations!</strong></p>
      <p>You've just unlocked a new achievement: <strong>"100 Exams Completed"</strong></p>
      <p>Your dedication to learning is truly impressive! Here's what you've accomplished:</p>
      <ul>
        <li>✓ Completed 100 practice exams</li>
        <li>✓ Average score: 87%</li>
        <li>✓ Study streak: 15 days</li>
        <li>✓ Hours studied: 42</li>
      </ul>
      <p>Keep up the amazing work. You're on your way to mastery!</p>
    `,
    accentColor: '#eab308',
    ctaText: 'View My Progress',
    ctaUrl: 'https://durrahtutors.com/progress'
  },
  {
    id: 'newsletter',
    name: 'Monthly Newsletter',
    category: 'marketing',
    description: 'Monthly updates and tips',
    subject: 'Your Monthly Durrah Digest',
    preheader: 'Study tips, updates, and more',
    bodyHtml: `
      <p>Welcome to your monthly newsletter!</p>
      <p><strong>This Month's Highlights:</strong></p>
      <ul>
        <li><strong>Study Tip:</strong> Use spaced repetition to improve retention by 200%</li>
        <li><strong>New Content:</strong> 50+ new Chemistry exams added</li>
        <li><strong>Community:</strong> Over 10,000 students joined this month!</li>
      </ul>
      <p><strong>Upcoming Events:</strong></p>
      <ul>
        <li>Live Q&A Session - March 15th</li>
        <li>Study Marathon Challenge - March 20th</li>
      </ul>
      <p>Stay tuned for more updates next month!</p>
    `,
    accentColor: '#8b5cf6',
    ctaText: 'Read Full Newsletter',
    ctaUrl: 'https://durrahtutors.com/newsletter'
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    category: 'transactional',
    description: 'Password reset confirmation',
    subject: 'Password reset request',
    preheader: 'Click to reset your password',
    bodyHtml: `
      <p>We received a request to reset your password.</p>
      <p>If you made this request, click the button below to reset your password. This link will expire in <strong>30 minutes</strong>.</p>
      <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      <p><strong>Security Tips:</strong></p>
      <ul>
        <li>Never share your password with anyone</li>
        <li>Use a unique password for each account</li>
        <li>Enable two-factor authentication when available</li>
      </ul>
    `,
    accentColor: '#ef4444',
    ctaText: 'Reset Password',
    ctaUrl: 'https://durrahtutors.com/reset-password'
  }
];

// Comprehensive spam trigger words and phrases
const SPAM_TRIGGERS = {
  critical: [
    'viagra', 'cialis', 'casino', 'lottery', 'winner', 'congratulations you won',
    'claim your prize', 'nigerian prince', 'miracle cure', 'weight loss guaranteed',
    'make money fast', 'work from home earn', 'get rich quick', 'MLM', 'forex trading guaranteed'
  ],
  high: [
    'free money', 'earn $$$', 'limited time', 'act now', 'urgent action required',
    'you have been selected', 'click here now', 'order now', 'buy now',
    'undisclosed recipient', 'hidden charges', 'serious cash', 'additional income'
  ],
  medium: [
    'FREE', 'CLICK NOW', 'BUY DIRECT', 'DOUBLE YOUR', 'GUARANTEE',
    'NO COST', 'PRIZE', 'WINNER', 'URGENT', '100% FREE',
    'limited time offer', 'special promotion', 'dear friend', 'this is not spam'
  ],
  low: [
    'discount', 'save big', 'offer', 'deal', 'bonus', 'gift',
    'exclusive', 'limited offer', 'hurry', 'last chance', 'sale'
  ]
};

export function EmailManager({ users }: { users: User[] }) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(EMAIL_TEMPLATES[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [emailBlocks, setEmailBlocks] = useState<EmailBlock[]>([]);
  const [editorMode, setEditorMode] = useState<'simple' | 'visual'>('simple');
  const [targetUserId, setTargetUserId] = useState('all');
  const [customUserId, setCustomUserId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [spamAnalysis, setSpamAnalysis] = useState<SpamAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'templates'>('compose');
  const [selectedApiKey, setSelectedApiKey] = useState<'main' | 'security'>('main');
  const [senderEmail, setSenderEmail] = useState('');
  const [accentColor, setAccentColor] = useState('#4b47d6');

  // Analyze email for spam triggers
  const analyzeSpam = (subject: string, body: string): SpamAnalysis => {
    const fullText = `${subject} ${body}`.toLowerCase();
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for critical triggers
    SPAM_TRIGGERS.critical.forEach(trigger => {
      if (fullText.includes(trigger.toLowerCase())) {
        score -= 30;
        issues.push(`Critical spam word detected: "${trigger}"`);
      }
    });

    // Check for high-risk triggers
    SPAM_TRIGGERS.high.forEach(trigger => {
      if (fullText.includes(trigger.toLowerCase())) {
        score -= 15;
        issues.push(`High-risk phrase: "${trigger}"`);
      }
    });

    // Check for medium-risk triggers
    SPAM_TRIGGERS.medium.forEach(trigger => {
      if (fullText.includes(trigger.toLowerCase())) {
        score -= 8;
        issues.push(`Medium-risk word: "${trigger}"`);
      }
    });

    // Check for low-risk triggers
    SPAM_TRIGGERS.low.forEach(trigger => {
      if (fullText.includes(trigger.toLowerCase())) {
        score -= 3;
        issues.push(`Low-risk marketing word: "${trigger}"`);
      }
    });

    // Check for excessive capitalization
    const capsWords = (subject + ' ' + body).match(/\b[A-Z]{3,}\b/g);
    if (capsWords && capsWords.length > 3) {
      score -= 10;
      issues.push(`Excessive capitalization detected (${capsWords.length} words)`);
      suggestions.push('Avoid using too many ALL CAPS words');
    }

    // Check for excessive exclamation marks
    const exclamations = (subject + ' ' + body).match(/!/g);
    if (exclamations && exclamations.length > 3) {
      score -= 8;
      issues.push(`Too many exclamation marks (${exclamations.length})`);
      suggestions.push('Limit exclamation marks to 1-2 per email');
    }

    // Check for dollar signs
    const dollarSigns = (subject + ' ' + body).match(/\$+/g);
    if (dollarSigns && dollarSigns.length > 2) {
      score -= 5;
      issues.push('Multiple dollar signs detected');
      suggestions.push('Spell out currency amounts when possible');
    }

    // Check subject line length
    if (subject.length > 60) {
      score -= 5;
      issues.push('Subject line too long (over 60 characters)');
      suggestions.push('Keep subject lines under 50 characters for better deliverability');
    }

    // Positive checks
    if (!issues.length) {
      suggestions.push('Great! No spam triggers detected');
    }

    if (score < 0) score = 0;

    let level: 'excellent' | 'good' | 'warning' | 'critical';
    if (score >= 90) level = 'excellent';
    else if (score >= 70) level = 'good';
    else if (score >= 50) level = 'warning';
    else level = 'critical';

    return { score, level, issues, suggestions };
  };

  // Update spam analysis when content changes
  useEffect(() => {
    const subject = customSubject || selectedTemplate.subject;
    const body = editorMode === 'visual' ? blocksToHtml(emailBlocks) : (customBody || selectedTemplate.bodyHtml);
    setSpamAnalysis(analyzeSpam(subject,  body));
  }, [customSubject, customBody, emailBlocks, selectedTemplate, editorMode]);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template);
   setCustomSubject(template.subject);
    setCustomBody(template.bodyHtml);
    setAccentColor(template.accentColor);
    // Reset visual blocks when loading template
    setEmailBlocks([]);
  };

  const generatePreviewHtml = () => {
    const subject = customSubject || selectedTemplate.subject;
    const body = editorMode === 'visual' ? blocksToHtml(emailBlocks) : (customBody || selectedTemplate.bodyHtml);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 20px; background: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          </style>
        </head>
        <body>
          ${generateEmailHtml(subject, body, accentColor)}
        </body>
      </html>
    `;
  };

  const generateEmailHtml = (subject: string, bodyHtml: string, color: string) => {
    const year = new Date().getFullYear();

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f7;">
        <tr>
          <td align="center" style="padding:30px 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
              <tr>
                <td style="padding:0 0 14px 0;background:#e5e7f0;border-radius:14px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#e5e7f0;border-radius:14px;">
                    <tr>
                      <td valign="middle" style="padding:20px 0 20px 24px;width:100px;">
                        <img src="https://durrahtutors.com/logo.png" width="80" height="80" alt="Durrah Tutors Logo" style="display:block;border:0;outline:none;text-decoration:none;border-radius:16px;" />
                      </td>
                      <td valign="middle" style="padding:20px 24px 20px 12px;">
                        <span style="font-size:38px;line-height:1.05;font-weight:700;letter-spacing:-0.4px;color:#4b47d6;">Durrah</span>
                        <span style="display:inline-block;margin-left:6px;font-size:38px;line-height:1.05;font-weight:400;letter-spacing:-0.2px;color:#8892ae;">for Tutors</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;border-radius:18px;padding:28px 24px;border:1px solid #e8e8ed;">
                  <div style="font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.2px;margin:0 0 16px 0;color:#1d1d1f;">
                    ${subject}
                  </div>
                  <div style="font-size:15px;line-height:22px;color:#424245;">
                    ${bodyHtml}
                  </div>
                  ${selectedTemplate.ctaText && editorMode === 'simple' ? `
                    <div style="margin-top:24px;">
                      <a href="${selectedTemplate.ctaUrl || '#'}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">
                        ${selectedTemplate.ctaText}
                      </a>
                    </div>
                  ` : ''}
                </td>
              </tr>
              <tr>
                <td style="padding:14px 6px 0 6px;color:#6e6e73;text-align:center;">
                  <div style="font-size:12px;line-height:18px;">This is an automated message. Please do not reply.</div>
                  <div style="font-size:12px;line-height:18px;margin-top:8px;">
                    <a href="https://durrahtutors.com" style="color:#0066cc;text-decoration:none;">Website</a>
                    <span style="color:#c7c7cc;">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
                    <a href="https://durrahtutors.com/privacy" style="color:#0066cc;text-decoration:none;">Privacy</a>
                  </div>
                  <div style="font-size:12px;line-height:18px;margin-top:10px;color:#8e8e93;">
                    © ${year} Durrah for Tutors. All rights reserved.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  };

  const handleSendEmail = async () => {
    if (!customSubject && !selectedTemplate.subject) {
      toast.error('Please enter a subject');
      return;
    }

    const finalBody = editorMode === 'visual' ? blocksToHtml(emailBlocks) : customBody;

    if (!finalBody && !selectedTemplate.bodyHtml) {
      toast.error('Please enter email content');
      return;
    }

    if (!senderEmail) {
      toast.error('Please enter a sender email address');
      return;
    }

    if (!senderEmail.endsWith('@durrahtutors.com')) {
      toast.error('Sender email must be from @durrahtutors.com domain');
      return;
    }

    if (spamAnalysis && spamAnalysis.score < 50) {
      const confirm = window.confirm(
        `Warning: This email has a low spam score (${spamAnalysis.score}/100). It may not be delivered properly. Continue anyway?`
      );
      if (!confirm) return;
    }

    setIsSending(true);

    try {
      const recipients = targetUserId === 'all'
        ? users
        : targetUserId === 'custom'
        ? [{ id: customUserId, email: customUserId }]
        : [users.find(u => u.id === targetUserId)!].filter(Boolean);

      if (!recipients.length) {
        toast.error('No valid recipients selected');
        setIsSending(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Send emails using the new campaign email function
      for (const user of recipients) {
        try {
          const { error } = await supabase.functions.invoke('send-campaign-email', {
            body: {
              email: user.email || user.id,
              senderEmail: senderEmail,
              subject: customSubject || selectedTemplate.subject,
              bodyHtml: finalBody || selectedTemplate.bodyHtml,
              accentColor: accentColor,
              apiKey: selectedApiKey,
              userId: user.id
            }
          });

          if (error) {
            console.error(`Failed to send to ${user.email}:`, error);
            failCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error sending to ${user.email}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Email sent successfully to ${successCount} recipient(s) using ${selectedApiKey} API key!`);
      }

      if (failCount > 0) {
        toast.error(`Failed to send to ${failCount} recipient(s)`);
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-indigo-600" />
            Email Campaign Manager
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create, preview, and send beautiful emails with spam detection
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-1 flex gap-1 w-fit">
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'compose'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Compose
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'templates'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          Templates ({EMAIL_TEMPLATES.length})
        </button>
      </div>

      {activeTab === 'templates' ? (
        /* Template Gallery */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EMAIL_TEMPLATES.map((template) => (
            <div
              key={template.id}
              onClick={() => {
                handleTemplateSelect(template);
                setActiveTab('compose');
              }}
              className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-800 p-5 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer hover:shadow-lg group"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: template.accentColor }}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  template.category === 'marketing' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  template.category === 'transactional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  template.category === 'announcement' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  {template.category}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {template.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {template.description}
              </p>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{template.subject}</p>
              </div>

              <button className="mt-3 w-full py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                Use Template
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Compose View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-6">
            {/* API Key & Sender Selection */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-600" />
                Email Service Configuration
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Resend API Key
                  </label>
                  <select
                    value={selectedApiKey}
                    onChange={(e) => {
                      const key = e.target.value as 'main' | 'security';
                      setSelectedApiKey(key);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  >
                    <option value="main">Main API Key (RESEND_API_KEY)</option>
                    <option value="security">Security API Key (RESEND_.com_API_KEY)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {selectedApiKey === 'main'
                      ? 'Used for general emails, marketing, and notifications'
                      : 'Used for security-related emails (password resets, OTP)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Sender Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="info@durrahtutors.com"
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 ${
                        senderEmail && !senderEmail.endsWith('@durrahtutors.com')
                          ? 'border-red-500 focus:ring-red-500/20'
                          : 'border-gray-200 dark:border-gray-700 focus:ring-indigo-500/20'
                      } rounded-xl outline-none focus:ring-2 text-gray-900 dark:text-white`}
                    />
                    {senderEmail && senderEmail.endsWith('@durrahtutors.com') && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                    {senderEmail && !senderEmail.endsWith('@durrahtutors.com') && (
                      <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <p className={`text-xs mt-2 ${
                    senderEmail && !senderEmail.endsWith('@durrahtutors.com')
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {senderEmail && !senderEmail.endsWith('@durrahtutors.com')
                      ? 'Must use @durrahtutors.com domain'
                      : 'Enter the sender email address (must be @durrahtutors.com)'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setSenderEmail('info@durrahtutors.com')}
                      className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      info@
                    </button>
                    <button
                      type="button"
                      onClick={() => setSenderEmail('support@durrahtutors.com')}
                      className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      support@
                    </button>
                    <button
                      type="button"
                      onClick={() => setSenderEmail('security@durrahtutors.com')}
                      className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      security@
                    </button>
                    <button
                      type="button"
                      onClick={() => setSenderEmail('noreply@durrahtutors.com')}
                      className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      noreply@
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                Recipients
              </h3>

              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white mb-3"
              >
                <option value="all">Broadcast to All Users ({users.length})</option>
                <option value="subscribed">Subscribed Users Only</option>
                <option value="free">Free Users Only</option>
                <option value="custom">Custom User ID</option>
                <optgroup label="Select Specific User">
                  {users.slice(0, 50).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </optgroup>
              </select>

              {targetUserId === 'custom' && (
                <input
                  type="text"
                  value={customUserId}
                  onChange={(e) => setCustomUserId(e.target.value)}
                  placeholder="Enter User ID or Email"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                />
              )}
            </div>

            {/* Email Content */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Email Content
                </h3>
                {/* Editor Mode Tabs */}
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  <button
                    onClick={() => setEditorMode('simple')}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      editorMode === 'simple'
                        ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5 inline mr-1" />
                    Simple
                  </button>
                  <button
                    onClick={() => setEditorMode('visual')}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      editorMode === 'visual'
                        ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5 inline mr-1" />
                    Visual
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white font-semibold"
                />
              </div>

              {editorMode === 'simple' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Body (HTML)
                  </label>
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={12}
                    placeholder="Enter email content (HTML supported)"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white font-mono text-sm resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Visual Email Builder
                  </label>
                  <EmailVisualBuilder
                    blocks={emailBlocks}
                    onChange={setEmailBlocks}
                    accentColor={accentColor}
                    onAccentColorChange={setAccentColor}
                  />
                </div>
              )}
            </div>

            {/* Spam Analysis */}
            {spamAnalysis && (
              <div className={`rounded-xl border-2 p-6 ${
                spamAnalysis.level === 'excellent' ? 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500' :
                spamAnalysis.level === 'good' ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500' :
                spamAnalysis.level === 'warning' ? 'bg-amber-50 border-amber-500 dark:bg-amber-900/20 dark:border-amber-500' :
                'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {spamAnalysis.level === 'excellent' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                     spamAnalysis.level === 'good' ? <CheckCircle className="w-5 h-5 text-blue-600" /> :
                     spamAnalysis.level === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
                     <XCircle className="w-5 h-5 text-red-600" />}
                    Spam Analysis
                  </h3>
                  <div className={`text-2xl font-bold ${
                    spamAnalysis.level === 'excellent' ? 'text-green-600' :
                    spamAnalysis.level === 'good' ? 'text-blue-600' :
                    spamAnalysis.level === 'warning' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {spamAnalysis.score}/100
                  </div>
                </div>

                {spamAnalysis.issues.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Issues Detected:</p>
                    <ul className="space-y-1">
                      {spamAnalysis.issues.slice(0, 5).map((issue, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {spamAnalysis.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Suggestions:</p>
                    <ul className="space-y-1">
                      {spamAnalysis.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendEmail}
              disabled={
                isSending ||
                !customSubject ||
                (editorMode === 'simple' && !customBody) ||
                (editorMode === 'visual' && emailBlocks.length === 0) ||
                !senderEmail ||
                !senderEmail.endsWith('@durrahtutors.com')
              }
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Send Email Campaign
                </>
              )}
            </button>
          </div>

          {/* Right: Preview */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                Live Preview
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>

            {showPreview && (
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg">
                <iframe
                  srcDoc={generatePreviewHtml()}
                  className="w-full h-[600px] bg-white"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
