import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, User, Bookmark, ArrowRight, Clock, ChevronRight, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, useScroll, useSpring } from 'framer-motion';

import { getBlogPost } from './blogData';
import './Blog.css';

export function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const post = slug ? getBlogPost(slug) : null;

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-8 text-slate-300">
            <Bookmark className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Article Not Found</h1>
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Journal
          </button>
        </div>
      </div>
    );
  }

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out this article from Durrah: ${post.title}`;

    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
        break;
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "image": post.image,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "Durrah for Tutors",
      "logo": {
        "@type": "ImageObject",
        "url": "https://durrahtutors.com/logo.png"
      }
    },
    "datePublished": post.date,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://durrahtutors.com/blog/${post.slug}`
    }
  };

  return (
    <>
      <Helmet>
        <title>{post.title} | Durrah Journal</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={post.keywords.join(', ')} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://durrahtutors.com/blog/${post.slug}`} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.image} />
        <meta property="og:site_name" content="Durrah for Tutors" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`https://durrahtutors.com/blog/${post.slug}`} />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        <meta name="twitter:image" content={post.image} />

        <link rel="canonical" href={`https://durrahtutors.com/blog/${post.slug}`} />

        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      {/* Reading Progress */}
      <motion.div className="reading-progress-bar" style={{ scaleX }} />

      <article className="min-h-screen bg-[#fafafa] dark:bg-slate-950 pb-32">
        {/* Editorial Header */}
        <header className="relative pt-40 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-12"
            >
              <Link to="/blog" className="hover:text-indigo-700 transition-colors">Journal</Link>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <span className="text-slate-400">{post.category}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-10 leading-[1.05] tracking-tight"
            >
              {post.title}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-8 py-8 border-y border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Writen by</div>
                  <div className="font-bold text-slate-900 dark:text-white">{post.author}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Published</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Reading Time</div>
                  <div className="font-bold text-slate-900 dark:text-white">{post.readTime} minutes</div>
                </div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Featured Image */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20"
        >
          <div className="relative aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl border border-white dark:border-slate-800">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Article Body */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Main Content */}
            <main className="flex-1 max-w-3xl">
              <div className="prose-premium prose-lg dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </div>

              {/* Share & Support Box */}
              <div className="mt-20 p-12 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5">
                <div className="text-center max-w-md mx-auto">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Did you find this helpful?</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
                    Help your fellow educators by sharing these insights with your network.
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => handleShare('copy')}
                      className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
                    >
                      <LinkIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center hover:bg-black transition-all text-white"
                    >
                      <Twitter className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center hover:bg-indigo-700 transition-all text-white"
                    >
                      <Facebook className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </main>

            {/* Floating Sidebar */}
            <aside className="hidden lg:block w-80 sticky top-32 h-fit">
              <div className="space-y-12">
                {/* Related CTA */}
                <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20">
                  <h4 className="text-xl font-black mb-4">Automate your Tutoring</h4>
                  <p className="text-indigo-100 text-sm mb-8 font-medium leading-relaxed">
                    Stop manually grading and worrying about cheating. Let Durrah handle the busy work.
                  </p>
                  <Link
                    to="/register"
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all group"
                  >
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Newsletter Card */}
                <div className="p-8 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Weekly Journal</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 font-medium">Join 5k+ educators getting weekly research-backed tips.</p>
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-sm hover:opacity-90 transition-all">
                      Subscribe
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div className="px-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {post.keywords.map(tag => (
                      <span key={tag} className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Recommended Articles Strip */}
      <section className="bg-white dark:bg-slate-900 py-32 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white">More to Explore</h2>
            <Link to="/blog" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              View all articles <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* We could fetch actual related posts here if needed, but for now we link back */}
            <div className="p-8 border border-slate-100 dark:border-slate-800 rounded-[2rem] bg-slate-50 dark:bg-slate-950/50">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">Ready for the next lesson?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium line-clamp-2">Head back to our main journal to discover more strategies for growing your tutoring business.</p>
              <Link to="/blog" className="inline-flex items-center gap-2 text-slate-900 dark:text-white font-black group">
                Browse Journal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
