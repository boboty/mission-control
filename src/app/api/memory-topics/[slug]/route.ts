import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { buildMeta } from '../../_lib/response';

const TOPICS_DIR = '/home/pve/.openclaw/workspace/memory/topics';

function safeSlug(input: string) {
  const slug = (input || '').trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  return slug;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: rawSlug } = await ctx.params;
    const slug = safeSlug(rawSlug);
    if (!slug) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    const filePath = path.join(TOPICS_DIR, `${slug}.md`);
    const content = await fs.readFile(filePath, 'utf-8');

    const meta = buildMeta({
      source: 'local',
      lastSyncAt: new Date().toISOString(),
      dataUpdatedAt: null,
    });

    return NextResponse.json({
      data: {
        slug,
        title: slug,
        ref_path: `memory/topics/${slug}.md`,
        content,
      },
      meta,
      slug,
      title: slug,
      ref_path: `memory/topics/${slug}.md`,
      content,
      data_source: meta.source,
      last_sync_at: meta.last_sync_at,
      data_updated_at: meta.data_updated_at,
    });
  } catch (error: any) {
    const msg = String(error?.message || error);
    const status = msg.includes('ENOENT') ? 404 : 500;
    return NextResponse.json({ error: 'Failed to read memory topic' }, { status });
  }
}
