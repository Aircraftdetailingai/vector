"use client";

// Minimal Markdown renderer — no npm deps. Handles the subset our legal
// terms actually use: H1/H2/H3, bold (**...**), italic (*...*), inline
// code (`...`), bulleted lists (- ...), numbered lists (1. ...), paragraphs,
// and blank-line separators. Intentionally NOT a general-purpose parser.
//
// Rendering is single-pass: the input is split on blank lines into blocks,
// each block is classified by its first line, then inline formatting is
// applied. We avoid `dangerouslySetInnerHTML` so untrusted markdown can't
// inject HTML — bold/italic/code transform plain spans, not raw HTML.
import { Fragment } from 'react';

function renderInline(text, keyPrefix = '') {
  if (!text) return null;
  const parts = [];
  let i = 0;
  let buf = '';
  let key = 0;
  const flush = () => { if (buf) { parts.push(buf); buf = ''; } };
  while (i < text.length) {
    const c = text[i];
    // Bold: **...**
    if (c === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        parts.push(<strong key={`${keyPrefix}-b-${key++}`}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // Italic: *...*
    if (c === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end !== i + 1) {
        flush();
        parts.push(<em key={`${keyPrefix}-i-${key++}`}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    // Inline code: `...`
    if (c === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        parts.push(<code key={`${keyPrefix}-c-${key++}`} className="px-1 py-0.5 rounded bg-black/30 text-[0.92em]">{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    buf += c;
    i++;
  }
  flush();
  return parts;
}

export default function MarkdownLite({ source, className = '' }) {
  if (!source) return null;
  const blocks = String(source).replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <div className={`markdown-lite space-y-3 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        // Heading levels
        if (/^### /.test(trimmed)) {
          return <h3 key={bi} className="text-base font-semibold mt-2">{renderInline(trimmed.slice(4), `h3-${bi}`)}</h3>;
        }
        if (/^## /.test(trimmed)) {
          return <h2 key={bi} className="text-lg font-semibold mt-3">{renderInline(trimmed.slice(3), `h2-${bi}`)}</h2>;
        }
        if (/^# /.test(trimmed)) {
          return <h1 key={bi} className="text-xl font-bold mt-3">{renderInline(trimmed.slice(2), `h1-${bi}`)}</h1>;
        }
        // Bulleted list — every line starts with "- " or "* "
        const lines = trimmed.split('\n');
        if (lines.every(l => /^\s*[-*] /.test(l))) {
          return (
            <ul key={bi} className="list-disc pl-5 space-y-1">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*[-*] /, ''), `ul-${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        // Numbered list — every line starts with "1. "/"2. " etc.
        if (lines.every(l => /^\s*\d+\.\s/.test(l))) {
          return (
            <ol key={bi} className="list-decimal pl-5 space-y-1">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^\s*\d+\.\s/, ''), `ol-${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        // Paragraph — preserve single-line breaks within a block as <br/>
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {renderInline(l, `p-${bi}-${li}`)}
                {li < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
