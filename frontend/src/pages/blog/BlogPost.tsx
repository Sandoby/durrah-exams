import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, Clock, User, Share2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBlogPost, blogPosts } from './blogData';
import { ReadingProgressBar } from '../../components/blog/ReadingProgressBar';
import { TableOfContents, injectHeadingIds } from '../../components/blog/TableOfContents';
import { RelatedPosts } from '../../components/blog/RelatedPosts';
import { ArticleCTA } from '../../components/blog/ArticleCTA';
import { Logo } from '../../components/Logo';
import { Link } from 'react-router-dom';
import './Blog.css';

export function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = slug ? getBlogPost(slug) : null;

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--blog-bg)]">
        <div className="text-center">
          <h1 className="blog-heading-lg mb-4">Article Not Found</h1>
          <p className="blog-body mb-6">The article you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/blog')}
            className="blog-cta-button"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  const processedContent = injectHeadingIds(post.content);

  // JSON-LD Structured Data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.image,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Durrah Tutors",
      "logo": {
        "@type": "ImageObject",
        "url": "https://durrahtutors.com/brand/logo.png"
      }
    },
    "datePublished": post.date,
    "dateModified": post.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://durrahtutors.com/blog/${post.slug}`
    }
  };

  return (
    <>
      <Helmet>
        <title>{post.title} | Durrah Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={post.keywords.join(', ')} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.image} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        <link rel="canonical" href={`https://durrahtutors.com/blog/${post.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <ReadingProgressBar />

      <div className="min-h-screen bg-[var(--blog-bg)] blog-container">
        {/* Apple-style sticky header */}
        <header className="sticky top-0 z-50 bg-[var(--blog-bg)]/80 backdrop-blur-xl border-b border-[var(--blog-border-light)] py-4 px-6 md:px-12">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 transition-transform hover:scale-105 shrink-0">
              <Logo size="md" showText={false} />
            </Link>

            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--blog-text-secondary)] hover:text-[var(--blog-text-primary)] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              All Articles
            </Link>
          </div>
        </header>

        <article className="pt-12 pb-20">
          {/* Hero Section */}
          <header className="pb-12 px-6 blog-container-wide text-center">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="blog-tag">{post.category}</span>
                <span className="blog-caption flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readTime} min read
                </span>
              </div>

              <h1 className="blog-heading-xl mb-8">
                {post.title}
              </h1>

              <div className="flex items-center justify-center gap-6 blog-caption">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          <div className="blog-container-wide mb-12">
            <div className="max-w-4xl mx-auto">
              <img
                src={post.image}
                alt={post.title}
                className="w-full aspect-[2/1] object-cover rounded-2xl shadow-sm"
                loading="eager"
              />
            </div>
          </div>

          {/* Article Content */}
          <div className="blog-container-wide px-6">
            <div className="grid lg:grid-cols-[1fr_280px] gap-12 max-w-5xl mx-auto">
              <div className="min-w-0">
                <div
                  className="blog-article"
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />

                <ArticleCTA />

                <div className="blog-divider" />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied!');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--blog-bg-secondary)] border border-[var(--blog-border-light)] rounded-lg text-sm font-medium text-[var(--blog-text-primary)] hover:border-[var(--blog-border)] transition"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Article
                  </button>
                </div>

                <RelatedPosts
                  currentSlug={post.slug}
                  currentCategory={post.category}
                  allPosts={blogPosts}
                />
              </div>

              <aside className="hidden lg:block">
                <TableOfContents content={post.content} />
              </aside>
            </div>
          </div>
        </article>

        {/* Newsletter Section */}
        <section className="bg-[var(--blog-bg-secondary)] border-t border-[var(--blog-border-light)] py-20">
          <div className="blog-container-narrow text-center px-6">
            <p className="blog-overline mb-4">Newsletter</p>
            <h3 className="blog-heading-lg mb-4">Stay Informed</h3>
            <p className="blog-body mb-8 max-w-md mx-auto">
              Join our community of educators and get research-backed strategies delivered weekly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="email@example.com"
                className="blog-newsletter-input"
              />
              <button
                onClick={() => toast.success('Welcome aboard!')}
                className="blog-cta-button justify-center"
              >
                Subscribe
              </button>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="bg-[var(--blog-text-primary)] text-[var(--blog-bg)] py-20">
          <div className="blog-container-narrow text-center px-6">
            <h2 className="blog-heading-lg text-[var(--blog-bg)] mb-4">
              Start Your Free Trial
            </h2>
            <p className="blog-body text-[var(--blog-bg)]/70 mb-8 max-w-lg mx-auto">
              Experience the power of automated exams and AI proctoring. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--blog-bg)] text-[var(--blog-text-primary)] font-semibold rounded-xl hover:opacity-90 transition"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[var(--blog-bg)]/30 text-[var(--blog-bg)] font-semibold rounded-xl hover:bg-[var(--blog-bg)]/10 transition"
              >
                Learn More
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
