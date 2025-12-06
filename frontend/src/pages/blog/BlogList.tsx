import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, User, ArrowRight, Search } from 'lucide-react';

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
    image: '/blog/cheating-prevention.jpg',
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
    image: '/blog/essay-grading.jpg'
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
    image: '/blog/online-vs-traditional.jpg'
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
    image: '/blog/dropout-solutions.jpg'
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

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-indigo-100 hover:text-white mb-6 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
            <h1 className="text-5xl font-black mb-4">Expert Insights for Modern Tutors</h1>
            <p className="text-xl text-indigo-100 max-w-2xl">
              Real strategies, real data, real results. Learn how top tutors use Durrah to save time, prevent cheating, and engage students better.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Featured Post */}
          {featuredPost && (
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="group block mb-16"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-indigo-100 dark:border-indigo-900/30 hover:shadow-2xl transition-all duration-300">
                <div className="grid md:grid-cols-2">
                  {/* Image */}
                  <div className="relative h-64 md:h-full min-h-96 bg-gradient-to-br from-indigo-400 via-violet-500 to-purple-600 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-white text-center px-4 group-hover:scale-105 transition-transform">
                      <div>
                        <div className="text-6xl mb-2">🔒</div>
                        <span className="text-lg font-bold">{featuredPost.category}</span>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full font-bold text-sm">FEATURED</div>
                  </div>

                  {/* Content */}
                  <div className="p-8 md:p-10 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold">
                        {featuredPost.category}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{featuredPost.readTime} min read</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {featuredPost.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:gap-3 transition-all">
                        Read <ArrowRight className="w-4 h-4" />
                      </div>
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
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
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

          {/* Blog Posts Grid */}
          {filteredPosts.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 gap-8 mb-16">
                {filteredPosts.filter(p => !p.featured).map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:-translate-y-1"
                  >
                    <div className="aspect-video bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden flex items-center justify-center">
                      <div className="text-6xl group-hover:scale-110 transition-transform">
                        {post.category === 'Anti-Cheating' && '🔒'}
                        {post.category === 'Productivity' && '⚡'}
                        {post.category === 'Research' && '📊'}
                        {post.category === 'Student Engagement' && '👥'}
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                        <span className="mx-2">•</span>
                        <span>{post.readTime} min</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 text-sm">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
                          {post.category}
                        </span>
                        <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition" />
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

          {/* CTA Section - Try Durrah */}
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl p-12 text-white mb-16 shadow-xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-4xl font-black mb-4">Ready to Transform Your Tutoring?</h2>
                <p className="text-lg text-indigo-100 mb-6">
                  Join 10,000+ tutors using Durrah to save time, prevent cheating, and engage students better.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Create exams in 2 minutes</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Auto-grading & instant feedback</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>AI-powered anti-cheating</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Detailed student analytics</span>
                  </li>
                </ul>
                <a
                  href="https://tutors.durrahsystem.tech/register"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all"
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="hidden md:block text-center">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-indigo-100 text-sm">No credit card required • 7 days free</p>
              </div>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border-2 border-indigo-200 dark:border-indigo-900/30 text-center shadow-lg">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Get Expert Tips Weekly</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Get actionable strategies, real research, and exclusive tips delivered to your inbox. Join 5,000+ tutors improving their students' results.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
              <button
                onClick={handleNewsletterSignup}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-bold hover:shadow-lg transition-all whitespace-nowrap"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
