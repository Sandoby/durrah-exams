import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { BlogPostContent } from '../../pages/blog/blogData';

interface RelatedPostsProps {
    currentSlug: string;
    currentCategory: string;
    allPosts: BlogPostContent[];
    maxPosts?: number;
}

export function RelatedPosts({ currentSlug, currentCategory, allPosts, maxPosts = 3 }: RelatedPostsProps) {
    // Filter posts: same category, exclude current, limit to maxPosts
    const relatedPosts = allPosts
        .filter(post => post.slug !== currentSlug)
        .filter(post => post.category === currentCategory)
        .slice(0, maxPosts);

    // If not enough in same category, fill with other posts
    if (relatedPosts.length < maxPosts) {
        const otherPosts = allPosts
            .filter(post => post.slug !== currentSlug && post.category !== currentCategory)
            .slice(0, maxPosts - relatedPosts.length);
        relatedPosts.push(...otherPosts);
    }

    if (relatedPosts.length === 0) return null;

    return (
        <section className="mt-16 pt-12 border-t border-[var(--blog-border)]">
            <h3 className="blog-heading-md mb-8">Keep Reading</h3>
            <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((post) => (
                    <Link
                        key={post.id}
                        to={`/blog/${post.slug}`}
                        className="group blog-card"
                    >
                        <div className="blog-image-zoom aspect-[16/10]">
                            <img
                                src={post.image}
                                alt={post.title}
                                className="blog-card-image"
                                loading="lazy"
                            />
                        </div>
                        <div className="blog-card-content">
                            <span className="blog-tag mb-3">{post.category}</span>
                            <h4 className="blog-heading-md text-base mb-2 line-clamp-2 group-hover:opacity-70 transition-opacity">
                                {post.title}
                            </h4>
                            <div className="flex items-center gap-1 blog-caption">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{post.readTime} min read</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
