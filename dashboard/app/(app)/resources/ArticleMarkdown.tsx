import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

const COMPONENTS: Components = {
  h1: (props) => (
    <h1
      className="display mt-8 mb-3 text-2xl text-navy first:mt-0 sm:text-3xl"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="display mt-7 mb-3 text-xl text-navy first:mt-0 sm:text-2xl"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-6 mb-2 text-lg font-bold text-navy first:mt-0"
      {...props}
    />
  ),
  h4: (props) => (
    <h4 className="mt-4 mb-2 text-base font-bold text-navy" {...props} />
  ),
  p: (props) => (
    <p className="my-3 text-[15px] leading-relaxed text-navy" {...props} />
  ),
  ul: (props) => (
    <ul
      className="my-3 ml-5 list-disc space-y-1 text-[15px] leading-relaxed text-navy marker:text-orange"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="my-3 ml-5 list-decimal space-y-1 text-[15px] leading-relaxed text-navy marker:text-orange"
      {...props}
    />
  ),
  li: (props) => <li className="pl-1" {...props} />,
  a: ({ href, children, ...rest }) => {
    const external = !!href && /^https?:\/\//i.test(href)
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="font-semibold text-orange underline decoration-orange/40 underline-offset-2 transition-colors hover:text-[#C11722] hover:decoration-orange"
        {...rest}
      >
        {children}
      </a>
    )
  },
  blockquote: (props) => (
    <blockquote
      className="my-4 border-l-4 border-orange bg-orange/5 px-4 py-2 italic text-navy"
      {...props}
    />
  ),
  code: ({ className, children, ...rest }) => {
    const isBlock = typeof className === 'string' && className.startsWith('language-')
    if (isBlock) {
      return (
        <code className="font-mono text-[13px]" {...rest}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-cream-2 px-1.5 py-0.5 font-mono text-[13px] text-navy"
        {...rest}
      >
        {children}
      </code>
    )
  },
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded-md bg-cream-2 p-4 text-[13px] text-navy"
      {...props}
    />
  ),
  hr: () => <hr className="my-6 border-line" />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-sm"
        {...props}
      />
    </div>
  ),
  thead: (props) => <thead className="bg-cream-2" {...props} />,
  th: (props) => (
    <th
      className="border border-line px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-navy"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border border-line px-3 py-2 align-top text-navy" {...props} />
  ),
  strong: (props) => <strong className="font-bold text-navy" {...props} />,
  em: (props) => <em className="italic" {...props} />,
}

export function ArticleMarkdown({ source }: { source: string }) {
  return (
    <div className="text-navy">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {source}
      </ReactMarkdown>
    </div>
  )
}
