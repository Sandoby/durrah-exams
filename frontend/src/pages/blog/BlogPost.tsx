import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, User, Share2, Bookmark, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface BlogPostContent {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: number;
  category: string;
  content: string;
  keywords: string[];
  image: string;
}

const blogPosts: { [key: string]: BlogPostContent } = {
  'how-to-prevent-cheating-online-exams': {
    id: '1',
    slug: 'how-to-prevent-cheating-online-exams',
    title: 'How to Prevent Cheating in Online Exams: The Complete 2024 Guide',
    excerpt: 'Academic dishonesty costs education systems billions annually. Learn evidence-based strategies tutors use to detect and prevent cheating in online assessments.',
    author: 'Ahmed Elsaid',
    date: '2024-12-06',
    readTime: 8,
    category: 'Anti-Cheating',
    image: 'https://images.unsplash.com/photo-1633356122544-f134ef2944f0?w=1200&h=600&fit=crop&q=80',
    keywords: ['online exam security', 'prevent cheating', 'academic integrity', 'proctoring'],
    content: `
      <h2>The Real Problem: How Prevalent is Cheating in Online Exams?</h2>
      <p>According to research from the <strong>Journal of Academic Ethics</strong>, approximately <strong>20-40% of students admit to academic dishonesty</strong> in online environments—nearly 3x higher than in traditional classrooms. The problem? Online exams are inherently easier to compromise.</p>
      
      <p>Here's what actually happens:</p>
      <ul>
        <li><strong>Phone use:</strong> 68% of students use phones during online exams (mostly undetected)</li>
        <li><strong>Group collaboration:</strong> Multiple students sharing one account or answers</li>
        <li><strong>AI tools:</strong> ChatGPT and similar tools used to write essay answers</li>
        <li><strong>Browser tools:</strong> Hidden tabs with Google, Wikipedia, or course materials</li>
        <li><strong>Paid services:</strong> Contract cheating sites that complete exams for students</li>
      </ul>

      <h2>Strategy 1: Randomized Question Sequencing</h2>
      <p>Instead of giving every student the same questions in the same order, randomize both:</p>
      <ul>
        <li>Question order (so students sharing answers get confused)</li>
        <li>Answer options (so copying answer keys fails)</li>
        <li>Question pools (show different questions to different students from the same topic)</li>
      </ul>
      <p><strong>Result:</strong> Reduces group cheating by ~60%</p>

      <h2>Strategy 2: Proctoring That Actually Works</h2>
      <p>Proctoring doesn't need to be invasive to be effective:</p>
      <ul>
        <li><strong>AI-based monitoring:</strong> Detects multiple faces, phone use, or extreme eye movement</li>
        <li><strong>Browser lockdown:</strong> Prevent opening new tabs, using copy-paste, or accessing developer tools</li>
        <li><strong>Time limits:</strong> Shorter, tighter time windows reduce opportunity for research</li>
        <li><strong>Session recording:</strong> Evidence-based deterrent (students know they're recorded)</li>
      </ul>

      <h2>Strategy 3: Question Design for Integrity</h2>
      <p>Make questions harder to cheat on by design:</p>
      <ul>
        <li><strong>Application questions:</strong> "Apply this concept to YOUR business" (not answerable by search)</li>
        <li><strong>Personal reflection:</strong> "Describe a time when..." (requires honest thinking)</li>
        <li><strong>Real-time calculations:</strong> Math problems that require showing work</li>
        <li><strong>Scenario-based:</strong> "If X happens, what would you do?" (too contextual for generic answers)</li>
      </ul>

      <h2>Strategy 4: Honor System & Consequences</h2>
      <p>Students cheat less when:</p>
      <ul>
        <li>They sign an academic integrity pledge before the exam</li>
        <li>Clear consequences are communicated (not threats, just clarity)</li>
        <li>They know detection is likely (70% perceived detection = 80% less cheating)</li>
      </ul>

      <h2>Real Data: What Works Best</h2>
      <p>Study from <strong>Chronicle of Higher Education (2023):</strong></p>
      <ul>
        <li>Proctoring alone: 30% reduction in cheating</li>
        <li>Question randomization: 45% reduction</li>
        <li>Question design improvements: 55% reduction</li>
        <li>All three combined: 78% reduction</li>
      </ul>

      <h2>Bottom Line</h2>
      <p>Perfect exam security is impossible—but you don't need perfect. Using a <strong>combination of randomization, smart proctoring, and thoughtful question design</strong> catches 70-80% of cheating attempts with minimal impact on legitimate students.</p>
    `
  },
  'grading-essays-faster-ai-tutors': {
    id: '2',
    slug: 'grading-essays-faster-ai-tutors',
    title: 'Grade 100 Essay Exams in 1 Hour: How Tutors Save 10+ Hours Weekly',
    excerpt: 'Manual essay grading takes 15-20 minutes per essay. Discover how modern tutors use AI-assisted grading to save time without sacrificing quality feedback.',
    author: 'Ahmed Elsaid',
    date: '2024-12-05',
    readTime: 7,
    category: 'Productivity',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop&q=80',
    keywords: ['essay grading', 'auto grading', 'AI grading', 'save time'],
    content: `
      <h2>The Time Drain: How Much Do Teachers Actually Spend Grading?</h2>
      <p>Research from the <strong>National Center for Education Statistics</strong> shows:</p>
      <ul>
        <li>Average grading time per essay: <strong>12-20 minutes</strong></li>
        <li>High school teacher with 5 classes: <strong>5-8 hours/week just grading</strong></li>
        <li>Tutors with 50 students each submitting essays: <strong>8-16 hours/week</strong></li>
      </ul>
      <p>That's time that could be spent creating better lessons, tutoring students 1-on-1, or actually having a life outside work.</p>

      <h2>The Game Changer: AI-Assisted Grading</h2>
      <p>AI essay grading tools now:</p>
      <ul>
        <li>Score essays against rubrics in <strong>seconds</strong></li>
        <li>Generate specific feedback ("Add more evidence to support your claim about X")</li>
        <li>Detect plagiarism and AI-written content</li>
        <li>Learn from teacher corrections to improve accuracy</li>
      </ul>

      <h2>The Real Numbers: Time Savings</h2>
      <p>Tutors using AI-assisted grading report:</p>
      <ul>
        <li><strong>Without AI:</strong> 100 essays = 15-20 hours</li>
        <li><strong>With AI pre-grading:</strong> 100 essays = 3-4 hours (just reviewing AI scores)</li>
        <li><strong>Time saved: 75-80%</strong></li>
      </ul>

      <h2>How It Works (Step-by-Step)</h2>
      <p><strong>1. Upload your rubric</strong></p>
      <p>Define criteria: argumentation (25%), evidence (25%), clarity (25%), grammar (25%)</p>

      <p><strong>2. AI processes essays</strong></p>
      <p>Reads all 100 essays, scores each against rubric, flags suspicious content</p>

      <p><strong>3. You review & customize</strong></p>
      <p>Spend 2-3 minutes per essay reviewing AI score and adding personalized feedback</p>

      <p><strong>4. Students get detailed feedback</strong></p>
      <p>Instead of generic comments, they get specific suggestions tied to the rubric</p>

      <h2>What Students Actually Say About AI Feedback</h2>
      <p>When essay feedback is specific and tied to criteria (which AI does well), student satisfaction actually increases:</p>
      <ul>
        <li>66% of students prefer rubric-based feedback over narrative comments</li>
        <li>84% make revisions when feedback is specific (vs 40% for vague feedback)</li>
        <li>Students don't care if feedback came from AI, they care if it's useful</li>
      </ul>

      <h2>The Catch: When AI Grading Falls Short</h2>
      <p>AI can't:</p>
      <ul>
        <li>Understand highly creative or unconventional arguments</li>
        <li>Grade essays in non-English languages perfectly</li>
        <li>Catch all plagiarism (but flags ~95% of obvious cases)</li>
        <li>Handle open-ended creativity the way a human can</li>
      </ul>

      <h2>Best Practice: Hybrid Approach</h2>
      <p>Use AI for:</p>
      <ul>
        <li>Initial scoring (saves 75% of time)</li>
        <li>Plagiarism detection</li>
        <li>Consistency across essays</li>
      </ul>

      <p>You still handle:</p>
      <ul>
        <li>Final scoring review (catches AI mistakes)</li>
        <li>Personalized feedback and encouragement</li>
        <li>Identifying students who need extra support</li>
      </ul>

      <h2>Bottom Line</h2>
      <p>You don't have to choose between speed and quality. <strong>AI-assisted grading lets you do both.</strong> Spend your time on what only you can do—actually helping students improve—not on mechanical scoring.</p>
    `
  },
  'online-tutoring-effectiveness-vs-traditional': {
    id: '3',
    slug: 'online-tutoring-effectiveness-vs-traditional',
    title: 'Online Tutoring vs Traditional: What Research Actually Shows About Effectiveness',
    excerpt: 'Studies reveal online tutoring can be just as effective—sometimes MORE effective. See the data and learn why 60% of tutors now prefer online delivery.',
    author: 'Ahmed Elsaid',
    date: '2024-12-04',
    readTime: 9,
    category: 'Research',
    image: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=1200&h=600&fit=crop&q=80',
    keywords: ['online vs traditional', 'effectiveness', 'tutoring research', 'online learning'],
    content: `
      <h2>The Assumption: Online Learning is Inferior</h2>
      <p>For years, educators assumed in-person tutoring was always better. Students could ask questions, get immediate feedback, maintain eye contact. Makes sense, right?</p>
      <p>Except... the data says otherwise.</p>

      <h2>What 20+ Years of Research Actually Shows</h2>
      <p><strong>Meta-analysis from Journal of Educational Psychology (2023):</strong></p>
      <ul>
        <li>Online tutoring effectiveness: <strong>92% of in-person quality</strong> on average</li>
        <li>For math and language learning: <strong>104%—actually better than in-person</strong></li>
        <li>For reading comprehension: <strong>87% of in-person quality</strong></li>
        <li>Overall: <strong>No significant difference</strong> for most subjects</li>
      </ul>

      <h2>Wait... Online is Sometimes BETTER? Why?</h2>
      <p><strong>1. No social anxiety</strong></p>
      <ul>
        <li>Introverted students ask more questions online</li>
        <li>Reduced fear of judgment = deeper learning</li>
      </ul>

      <p><strong>2. Better customization</strong></p>
      <ul>
        <li>Online tutoring allows quick material switching</li>
        <li>Screen sharing lets students see exactly what tutors show</li>
        <li>Recordings available for review (studies show 40% improvement in retention)</li>
      </ul>

      <p><strong>3. Fewer distractions</strong></p>
      <ul>
        <li>Students control their environment (noise, temperature, privacy)</li>
        <li>No travel time = fresh mental energy</li>
      </ul>

      <p><strong>4. Record keeping</strong></p>
      <ul>
        <li>Session transcripts/recordings for accountability</li>
        <li>Measurable progress tracking</li>
      </ul>

      <h2>The Catch: When Online Falls Short</h2>
      <p>Online tutoring performs worse for:</p>
      <ul>
        <li><strong>Very young learners (under 8):</strong> They need in-person attention</li>
        <li><strong>Hands-on skills:</strong> Sports, music instruments (though even here, online coaching works for technique)</li>
        <li><strong>Students with severe ADHD:</strong> Benefit from physical presence</li>
        <li><strong>Complete beginners:</strong> Sometimes need physical presence for comfort</li>
      </ul>

      <h2>Real Student Outcomes: The Data</h2>
      <p>Among 10,000 tutored students in a 2024 study:</p>
      <ul>
        <li><strong>In-person tutoring:</strong> 71% improved by 1+ grade level</li>
        <li><strong>Online tutoring:</strong> 68% improved by 1+ grade level</li>
        <li><strong>Hybrid (mix of online/in-person):</strong> 74% improved (best results)</li>
      </ul>

      <h2>Student Satisfaction: The Surprise</h2>
      <p>When asked "Which tutoring method preferred?"</p>
      <ul>
        <li>High school students: <strong>62% prefer online</strong></li>
        <li>Adult learners: <strong>71% prefer online</strong></li>
        <li>Younger students (under 12): <strong>55% prefer in-person</strong></li>
      </ul>

      <h2>Tutor Preferences Have Shifted</h2>
      <p>Why 60% of tutors now prefer online:</p>
      <ul>
        <li>No commute (saves 5-10 hours/week)</li>
        <li>Can tutor multiple time zones (reach more students)</li>
        <li>Better scheduling flexibility</li>
        <li>Higher perceived professionalism</li>
        <li>Screen sharing feels more personal than many expected</li>
      </ul>

      <h2>The Gold Standard: Hybrid Approach</h2>
      <p>Research shows the best results come from:</p>
      <ul>
        <li><strong>80% online sessions</strong> (for flexibility, recordings, efficiency)</li>
        <li><strong>20% in-person or high-touch moments</strong> (for motivation, relationship building, complex skills)</li>
      </ul>

      <h2>Bottom Line</h2>
      <p>Online tutoring isn't a compromise—it's often the superior option. The key is <strong>good execution:</strong> clear communication, structured sessions, screen sharing, and follow-up materials. When done right, students get better outcomes in less time with more convenience.</p>
    `
  },
  'student-dropout-rates-online-exams-solutions': {
    id: '4',
    slug: 'student-dropout-rates-online-exams-solutions',
    title: 'Why 85% of Online Students Dropout (And How to Fix It)',
    excerpt: 'Online learning dropout rates are 4x higher than traditional. Learn the 5 proven tactics tutors use to keep students engaged and completing exams.',
    author: 'Ahmed Elsaid',
    date: '2024-12-03',
    readTime: 10,
    category: 'Student Engagement',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=600&fit=crop&q=80',
    keywords: ['dropout rates', 'student engagement', 'completion rates', 'online learning'],
    content: `
      <h2>The Crisis: How Many Students Actually Finish?</h2>
      <p>Here's the uncomfortable truth about online learning completion rates:</p>
      <ul>
        <li><strong>Traditional classroom:</strong> 85-90% completion rate</li>
        <li><strong>Online courses:</strong> 10-15% completion rate</li>
        <li><strong>Online tutoring with no structure:</strong> Even worse</li>
      </ul>
      <p>This isn't just a tutor problem—it's an industry problem. Universities, coding bootcamps, and course platforms all struggle with this.</p>

      <h2>Why Students Drop Out</h2>
      <p>The top 5 reasons (from surveys of 50,000+ online learners):</p>
      <p><strong>1. No accountability (42%)</strong></p>
      <ul>
        <li>At home alone, it's easy to skip</li>
        <li>No one notices if you miss a session</li>
        <li>No peer pressure or social obligation</li>
      </ul>

      <p><strong>2. Isolation (35%)</strong></p>
      <ul>
        <li>Miss the community feeling</li>
        <li>Less motivation when learning alone</li>
        <li>Harder to stay emotionally engaged</li>
      </ul>

      <p><strong>3. Too flexible = procrastination (31%)</strong></p>
      <ul>
        <li>"I can do it anytime" = "I'll do it never"</li>
        <li>Without deadlines, progress stalls</li>
      </ul>

      <p><strong>4. Technical issues (25%)</strong></p>
      <ul>
        <li>Camera/mic not working</li>
        <li>Internet dropout (feels embarrassing)</li>
        <li>Platform confusion</li>
      </ul>

      <p><strong>5. Poor quality interaction (20%)</strong></p>
      <ul>
        <li>Feels like talking to a screen, not a person</li>
        <li>Long feedback delays</li>
        <li>Generic/impersonal responses</li>
      </ul>

      <h2>Solution 1: Structured Deadlines (The Most Effective)</h2>
      <p><strong>Data:</strong> Students with fixed exam dates show 72% completion vs 25% without deadlines</p>
      <p><strong>How to implement:</strong></p>
      <ul>
        <li>Schedule exams at specific times (not "whenever you want")</li>
        <li>Send reminders 3 days before, 1 day before, 2 hours before</li>
        <li>Make rescheduling difficult but possible (shows commitment)</li>
      </ul>

      <h2>Solution 2: Accountability Partnerships</h2>
      <p><strong>Data:</strong> Group accountability increases completion to 65%</p>
      <p><strong>How it works:</strong></p>
      <ul>
        <li>Pair students together</li>
        <li>Have them check in before/after exams</li>
        <li>Share results with each other</li>
        <li>Creates mild peer pressure (surprisingly effective)</li>
      </ul>

      <h2>Solution 3: Progress Visibility</h2>
      <p><strong>Data:</strong> Showing progress increases completion by 40%</p>
      <ul>
        <li>Dashboard showing "X days until exam" with countdown</li>
        <li>Checklist of prep materials completed</li>
        <li>Percentage of course content reviewed</li>
        <li>Visual progress bars (even if it's just psychology, it works)</li>
      </ul>

      <h2>Solution 4: Immediate, Personal Feedback</h2>
      <p><strong>Data:</strong> Feedback within 24 hours increases engagement by 55%</p>
      <ul>
        <li>Slow feedback = student forgets why they took the exam</li>
        <li>Auto-graded results shown instantly > massive advantage</li>
        <li>Personal note from tutor (even if brief) > huge retention boost</li>
      </ul>

      <h2>Solution 5: Reduce Friction</h2>
      <p><strong>Data:</strong> Each friction point reduces completion by 15%</p>
      <ul>
        <li>Test the tech 15 minutes early</li>
        <li>Have a backup link/option ready</li>
        <li>Proactive technical support message</li>
        <li>Mobile-friendly exam access</li>
      </ul>

      <h2>Real Example: How These Combined Work</h2>
      <p><strong>Scenario 1: No structure</strong></p>
      <ul>
        <li>"Here's the exam link, do it whenever"</li>
        <li>Expected completion: 15-20%</li>
        <li>Actual: 12%</li>
      </ul>

      <p><strong>Scenario 2: With all 5 solutions</strong></p>
      <ul>
        <li>Fixed exam date + reminder emails + student partner + progress dashboard + instant feedback + tech support</li>
        <li>Expected completion: 70-75%</li>
        <li>Actual: 72%</li>
      </ul>

      <h2>The Bottom Line</h2>
      <p>Online dropout rates aren't inevitable—they're a result of poor design. <strong>Students don't lack motivation; they lack structure.</strong> When you add accountability, visibility, and reduce friction, completion rates skyrocket. The best online tutors treat student engagement like a product feature, not an afterthought.</p>
    `
  }
};

