import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const MEMORY_TOPICS_DIR = path.join(process.cwd(), '../../.openclaw/workspace/memory/topics');

interface MemoryTopic {
  id: number;
  title: string;
  category: 'topic';
  ref_path: string;
  summary: string;
  happened_at: string;
  slug: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    
    // 读取本地记忆主题目录
    const topicsDir = MEMORY_TOPICS_DIR;
    let files: string[] = [];
    
    try {
      files = await fs.readdir(topicsDir);
      files = files.filter(f => f.endsWith('.md'));
    } catch (err) {
      console.error('Memory topics dir not found:', topicsDir, err);
      return NextResponse.json({
        data: { memories: [] },
        meta: { source: 'local', last_sync_at: new Date().toISOString() },
        memories: [],
        count: 0,
        data_source: 'local',
      });
    }
    
    const memories: MemoryTopic[] = [];
    
    for (const file of files) {
      const slug = file.replace('.md', '');
      const filePath = path.join(topicsDir, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        
        // 提取标题（第一个非空行或 # 标题）
        let title = slug;
        let summary = '';
        
        for (const line of lines) {
          if (line.startsWith('# ')) {
            title = line.substring(2).trim();
            break;
          } else if (line.trim() && !line.startsWith('>') && !line.startsWith('---')) {
            title = line.trim().substring(0, 50);
            break;
          }
        }
        
        // 提取摘要（第一段的非标题内容）
        const summaryLines: string[] = [];
        let inContent = false;
        for (const line of lines) {
          if (line.startsWith('# ')) {
            inContent = true;
            continue;
          }
          if (inContent && line.trim() && !line.startsWith('---')) {
            if (line.startsWith('>')) {
              summaryLines.push(line.substring(1).trim());
            } else if (line.startsWith('-') || line.startsWith('*')) {
              summaryLines.push(line.substring(1).trim());
            } else {
              summaryLines.push(line.trim());
            }
            if (summaryLines.length >= 2) break;
          }
        }
        summary = summaryLines.join(' | ').substring(0, 200);
        
        if (search && !title.toLowerCase().includes(search.toLowerCase()) && !summary.toLowerCase().includes(search.toLowerCase())) {
          continue;
        }
        
        memories.push({
          id: memories.length + 1,
          title,
          category: 'topic',
          ref_path: `memory/topics/${file}`,
          summary,
          happened_at: new Date().toISOString(),
          slug,
        });
      } catch (err) {
        console.error(`Error reading ${file}:`, err);
      }
    }
    
    // 按标题排序
    memories.sort((a, b) => a.title.localeCompare(b.title));
    
    return NextResponse.json({
      data: { memories },
      meta: { source: 'local', last_sync_at: new Date().toISOString() },
      memories,
      count: memories.length,
      data_source: 'local',
      last_sync_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to fetch memories:', err);
    return NextResponse.json({
      error: 'Failed to fetch memories',
      data: { memories: [] },
      memories: [],
      count: 0,
    }, { status: 500 });
  }
}
