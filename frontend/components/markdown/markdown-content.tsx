import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-sm font-bold mt-2 mb-1 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xs font-bold mt-2 mb-1 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xs font-semibold mt-1.5 mb-0.5 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-1.5 space-y-0.5 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-1.5 space-y-0.5 pl-1">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className="block bg-muted/80 border border-border rounded-md px-2.5 py-2 font-mono text-[10px] leading-relaxed overflow-x-auto whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-muted/80 border border-border rounded px-1 py-0.5 font-mono text-[10px]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-1.5 last:mb-0">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-2 text-muted-foreground italic mb-1.5">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-500 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="border-border my-2" />,
};

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