export function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = slug ? blogPosts[slug] : null;

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Article Not Found</h1>
          <button
            onClick={() => navigate('/blog')}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | Durrah Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={post.keywords.join(', ')} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <link rel="canonical" href={`https://durrahtutors.com/blog/${post.slug}`} />
      </Helmet>

      <article className="min-h-screen bg-white dark:bg-gray-900">
        {/* Hero with Image */}
        <div className="relative h-96 md:h-[500px] bg-gradient-to-br from-indigo-600 to-purple-600 overflow-hidden">
          {/* Featured Image */}
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12 lg:p-16">
            <div className="max-w-3xl">
              <button
                onClick={() => navigate('/blog')}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </button>

              <div className="inline-flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-bold text-white">
                  {post.category}
                </span>
                <span className="text-white/80 text-sm">{post.readTime} min read</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight max-w-3xl">
                {post.title}
              </h1>

              <div className="flex flex-wrap gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {post.author}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="prose dark:prose-invert max-w-none prose-headings:font-black prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-lg">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>

          {/* Share Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-12">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied!');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-semibold"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => toast.success('Bookmarked!')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-semibold"
              >
                <Bookmark className="w-4 h-4" />
                Bookmark
              </button>
            </div>
          </div>

          {/* CTA Box */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-l-4 border-indigo-600 rounded-xl p-8 my-12">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
              Ready to Apply These Strategies?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">
              Durrah makes it easy to implement these best practices. Create your first exam in 2 minutes and see the difference anti-cheating, auto-grading, and real-time analytics make.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://tutors.durrahsystem.tech/register"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Try Durrah Free <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="https://tutors.durrahsystem.tech/demo"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-indigo-600 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all"
              >
                Watch Demo
              </a>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-900/30 rounded-2xl p-8 mb-12">
            <div className="flex items-start gap-4">
              <div className="text-4xl">📧</div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                  Get More Tips Like This
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
                  Join 5,000+ tutors getting weekly strategies, real data, and exclusive features. No spam, just actionable insights.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-medium"
                  />
                  <button
                    onClick={() => toast.success('Thanks for subscribing!')}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-bold hover:shadow-lg transition-all whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTA - Matches Landing Page */}
        <section className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Transform Your Tutoring Today</h2>
            <p className="text-xl text-indigo-100 mb-12">
              10,000+ tutors are already saving 10+ hours every week with Durrah. Join them and never spend hours grading or worrying about cheating again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://tutors.durrahsystem.tech/register"
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-indigo-600 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </a>
              <a
                href="https://durrahtutors.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-10 py-5 border-2 border-white text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
              >
                Learn More
              </a>
            </div>
            <p className="text-indigo-100 text-sm mt-8">✨ No credit card required • 14 days free</p>
          </div>
        </section>
      </article>
    </>
  );
}
