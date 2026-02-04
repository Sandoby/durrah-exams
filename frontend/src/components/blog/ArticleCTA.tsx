import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ArticleCTAProps {
    title?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
}

export function ArticleCTA({
    title = "Ready to Try This?",
    description = "Create exams in minutes, grade automatically, and get real insights into student performance.",
    buttonText = "Start Free Trial",
    buttonLink = "/register"
}: ArticleCTAProps) {
    return (
        <div className="blog-cta-box my-10">
            <h4 className="blog-heading-md mb-2">{title}</h4>
            <p className="blog-body mb-6">{description}</p>
            <Link
                to={buttonLink}
                className="blog-cta-button"
            >
                {buttonText}
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}
