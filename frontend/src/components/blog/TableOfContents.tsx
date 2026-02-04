import { useEffect, useState } from 'react';

interface TocItem {
    id: string;
    text: string;
    level: number;
}

interface TableOfContentsProps {
    content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
    const [items, setItems] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    // Parse headings from HTML content
    useEffect(() => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const headings = doc.querySelectorAll('h2, h3');

        const tocItems: TocItem[] = [];
        headings.forEach((heading, index) => {
            const id = `heading-${index}`;
            const text = heading.textContent || '';
            const level = heading.tagName === 'H2' ? 2 : 3;
            tocItems.push({ id, text, level });
        });

        setItems(tocItems);
    }, [content]);

    // Track active section on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-20% 0px -80% 0px' }
        );

        items.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [items]);

    const scrollToHeading = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const top = element.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    if (items.length === 0) return null;

    return (
        <nav className="blog-toc">
            <p className="blog-overline mb-4">On this page</p>
            <ul className="space-y-1">
                {items.map((item) => (
                    <li key={item.id}>
                        <button
                            onClick={() => scrollToHeading(item.id)}
                            className={`blog-toc-item text-left w-full ${activeId === item.id ? 'blog-toc-item-active' : ''
                                } ${item.level === 3 ? 'pl-6' : ''}`}
                        >
                            {item.text}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

// Helper function to inject IDs into HTML content for ToC linking
export function injectHeadingIds(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h2, h3');

    headings.forEach((heading, index) => {
        heading.id = `heading-${index}`;
    });

    return doc.body.innerHTML;
}
