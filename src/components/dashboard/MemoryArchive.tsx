'use client';

import { useState, useEffect } from 'react';
import { ClickableItem, EmptyState, Icon, StatusBadge, type DetailData } from '@/components';
import { type PaginationInfo } from '@/lib/types';
import { formatDate } from '@/lib/data-utils';

interface Memory {
  id: number;
  title: string;
  category: string;
  ref_path: string;
  summary: string;
  happened_at: string;
}

interface MemoryArchiveProps {
  memories: Memory[];
  setMemories: React.Dispatch<React.SetStateAction<Memory[]>>;
  loading: boolean;
  openDetail: (data: DetailData) => void;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const CATEGORY_OPTIONS = [
  { value: '', label: '全部类别' },
  { value: 'preference', label: '偏好' },
  { value: 'fact', label: '事实' },
  { value: 'decision', label: '决策' },
  { value: 'entity', label: '实体' },
  { value: 'other', label: '其他' },
];

function getCategoryLabel(category: string): string {
  const option = CATEGORY_OPTIONS.find(o => o.value === category);
  return option ? option.label : category;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    preference: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    fact: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    decision: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    entity: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    other: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  };
  return colors[category] || colors.other;
}

function MemoryItem({ 
  memory, 
  onClick,
  onDelete 
}: { 
  memory: Memory; 
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-lg">
      <div className="flex items-start justify-between py-3 sm:py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0 transition-all duration-200 min-h-[48px] touch-target group">
        <div className="flex-1 min-w-0 flex items-start gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">{memory.title}</span>
              {memory.category && (
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getCategoryColor(memory.category)}`}>
                  {getCategoryLabel(memory.category)}
                </span>
              )}
            </div>
            {memory.summary && (
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{memory.summary}</p>
            )}
            {memory.happened_at && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center flex-wrap">
                <span className="mr-1 flex-shrink-0">📅</span>
                <span className="truncate">{formatDate(memory.happened_at)}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-lg hover:bg-[var(--badge-error-bg)] text-[var(--text-muted)] hover:text-[var(--badge-error-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] focus:ring-inset"
          title="删除记忆"
          aria-label="删除记忆"
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </ClickableItem>
  );
}

function Pagination({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-light)] dark:border-[var(--border-medium)]" role="navigation" aria-label="分页导航">
      <span className="text-xs text-[var(--text-muted)]" aria-live="polite">
        第 {pagination.page} / {pagination.totalPages} 页 · 共 {pagination.total} 项
      </span>
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => onPageChange(pagination.page - 1)} 
          disabled={pagination.page <= 1} 
          className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          aria-label="上一页"
        >
          上一页
        </button>
        <button 
          onClick={() => onPageChange(pagination.page + 1)} 
          disabled={!pagination.hasMore} 
          className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          aria-label="下一页"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export function MemoryArchive({ memories, setMemories, loading, openDetail }: MemoryArchiveProps) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  const fetchMemories = async (page = 1) => {
    setFetchLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        pageSize: '20',
      });
      if (categoryFilter) params.append('category', categoryFilter);
      if (search) params.append('search', search);
      
      const res = await fetch(`/api/memories?${params.toString()}`);
      const data = await res.json();
      
      if (data.memories || data.data) {
        const memoriesData = data.memories || data.data || [];
        setMemories(memoriesData);
        setPagination(data.pagination || null);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchMemories(1);
    }
  }, [categoryFilter, search]);

  const handleDelete = async (e: React.MouseEvent, memoryId: number) => {
    e.stopPropagation();
    
    if (!confirm('确定要删除这条记忆吗？此操作不可恢复。')) {
      return;
    }

    setDeleteLoading(memoryId);
    try {
      const res = await fetch(`/api/memories?id=${memoryId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('删除失败');
      }

      // Remove from local state
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      
      // Refresh to update pagination
      if (pagination && pagination.page > 1 && memories.length === 1) {
        fetchMemories(pagination.page - 1);
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      alert('删除失败，请重试');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (memories.length === 0 && !fetchLoading) {
    return (
      <EmptyState 
        moduleType="memories" 
        icon="empty-archive" 
        title="暂无记忆" 
        description="还没有归档的记忆数据" 
      />
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="搜索记忆..." 
              className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg min-h-[44px] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] border-[var(--border-light)] dark:border-[var(--border-medium)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
              aria-label="搜索记忆"
            />
          </div>
          <div className="flex gap-3">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="flex-1 px-3 py-2.5 text-sm border rounded-lg min-h-[44px] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] border-[var(--border-light)] dark:border-[var(--border-medium)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
              aria-label="筛选类别"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        {pagination && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              共 {pagination.total} 项
            </span>
          </div>
        )}
      </div>

      {/* Memory List */}
      <div className="overflow-y-auto -mx-2">
        {fetchLoading ? (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : (
          <>
            {memories.map((memory) => (
              <MemoryItem
                key={memory.id}
                memory={memory}
                onClick={() => {
                  openDetail({
                    id: memory.id,
                    type: 'memory',
                    title: memory.title,
                    category: memory.category,
                    happenedAt: memory.happened_at,
                    description: memory.summary,
                    source: memory.ref_path,
                    createdAt: memory.happened_at,
                    metadata: {
                      tags: memory.category ? [memory.category] : [],
                    },
                  });
                }}
                onDelete={(e) => handleDelete(e, memory.id)}
              />
            ))}
            {pagination && <Pagination pagination={pagination} onPageChange={fetchMemories} />}
          </>
        )}
      </div>
    </div>
  );
}

export default MemoryArchive;
