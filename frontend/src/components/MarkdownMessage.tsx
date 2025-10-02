// src/components/MarkdownMessage.tsx
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// highlight.js — programmatic usage keeps code text intact
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import diff from "highlight.js/lib/languages/diff";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";

// ---- register languages
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("diff", diff);

type MarkdownMessageProps = {
  text: string;
  /** true while streaming so we can auto-close dangling ``` fences */
  streaming?: boolean;
};

/* ---------------- Helpers ---------------- */
function finalizeStreamingMarkdown(md: string) {
  const fences = (md.match(/```/g) || []).length;
  return fences % 2 === 1 ? md + "\n```" : md;
}

function textFromChildren(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textFromChildren).join("");
  // @ts-ignore react-markdown nodes
  if (node && typeof node === "object" && node.props?.children) {
    // @ts-ignore
    return textFromChildren(node.props.children);
  }
  return "";
}

function prettyLang(lang?: string) {
  return (lang || "code").toUpperCase();
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function isShellLang(lang?: string) {
  const L = (lang || "").toLowerCase();
  return L === "bash" || L === "sh" || L === "shell" || L === "zsh";
}

function normalizeShellForClipboard(src: string) {
  return (
    src
      .split("\n")
      // strip typical prompts: $, #, >
      .map((line) => line.replace(/^\s*(?:\$|>|#)\s?/, ""))
      .join("\n")
      .trim()
  );
}

function parseCodeMeta(meta?: string) {
  // supports ```js {1,3-5} title="file.ts"
  const titleMatch = meta?.match(/title="([^"]+)"/)?.[1] || "";
  const hl = new Set<number>();
  const range = meta?.match(/\{([^}]+)\}/)?.[1];
  if (range) {
    range.split(",").forEach((part) => {
      const [a, b] = part.split("-").map((n) => parseInt(n.trim(), 10));
      if (!isNaN(a) && isNaN(b)) hl.add(a);
      else if (!isNaN(a) && !isNaN(b)) {
        for (let i = a; i <= b; i++) hl.add(i);
      }
    });
  }
  return { title: titleMatch, highlightLines: hl };
}

/* ---------------- Code Block Component ---------------- */
const CodeBlock: React.FC<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    inline?: boolean;
    className?: string;
    // react-markdown passes the AST node; we use `data.meta` when present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node?: any;
  }
> = ({ inline, className, children, node }) => {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  // language-xyz -> xyz
  const language = React.useMemo(() => {
    const m = /language-([\w-]+)/.exec(className || "");
    return m?.[1]?.toLowerCase() || "";
  }, [className]);

  const meta = node?.data?.meta || node?.meta || "";
  const { title, highlightLines } = React.useMemo(
    () => parseCodeMeta(typeof meta === "string" ? meta : ""),
    [meta]
  );

  // INLINE CODE
  if (inline) {
    return (
      <code className="rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[0.92em] font-mono">
        {children}
      </code>
    );
  }

  // BLOCK CODE
  const raw = textFromChildren(children).replace(/\n$/, ""); // strip extra trailing newline
  const lines = React.useMemo(() => raw.split("\n"), [raw]);
  const lineCount = lines.length;
  const isLong = lineCount > 24;

  const highlighted = React.useMemo(() => {
    try {
      if (language) return hljs.highlight(raw, { language }).value;
      return hljs.highlightAuto(raw).value;
    } catch {
      return hljs.highlightAuto(raw).value;
    }
  }, [raw, language]);

  async function copy() {
    try {
      const toCopy = isShellLang(language)
        ? normalizeShellForClipboard(raw)
        : raw;
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  // Wrap each line to add numbers + optional line highlight
  const htmlWithLines = React.useMemo(() => {
    const htmlLines = highlighted.split("\n");
    const rows = htmlLines.map((html, i) => {
      const n = i + 1;
      const shouldHl = highlightLines.has(n);
      const isBlank = (raw.split("\n")[i] ?? "").trim().length === 0;

      const rowCls =
        (isBlank ? "leading-[1rem]" : "leading-[1rem]") +
        " grid grid-cols-[auto,1fr] gap-1";

      const lineNoCls =
        "select-none pr-2 text-right tabular-nums text-[11px] " +
        (shouldHl ? "text-zinc-300" : "text-zinc-500");

      const codeCell = isBlank
        ? `<span class="block h-3"></span>` // tiny visual height for empty lines
        : `<span class="block ${shouldHl ? "bg-white/5" : ""}">${
            html || "&nbsp;"
          }</span>`;

      return `
        <div class="${rowCls}">
          <span class="${lineNoCls}" data-line="${n}">${n}</span>
          ${codeCell}
        </div>
      `;
    });
    return rows.join("\n");
  }, [highlightLines, highlighted, raw]);

  return (
    <div className="relative my-4 overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F19] shadow-sm">
      {/* Header / toolbar */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-300">
        <div className="inline-flex items-center gap-2">
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-semibold tracking-wide">
            {title ? title : prettyLang(language)}
          </span>
          {title && (
            <span className="rounded-md bg-white/5 px-2 py-0.5">
              {prettyLang(language)}
            </span>
          )}
          {isShellLang(language) && (
            <span className="hidden sm:inline text-zinc-400">
              Copy removes <code className="px-1">$/#/&gt;</code> prompts
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5">
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" /> Expand
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />{" "}
                {isShellLang(language) ? "Copy command(s)" : "Copy"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className={`relative ${
          isLong && !expanded ? "max-h-80" : ""
        } overflow-hidden`}
      >
        <pre className="max-w-full overflow-x-auto px-3 py-2 text-sm leading-[0.2rem] text-zinc-100">
          <code
            className={className}
            dangerouslySetInnerHTML={{ __html: htmlWithLines }}
          />
        </pre>
        {isLong && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0B0F19] to-transparent" />
        )}
      </div>
    </div>
  );
};

/* ---------------- Callout ---------------- */
const Callout: React.FC<{
  children: React.ReactNode;
  tone?: "default" | "info" | "warning" | "success" | "danger";
}> = ({ children, tone = "default" }) => {
  const toneStyles: Record<string, string> = {
    default: "border-border bg-muted/50 text-muted-foreground",
    info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    danger: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };
  return (
    <div className={`my-3 rounded-2xl border px-4 py-3 ${toneStyles[tone]}`}>
      {children}
    </div>
  );
};

/* ---------------- Details / Summary (spoilers, collapsibles) ---------------- */
const Details: React.FC<{ children: React.ReactNode; open?: boolean }> = ({
  children,
  open,
}) => (
  <details
    className="my-3 rounded-xl border border-border/60 p-3 [&_summary]:cursor-pointer"
    open={open}
  >
    {children}
  </details>
);

/* ---------------- Sanitize schema (allow safe inline HTML) ---------------- */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), ["className"]],
    pre: [["className"]],
    span: [["className"]],
    a: [...(defaultSchema.attributes?.a || []), ["target"], ["rel"]],
    img: [
      ...(defaultSchema.attributes?.img || []),
      ["loading"],
      ["title"],
      ["width"],
      ["height"],
    ],
    kbd: [["className"]],
    sup: [["className"]],
    sub: [["className"]],
    details: [["open"], ["className"]],
    summary: [["className"]],
    table: [["className"]],
    thead: [["className"]],
    tbody: [["className"]],
    tr: [["className"]],
    th: [["className"]],
    td: [["className"]],
    hr: [["className"]],
    mark: [["className"]],
  },
};

/* ---------------- Main Renderer ---------------- */
const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
  text,
  streaming,
}) => {
  const safe = React.useMemo(
    () => (streaming ? finalizeStreamingMarkdown(text) : text),
    [text, streaming]
  );

  return (
    <div
      className="
        break-words
        [overflow-wrap:anywhere]
        [&_*]:max-w-full
        [&_img]:h-auto [&_img]:rounded-lg
      "
    >
      <ReactMarkdown
        // GFM => tables, strikethrough, task-lists, autolinks, footnotes
        remarkPlugins={[remarkGfm, remarkMath]}
        // raw HTML (details/summary, sup/sub, mark, etc.) — sanitized
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          rehypeKatex,
        ]}
        components={{
          // ---- code
          code: CodeBlock,

          // ---- headings with anchors
          h1: ({ children }) => {
            const id = slugify(textFromChildren(children));
            return (
              <h1
                id={id}
                className="mb-3 mt-2 text-2xl font-bold tracking-tight scroll-mt-20"
              >
                <a
                  href={`#${id}`}
                  className="no-underline hover:underline decoration-primary/40"
                >
                  {children}
                </a>
              </h1>
            );
          },
          h2: ({ children }) => {
            const id = slugify(textFromChildren(children));
            return (
              <h2
                id={id}
                className="mb-2 mt-2 text-xl font-semibold tracking-tight scroll-mt-20"
              >
                <a
                  href={`#${id}`}
                  className="no-underline hover:underline decoration-primary/40"
                >
                  {children}
                </a>
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugify(textFromChildren(children));
            return (
              <h3
                id={id}
                className="mb-2 mt-2 text-lg font-semibold tracking-tight scroll-mt-20"
              >
                <a
                  href={`#${id}`}
                  className="no-underline hover:underline decoration-primary/40"
                >
                  {children}
                </a>
              </h3>
            );
          },
          h4: ({ children }) => (
            <h4 className="mb-2 mt-2 text-base font-semibold">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="mb-2 mt-2 text-sm font-semibold">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide">
              {children}
            </h6>
          ),

          // ---- paragraphs
          p: ({ children }) => <p className="mb-3">{children}</p>,

          // ---- lists & task lists
          ul: ({ children }) => (
            <ul className="mb-3 ml-5 list-disc space-y-1 marker:text-foreground/50">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-5 list-decimal space-y-1 marker:text-foreground/50">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="[&>p]:mb-0" {...props}>
              {children}
            </li>
          ),
          input: (props) =>
            props.type === "checkbox" ? (
              <input
                {...props}
                readOnly
                className="mr-2 align-middle rounded border-muted-foreground/30 accent-primary"
              />
            ) : (
              // @ts-ignore
              <input {...props} />
            ),

          // ---- blockquote as callout (supports GitHub-style [!NOTE] etc.)
          blockquote: ({ children }) => {
            const raw = textFromChildren(children).trim();
            // minimal support for [!NOTE], [!TIP], [!WARNING], [!IMPORTANT]
            const tone =
              raw.startsWith("[!NOTE]") || raw.startsWith("[!INFO]")
                ? "info"
                : raw.startsWith("[!TIP]") || raw.startsWith("[!SUCCESS]")
                ? "success"
                : raw.startsWith("[!WARNING]")
                ? "warning"
                : raw.startsWith("[!DANGER]") || raw.startsWith("[!IMPORTANT]")
                ? "danger"
                : "default";
            return (
              <Callout tone={tone}>
                {/* strip the directive token if present */}
                {raw.replace(/^\[\![A-Z]+\]\s*/, "") || children}
              </Callout>
            );
          },

          // ---- tables (clamped + scroll)
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/40">{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th
              {...props}
              className="border-b border-border px-2 py-1 text-left font-semibold"
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              {...props}
              className="border-b border-border px-2 py-1 align-top"
            >
              {children}
            </td>
          ),

          // ---- images (with caption if title present)
          img: ({ src, alt, title }) => {
            const content = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src || ""}
                alt={alt || ""}
                title={title}
                className="my-2 rounded-lg"
                loading="lazy"
              />
            );
            return title ? (
              <figure className="my-3">
                {content}
                <figcaption className="mt-1 text-center text-sm text-muted-foreground">
                  {title}
                </figcaption>
              </figure>
            ) : (
              content
            );
          },

          // ---- links (internal anchors vs external)
          a: ({ children, href }) => {
            const isHash = href?.startsWith("#");
            return (
              <a
                href={href}
                target={isHash ? undefined : "_blank"}
                rel={isHash ? undefined : "noreferrer"}
                className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
              >
                {children}
              </a>
            );
          },

          // ---- hr
          hr: () => <hr className="my-5 border-border" />,

          // ---- kbd (keyboard)
          kbd: ({ children }) => (
            <kbd className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em]">
              {children}
            </kbd>
          ),

          // ---- details / summary (for spoilers, collapsible sections)
          details: ({ children, open }) => (
            <Details open={open}>{children}</Details>
          ),
          summary: ({ children }) => (
            <summary className="font-medium">{children}</summary>
          ),

          // ---- footnotes (GFM renders these as <sup id="fnref-..."> and a list at bottom)
          sup: ({ children }) => (
            <sup className="text-xs align-super">{children}</sup>
          ),
          sub: ({ children }) => (
            <sub className="text-xs align-sub">{children}</sub>
          ),
          mark: ({ children }) => (
            <mark className="rounded px-1 bg-yellow-200/50">{children}</mark>
          ),
          del: ({ children }) => <del className="opacity-80">{children}</del>,
          ins: ({ children }) => (
            <ins className="no-underline bg-emerald-200/40">{children}</ins>
          ),
        }}
      >
        {safe}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
