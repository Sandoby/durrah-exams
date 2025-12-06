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
    image: '/blog/cheating-prevention.jpg'
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

  return (
    <>
      <Helmet>
        <title>Blog | Durrah for Tutors - Online Exam Platform Insights</title>
        <meta name="description" content="Read expert articles on online exam best practices, preventing cheating, essay grading automation, and effective online tutoring strategies." />
        <meta name="keywords" content="online tutoring blog, exam tips, educational technology, tutoring best practices" />
        <link rel="canonical" href="https://tutors.durrahsystem.tech/blog" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 mb-4 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Blog</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Expert insights on online exam best practices, anti-cheating strategies, and tutoring effectiveness
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Blog Posts Grid */}
          {filteredPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition overflow-hidden group border border-gray-200 dark:border-gray-700"
                >
                  <div className="aspect-video bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
                    {/* Placeholder for blog image */}
                    <div className="w-full h-full flex items-center justify-center text-white text-center px-4 group-hover:scale-105 transition">
                      <span className="text-sm">{post.category}</span>
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
                      <span>{post.readTime} min read</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <User className="w-4 h-4" />
                        {post.author}
                      </div>
                      <ArrowRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg">No articles found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
