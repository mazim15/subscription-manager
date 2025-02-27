import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Pre-process content to ensure proper markdown formatting
  const processedContent = content
    // Make sure headings have proper spacing
    .replace(/^(#+)\s*(.+)$/gm, '$1 $2')
    // Ensure bullet points have proper spacing
    .replace(/^(\s*[-*])\s*(.+)$/gm, '$1 $2')
    // Convert plain text headings to markdown headings
    .replace(/^([A-Z][A-Za-z\s]+):\s*$/gm, '### $1\n')
    // Add proper line breaks before and after lists and headings
    .replace(/\n(#+\s.+)\n/g, '\n\n$1\n\n')
    .replace(/\n([-*]\s.+)\n/g, '\n\n$1\n\n')
    // Clean up any excessive line breaks
    .replace(/\n{3,}/g, '\n\n');

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]}
        className="prose prose-sm max-w-none dark:prose-invert"
        components={{
          // Ensure lists are properly styled
          ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="my-1" {...props} />,
          // Ensure headings are properly styled
          h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
          // Ensure paragraphs have proper spacing
          p: ({node, ...props}) => <p className="my-2" {...props} />
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 