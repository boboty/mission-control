import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { buildMeta, withLegacyListShape } from '../_lib/response';
import { getMemoryTopicsDir } from '@/lib/memory-topics';

const TOPICS_DIR = getMemoryTopicsDir();

function safeSlug(input: string) {
  const slug = (input || '').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  return slug;
}

async function readFirstSummaryLine(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    // skip title lines (# ...)
    for (const l of lines) {
      const line = l.trim();
      if (!line) continue;
      if (line.startsWith('#')) continue;
      return line.slice(0, 200);
    }
    return '';
  } catch {
    return '';
  }
}

export async function GET() {
  try {
    const indexPath = path.join(TOPICS_DIR, 'INDEX.md');
    let index = '';
    try {
      index = await fs.readFile(indexPath, 'utf-8');
    } catch {
      index = '';
    }

    let entries;
    try {
      entries = await fs.readdir(TOPICS_DIR, { withFileTypes: true });
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        const meta = buildMeta({
          source: 'local',
          lastSyncAt: new Date().toISOString(),
          dataUpdatedAt: null,
        });

        return NextResponse.json(
          withLegacyListShape({
            key: 'topics',
            rows: [],
            data: { topics: [], index: index || null },
            meta,
            extra: { index: index || null },
          })
        );
      }
      throw error;
    }

    // Build list from directory; use INDEX.md to sort if possible.
    const mdFiles = entries
      .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'INDEX.md')
      .map((e) => e.name);

    const indexOrder: string[] = [];
    if (index) {
      const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
      let m: RegExpExecArray | null;
      while ((m = linkRe.exec(index)) !== null) {
        const p = m[1];
        const base = path.basename(p);
        if (base.endsWith('.md') && base !== 'INDEX.md') indexOrder.push(base);
      }
    }

    const order = Array.from(new Set([...indexOrder, ...mdFiles]));

    const topics = await Promise.all(
      order.map(async (filename) => {
        const slug = safeSlug(filename.replace(/\.md$/i, ''));
        if (!slug) return null;
        const filePath = path.join(TOPICS_DIR, `${slug}.md`);
        const summary = await readFirstSummaryLine(filePath);
        return {
          slug,
          title: slug,
          filename: `${slug}.md`,
          ref_path: `memory/topics/${slug}.md`,
          summary,
        };
      })
    );

    const rows = topics.filter(Boolean);
    const meta = buildMeta({
      source: 'local',
      lastSyncAt: new Date().toISOString(),
      dataUpdatedAt: null,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'topics',
        rows,
        data: { topics: rows, index: index || null },
        meta,
        extra: { index: index || null },
      })
    );
  } catch (error) {
    console.error('Failed to list memory topics:', error);
    return NextResponse.json({ error: 'Failed to list memory topics' }, { status: 500 });
  }
}
