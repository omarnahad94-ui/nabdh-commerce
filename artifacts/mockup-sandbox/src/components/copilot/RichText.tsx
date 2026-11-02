import { Fragment, useMemo, type ReactNode } from "react";

interface ListItem {
  text: string;
  depth: number;
}

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "ul"; items: ListItem[] }
  | { type: "ol"; items: ListItem[]; start: number }
  | { type: "table"; header: string[] | null; rows: string[][] }
  | { type: "hr" };

const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const UL_RE = /^(\s*)[-*•]\s+(.+)$/;
const OL_RE = /^(\s*)(\d{1,3})[.)]\s+(.+)$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const INLINE_RE = /(\*\*[^*\n]+?\*\*|`[^`\n]+`)/g;

function depthOf(indent: string): number {
  return Math.min(2, Math.floor(indent.replace(/\t/g, "  ").length / 2));
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "p", text: paragraph.join("\n") });
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") {
      flushParagraph();
      i++;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      const level = Math.min(heading[1]?.length ?? 3, 3) as 1 | 2 | 3;
      blocks.push({ type: "h", level, text: heading[2] ?? "" });
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      flushParagraph();
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (TABLE_ROW_RE.test(line)) {
      flushParagraph();
      const tableLines: string[] = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i] ?? "")) {
        tableLines.push(lines[i] ?? "");
        i++;
      }
      const second = tableLines[1];
      const hasHeader = second !== undefined && TABLE_SEP_RE.test(second);
      const header = hasHeader ? splitRow(tableLines[0] ?? "") : null;
      const rows = (hasHeader ? tableLines.slice(2) : tableLines).map(splitRow);
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (UL_RE.test(line)) {
      flushParagraph();
      const items: ListItem[] = [];
      while (i < lines.length) {
        const current = lines[i] ?? "";
        const match = UL_RE.exec(current);
        if (!match || HR_RE.test(current)) break;
        items.push({ text: (match[2] ?? "").trim(), depth: depthOf(match[1] ?? "") });
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const firstOrdered = OL_RE.exec(line);
    if (firstOrdered) {
      flushParagraph();
      const items: ListItem[] = [];
      while (i < lines.length) {
        const match = OL_RE.exec(lines[i] ?? "");
        if (!match) break;
        items.push({ text: (match[3] ?? "").trim(), depth: depthOf(match[1] ?? "") });
        i++;
      }
      blocks.push({ type: "ol", items, start: Number(firstOrdered[2] ?? "1") });
      continue;
    }

    paragraph.push(line.trimEnd());
    i++;
  }

  flushParagraph();
  return blocks;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE_RE).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-slate-50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          dir="ltr"
          className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.85em] text-teal-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

function renderBlock(block: Block, index: number): ReactNode {
  const key = `b${index}`;

  switch (block.type) {
    case "p":
      return (
        <p key={key} dir="auto" className="whitespace-pre-line text-start">
          {renderInline(block.text, key)}
        </p>
      );

    case "h": {
      const cls =
        block.level === 1
          ? "text-lg font-bold text-slate-50"
          : block.level === 2
            ? "text-base font-bold text-slate-50"
            : "text-[15px] font-semibold text-teal-200";
      return (
        <div key={key} dir="auto" role="heading" aria-level={block.level + 2} className={`${cls} pt-1 text-start`}>
          {renderInline(block.text, key)}
        </div>
      );
    }

    case "ul":
      return (
        <ul key={key} className="space-y-1.5">
          {block.items.map((item, itemIndex) => (
            <li
              key={`${key}-${itemIndex}`}
              className="flex gap-2.5"
              style={{ paddingInlineStart: `${item.depth * 18}px` }}
            >
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/70" aria-hidden="true" />
              <span dir="auto" className="min-w-0 flex-1 text-start">
                {renderInline(item.text, `${key}-${itemIndex}`)}
              </span>
            </li>
          ))}
        </ul>
      );

    case "ol":
      return (
        <ol key={key} className="space-y-1.5">
          {block.items.map((item, itemIndex) => (
            <li
              key={`${key}-${itemIndex}`}
              className="flex gap-2.5"
              style={{ paddingInlineStart: `${item.depth * 18}px` }}
            >
              <span className="shrink-0 font-semibold tabular-nums text-teal-300">
                {block.start + itemIndex}.
              </span>
              <span dir="auto" className="min-w-0 flex-1 text-start">
                {renderInline(item.text, `${key}-${itemIndex}`)}
              </span>
            </li>
          ))}
        </ol>
      );

    case "table":
      return (
        <div key={key} className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full min-w-[320px] text-sm">
            {block.header && (
              <thead className="bg-white/[0.04]">
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    <th
                      key={`${key}-h${cellIndex}`}
                      className="px-3 py-2 text-start text-xs font-semibold text-teal-200"
                    >
                      {renderInline(cell, `${key}-h${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-white/[0.06]">
              {block.rows.map((row, rowIndex) => (
                <tr key={`${key}-r${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${key}-r${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top text-start">
                      {renderInline(cell, `${key}-r${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "hr":
      return <hr key={key} className="border-white/[0.08]" />;
  }
}

export function RichText({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="space-y-3 break-words text-[15px] leading-8 text-slate-200">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}
