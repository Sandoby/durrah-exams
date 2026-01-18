import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, User, ArrowRight, Search, Sparkles, Filter, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  getFeaturedPost,
  getCategories,
  getFilteredPosts
} from './blogData';
import './Blog.css';

export function BlogList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = getCategories();
  const featuredPost = getFeaturedPost();
  const filteredPosts = useMemo(() => {
    return getFilteredPosts(searchTerm, selectedCategory).filter(p => !p.featured);
  }, [searchTerm, selectedCategory]);

  const handleNewsletterSignup = () => {
    alert('Thanks for your interest! Newsletter signup coming soon.');
  };

  // Helper to get Bento card class based on index
  const getBentoClass = (index: number) => {
    const patterns = ['blog-card-large', 'blog-card-standard', 'blog-card-standard', 'blog-card-tall', 'blog-card-wide', 'blog-card-standard'];
    return patterns[index % patterns.length];
  };

  return (
    <>
      <Helmet>
        <title>Blog | Durrah for Tutors - Online Exam Platform Insights</title>
        <meta name="description" content="Read expert articles on online exam best practices, preventing cheating, essay grading automation, and effective online tutoring strategies." />
        <meta name="keywords" content="online tutoring blog, exam tips, educational technology, tutoring best practices" />
        <link rel="canonical" href="https://durrahtutors.com/blog" />
      </Helmet>

      <div className="min-h-screen bg-[#fafafa] dark:bg-slate-950 overflow-hidden">
        {/* Background Decorative Shapes */}
        <div className="blog-bg-shape shape-1" />
        <div className="blog-bg-shape shape-2" />

        {/* Hero Section */}
        <section className="pt-40 pb-16 px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12"
            >
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-6 tracking-wider uppercase">
                  <Sparkles className="w-3 h-3" />
                  Editorial & Insights
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-none">
                  The <span className="text-indigo-600">Durrah</span> Journal
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  Curated strategies for the modern educator. Deep dives into pedagogy, automation, and the future of tutoring.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold shadow-sm hover:shadow-md transition-all self-start md:self-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Return Home
              </motion.button>
            </motion.div>

            {/* Featured Post Header */}
            {featuredPost && !searchTerm && selectedCategory === 'All' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-20"
              >
                <Link to={`/blog/${featuredPost.slug}`} className="group relative block w-full aspect-[21/9] rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-2/3">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-widest leading-none">
                        Featured
                      </span>
                      <span className="text-white/80 text-sm font-bold flex items-center gap-1.5 leading-none">
                        <Clock className="w-4 h-4" /> {featuredPost.readTime} min read
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight group-hover:text-indigo-300 transition-colors">
                      {featuredPost.title}
                    </h2>
                    <p className="text-lg text-white/70 line-clamp-2 max-w-xl font-medium mb-8">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur">
                          <User className="w-5 h-5" />
                        </div>
                        <span className="text-white font-bold">{featuredPost.author}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-16 p-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl sticky top-24 z-30 shadow-xl shadow-slate-900/5">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search the journal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-slate-900 dark:text-white focus:outline-none font-bold placeholder:text-slate-400"
                />
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
              <div className="flex items-center gap-2 w-full md:w-auto px-2 overflow-x-auto no-scrollbar">
                <Filter className="w-4 h-4 text-slate-400 ml-2 hidden lg:block" />
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-5 py-2 rounded-2xl whitespace-nowrap text-sm font-bold transition-all ${selectedCategory === category
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Bento Grid */}
            <div className="blog-grid mb-32">
              <AnimatePresence mode="popLayout">
                {filteredPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className={`${getBentoClass(index)} group`}
                  >
                    <Link
                      to={`/blog/${post.slug}`}
                      className="glass-card rounded-[2rem] w-full h-full p-4 flex flex-col overflow-hidden transition-all duration-500 hover:border-indigo-500/50"
                    >
                      <div className="relative w-full h-1/2 rounded-2xl overflow-hidden mb-6 flex-shrink-0">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                          {post.category}
                        </div>
                      </div>

                      <div className="flex flex-col flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 font-medium mb-auto">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span>{post.readTime} min</span>
                          </div>
                          <motion.div
                            whileHover={{ x: 5 }}
                            className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </motion.div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination Empty State */}
            {filteredPosts.length === 0 && (
              <div className="text-center py-32">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No matches found</h3>
                <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters or search terms.</p>
              </div>
            )}

            {/* Premium Newsletter Section */}
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative p-12 md:p-20 bg-slate-900 dark:bg-indigo-600 rounded-[3rem] overflow-hidden shadow-2xl mb-16"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                    Weekly Digest
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                    Stay ahead of the <br /><span className="text-indigo-400">Education Curve.</span>
                  </h2>
                  <p className="text-indigo-100/70 text-lg font-medium max-w-lg mb-0">
                    Get the latest student data trends and tutoring automation hacks delivered straight to your inbox.
                  </p>
                </div>
                <div className="w-full md:w-auto flex-shrink-0">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 rounded-[2rem] flex flex-col sm:flex-row gap-2 max-w-md mx-auto md:mx-0">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="flex-1 bg-transparent px-6 py-4 text-white placeholder:text-white/40 font-bold focus:outline-none sm:min-w-[250px]"
                    />
                    <button
                      onClick={handleNewsletterSignup}
                      className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                    >
                      Subscribe <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-white/40 text-[10px] text-center mt-4 font-bold uppercase tracking-widest">
                    No spam. Just knowledge.
                  </p>
                </div>
              </div>
            </motion.section>
          </div>
        </section>
      </div>
    </>
  );
}
