import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, User, ArrowRight, Search, Sparkles } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: number;
  category: string;
  image: string;
  featured?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'how-to-prevent-cheating-online-exams',
    title: 'How to Prevent Cheating in Online Exams: The Complete 2024 Guide',
    excerpt: 'Academic dishonesty costs education systems billions annually. Learn evidence-based strategies tutors use to detect and prevent cheating in online assessments.',
    author: 'Ahmed Elsaid',
    date: '2024-12-06',
    readTime: 8,
    category: 'Anti-Cheating',
    image: 'https://images.unsplash.com/photo-1633356122544-f134ef2944f0?w=800&h=400&fit=crop&q=80',
    featured: true
  },
  {
    id: '2',
    slug: 'grading-essays-faster-ai-tutors',
    title: 'Grade 100 Essay Exams in 1 Hour: How Tutors Save 10+ Hours Weekly',
    excerpt: 'Manual essay grading takes 15-20 minutes per essay. Discover how modern tutors use AI-assisted grading to save time without sacrificing quality feedback.',
    author: 'Ahmed Elsaid',
    date: '2024-12-05',
    readTime: 7,
    category: 'Productivity',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&q=80'
  },
  {
    id: '3',
    slug: 'online-tutoring-effectiveness-vs-traditional',
    title: 'Online Tutoring vs Traditional: What Research Actually Shows About Effectiveness',
    excerpt: 'Studies reveal online tutoring can be just as effective—sometimes MORE effective. See the data and learn why 60% of tutors now prefer online delivery.',
    author: 'Ahmed Elsaid',
    date: '2024-12-04',
    readTime: 9,
    category: 'Research',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f70d504f0?w=800&h=400&fit=crop&q=80'
  },
  {
    id: '4',
    slug: 'student-dropout-rates-online-exams-solutions',
    title: 'Why 85% of Online Students Dropout (And How to Fix It)',
    excerpt: 'Online learning dropout rates are 4x higher than traditional. Learn the 5 proven tactics tutors use to keep students engaged and completing exams.',
    author: 'Ahmed Elsaid',
    date: '2024-12-03',
    readTime: 10,
    category: 'Student Engagement',
    image: 'https://images.unsplash.com/photo-1552308995-5658abf46a67?w=800&h=400&fit=crop&q=80'
  }
];

export function BlogList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPosts, setFilteredPosts] = useState(blogPosts);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    let filtered = blogPosts;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
  }, [searchTerm, selectedCategory]);

  const categories = ['All', ...new Set(blogPosts.map(post => post.category))];
  const featuredPost = blogPosts.find(p => p.featured);

  const handleNewsletterSignup = () => {
    alert('Thanks for your interest! Newsletter signup coming soon.');
  };

  return (
    <>
      <Helmet>
        <title>Blog | Durrah for Tutors - Online Exam Platform Insights</title>
        <meta name="description" content="Read expert articles on online exam best practices, preventing cheating, essay grading automation, and effective online tutoring strategies." />
        <meta name="keywords" content="online tutoring blog, exam tips, educational technology, tutoring best practices" />
        <link rel="canonical" href="https://tutors.durrahsystem.tech/blog" />
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Hero Section - Matches Landing Page */}
        <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          {/* Animated Blobs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-violet-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Expert Insights & Real Data</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-[1.1]">
              Blog for Modern<br />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Tutors</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Real strategies, real data, real results. Learn how top tutors save time, prevent cheating, and engage students better.
            </p>

            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Featured Post - Large Hero Style */}
          {featuredPost && (
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="group block mb-20"
            >
              <div className="relative rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
                {/* Featured Image */}
                <div className="relative h-96 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute top-6 right-6 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full font-black text-sm shadow-lg">
                    🏆 FEATURED
                  </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-bold">
                      {featuredPost.category}
                    </span>
                    <span className="text-sm text-gray-100">{featuredPost.readTime} min read</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight group-hover:text-yellow-300 transition">
                    {featuredPost.title}
                  </h2>
                  <p className="text-lg text-gray-100 mb-4">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-200">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(featuredPost.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {featuredPost.author}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-bold group-hover:gap-3 transition-all">
                      Read <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Search & Filter */}
          <div className="mb-12 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition font-medium"
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Blog Posts Grid - Matches Landing Page Card Style */}
          {filteredPosts.length > 0 ? (
            <>
              <div className="grid md:grid-cols-3 gap-8 mb-20">
                {filteredPosts.filter(p => !p.featured).map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:-translate-y-2"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold mb-3">
                        {post.category}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 text-sm">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:gap-2 transition-all">
                          {post.readTime}m <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg">No articles found matching your search.</p>
            </div>
          )}

          {/* CTA Section - Matches Landing Page Style */}
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-3xl text-white mb-16 shadow-2xl">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-black mb-6">Ready to Transform Your Tutoring?</h2>
              <p className="text-xl text-indigo-100 mb-12">
                Join 10,000+ tutors saving 10+ hours every week with Durrah. Create exams in 2 minutes, grade automatically, prevent cheating with AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://tutors.durrahsystem.tech/register"
                  target="_blank"
                  rel="noreferrer"
                  className="group relative inline-flex items-center justify-center gap-2 bg-white text-indigo-600 px-10 py-5 rounded-2xl text-lg font-bold hover:shadow-2xl hover:scale-105 transition-all"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>
                <a
                  href="https://tutors.durrahsystem.tech/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-white/10 transition-all"
                >
                  Watch Demo
                </a>
              </div>
              <p className="text-indigo-100 text-sm mt-8">✨ No credit card required • 7 days free access</p>
            </div>
          </section>

          {/* Newsletter Section */}
          <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 rounded-3xl p-12 border border-indigo-200 dark:border-indigo-900/30 text-center shadow-lg">
            <div className="inline-block px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full mb-4">
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">📧 Weekly Newsletter</span>
            </div>
            <h3 className="text-4xl font-black text-gray-900 dark:text-white mb-4">Get Expert Tips Weekly</h3>
            <p className="text-gray-700 dark:text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join 5,000+ tutors getting actionable strategies, real research, and exclusive tips delivered to your inbox. Transform your tutoring game.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-medium"
              />
              <button
                onClick={handleNewsletterSignup}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold hover:shadow-lg transition-all whitespace-nowrap"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
        `}</style>
      </div>
    </>
  );
}
