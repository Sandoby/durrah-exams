import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, ArrowRight, Search, X } from 'lucide-react';
import { blogPosts, getCategories } from './blogData';
import type { BlogPostContent } from './blogData';
import { Logo } from '../../components/Logo';
import './Blog.css';

export function BlogList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filteredPosts, setFilteredPosts] = useState<BlogPostContent[]>(blogPosts);

  useEffect(() => {
    let filtered = blogPosts;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(term) ||
        post.excerpt.toLowerCase().includes(term) ||
        post.keywords.some(k => k.toLowerCase().includes(term))
      );
    }

    setFilteredPosts(filtered);
  }, [searchTerm, selectedCategory]);

  const categories = getCategories();
  const featuredPost = blogPosts.find(p => p.featured);
  const regularPosts = filteredPosts.filter(p => !p.featured);

  return (
    <>
      <Helmet>
        <title>Blog | Durrah for Tutors - Expert Insights for Modern Educators</title>
        <meta name="description" content="Expert articles on online tutoring, exam creation, AI in education, and study techniques. Real strategies backed by data for tutors and students." />
        <meta name="keywords" content="tutoring blog, online teaching tips, exam creation, study techniques, AI education" />
        <link rel="canonical" href="https://durrahtutors.com/blog" />
      </Helmet>

      <div className="min-h-screen bg-[var(--blog-bg)] blog-container">
        {/* Apple-style sticky header */}
        <header className="sticky top-0 z-50 bg-[var(--blog-bg)]/80 backdrop-blur-xl border-b border-[var(--blog-border-light)] py-4 px-6 md:px-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-105 shrink-0">
              <Logo size="md" showText={false} />
            </Link>

            {/* Search & Categories Bar Consolidation */}
            <div className="flex flex-col md:flex-row gap-4 items-center flex-1 max-w-4xl justify-end">
              {/* Search */}
              <div className="relative w-full md:w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--blog-text-muted)] group-focus-within:text-[var(--blog-text-primary)] transition-colors" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-[var(--blog-bg-secondary)] border border-[var(--blog-border-light)] rounded-lg text-sm text-[var(--blog-text-primary)] placeholder:text-[var(--blog-text-muted)] focus:outline-none focus:border-[var(--blog-border)] transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--blog-text-muted)] hover:text-[var(--blog-text-primary)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex bg-[var(--blog-bg-secondary)] p-1 rounded-lg border border-[var(--blog-border-light)] overflow-x-auto max-w-full hide-scrollbar">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === category
                      ? 'bg-[var(--blog-bg)] text-[var(--blog-text-primary)] shadow-sm'
                      : 'text-[var(--blog-text-secondary)] hover:text-[var(--blog-text-primary)]'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-6 blog-container-wide">
          <div className="max-w-3xl">
            <p className="blog-overline mb-4 blog-animate-in">The Durrah Blog</p>
            <h1 className="blog-heading-xl mb-6 blog-animate-in blog-stagger-1">
              Insights for Modern Tutors
            </h1>
            <p className="blog-body max-w-xl blog-animate-in blog-stagger-2">
              Real strategies, backed by data. Learn how top tutors save time, engage students, and grow their business.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <div className="blog-container-wide pb-24">
          {/* Featured Post */}
          {featuredPost && selectedCategory === 'All' && !searchTerm && (
            <Link
              to={`/blog/${featuredPost.slug}`}
              className="group block mb-16 blog-animate-in"
            >
              <div className="blog-card overflow-hidden">
                <div className="grid md:grid-cols-2">
                  {/* Image */}
                  <div className="blog-image-zoom aspect-[16/10] md:aspect-auto md:h-full">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-8 md:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="blog-tag">{featuredPost.category}</span>
                      <span className="blog-caption">Featured</span>
                    </div>
                    <h2 className="blog-heading-lg mb-4 group-hover:opacity-70 transition-opacity">
                      {featuredPost.title}
                    </h2>
                    <p className="blog-body mb-6 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 blog-caption">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(featuredPost.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {featuredPost.readTime} min
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold text-[var(--blog-text-primary)] group-hover:gap-2 transition-all">
                        Read <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Blog Posts Grid */}
          {regularPosts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post, index) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className={`group blog-card blog-animate-in blog-stagger-${(index % 4) + 1}`}
                >
                  <div className="blog-image-zoom">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="blog-card-image"
                      loading="lazy"
                    />
                  </div>
                  <div className="blog-card-content">
                    <span className="blog-tag mb-3">{post.category}</span>
                    <h3 className="blog-heading-md text-lg mb-2 line-clamp-2 group-hover:opacity-70 transition-opacity">
                      {post.title}
                    </h3>
                    <p className="blog-body text-sm mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between blog-caption">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime} min
                      </span>
                      <span className="flex items-center gap-1 font-medium text-[var(--blog-text-primary)] group-hover:gap-2 transition-all">
                        Read <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="blog-heading-md mb-2">No articles found</p>
              <p className="blog-body">Try adjusting your search or filter.</p>
            </div>
          )}

          {/* Newsletter Section */}
          <div className="blog-newsletter mt-20">
            <p className="blog-overline mb-4">Newsletter</p>
            <h3 className="blog-heading-lg mb-4">Get insights weekly</h3>
            <p className="blog-body mb-8 max-w-md mx-auto">
              Join 5,000+ tutors receiving actionable strategies, research, and exclusive tips every week.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="blog-newsletter-input"
              />
              <button className="blog-cta-button justify-center">
                Subscribe
              </button>
            </div>
          </div>

          {/* Footer CTA */}
          <section className="mt-20 bg-[var(--blog-text-primary)] text-[var(--blog-bg)] rounded-2xl p-12 md:p-16 text-center">
            <h2 className="blog-heading-lg text-[var(--blog-bg)] mb-4">
              Ready to transform your tutoring?
            </h2>
            <p className="blog-body text-[var(--blog-bg)]/70 mb-8 max-w-lg mx-auto">
              Create exams in minutes. Grade automatically. Prevent cheating with AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--blog-bg)] text-[var(--blog-text-primary)] font-semibold rounded-xl hover:opacity-90 transition"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[var(--blog-bg)]/30 text-[var(--blog-bg)] font-semibold rounded-xl hover:bg-[var(--blog-bg)]/10 transition"
              >
                Learn More
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
