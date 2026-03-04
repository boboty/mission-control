'use client';

import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmptyState, Icon, StatusBadge, ClickableItem, type DetailData } from '@/components';
import type { Pipeline, PaginationInfo } from '@/lib/types';
import { pipelineToDetail, formatDate } from '@/lib/data-utils';

interface PipelineListProps {
  pipelines: Pipeline[];
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
  loading: boolean;
  openDetail: (data: DetailData) => void;
}

type PipelineStage = '' | 'draft' | 'in_progress' | 'review' | 'done';

function SortablePipelineCard({ item, onClick }: { item: Pipeline; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group mb-2 cursor-grab rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/95 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-md active:cursor-grabbing ${isDragging ? 'opacity-60 shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            <span>负责人：{item.owner || '未分配'}</span>
            <span>截止：{item.due_at ? formatDate(item.due_at) : '未设置'}</span>
          </div>
        </div>
        <StatusBadge status={item.stage || 'draft'} size="sm" />
      </div>
    </div>
  );
}

export function PipelineList({ pipelines, setPipelines, loading, openDetail }: PipelineListProps) {
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineStageFilter, setPipelineStageFilter] = useState<PipelineStage>('');
  const [pipelineOwnerFilter, setPipelineOwnerFilter] = useState('');
  const [pipelinePagination, setPipelinePagination] = useState<PaginationInfo | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const PIPELINE_COLUMNS: Array<{ id: Exclude<PipelineStage, ''>; title: string; headerClass: string }> = [
    { id: 'draft', title: '草稿', headerClass: 'bg-slate-500/90' },
    { id: 'in_progress', title: '进行中', headerClass: 'bg-blue-500/90' },
    { id: 'review', title: '评审中', headerClass: 'bg-violet-500/90' },
    { id: 'done', title: '已完成', headerClass: 'bg-emerald-500/90' },
  ];

  const owners = useMemo(() => {
    const names = pipelines.map((p) => p.owner).filter(Boolean) as string[];
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [pipelines]);

  const fetchPipelines = async (page = 1) => {
    setPipelineLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (pipelineStageFilter) params.append('stage', pipelineStageFilter);
      if (pipelineSearch) params.append('search', pipelineSearch);
      if (pipelineOwnerFilter) params.append('owner', pipelineOwnerFilter);

      const res = await fetch(`/api/pipelines?${params.toString()}`);
      const data = await res.json();
      if (data.pipelines) {
        setPipelines(data.pipelines);
        setPipelinePagination(data.pagination ?? null);
      }
    } finally {
      setPipelineLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchPipelines(1);
  }, [pipelineStageFilter, pipelineSearch, pipelineOwnerFilter]);

  const groupedByStage = useMemo(() => {
    return PIPELINE_COLUMNS.reduce((acc, col) => {
      acc[col.id] = pipelines.filter((p) => (p.stage || 'draft') === col.id);
      return acc;
    }, {} as Record<Exclude<PipelineStage, ''>, Pipeline[]>);
  }, [pipelines]);

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const pipelineId = Number(active.id);
    let newStage = PIPELINE_COLUMNS.find((c) => c.id === String(over.id))?.id || '';

    if (!newStage) {
      for (const col of PIPELINE_COLUMNS) {
        if ((groupedByStage[col.id] || []).some((p) => p.id === Number(over.id))) {
          newStage = col.id;
          break;
        }
      }
    }

    const current = pipelines.find((p) => p.id === pipelineId);
    if (!current || !newStage || current.stage === newStage) return;

    const oldStage = current.stage;
    setPipelines((prev) => prev.map((p) => (p.id === pipelineId ? { ...p, stage: newStage } : p)));

    try {
      const res = await fetch('/api/pipelines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pipelineId, stage: newStage }),
      });

      if (!res.ok) {
        setPipelines((prev) => prev.map((p) => (p.id === pipelineId ? { ...p, stage: oldStage } : p)));
        alert('更新流程阶段失败');
      }
    } catch {
      setPipelines((prev) => prev.map((p) => (p.id === pipelineId ? { ...p, stage: oldStage } : p)));
      alert('更新流程阶段失败');
    }
  };

  if (pipelines.length === 0 && !pipelineLoading && !loading) {
    return <EmptyState moduleType="pipelines" icon="empty-pipeline" title="暂无流程" description="当前没有进行中的流程项目" />;
  }

  return (
    <div>
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={pipelineSearch}
              onChange={(e) => setPipelineSearch(e.target.value)}
              placeholder="搜索流程（名称）..."
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg"
            />
          </div>
          <select
            value={pipelineStageFilter}
            onChange={(e) => setPipelineStageFilter(e.target.value as PipelineStage)}
            className="sm:w-40 px-3 py-2 text-sm border rounded-lg"
          >
            <option value="">全部阶段</option>
            <option value="draft">草稿</option>
            <option value="in_progress">进行中</option>
            <option value="review">评审中</option>
            <option value="done">已完成</option>
          </select>
          <select
            value={pipelineOwnerFilter}
            onChange={(e) => setPipelineOwnerFilter(e.target.value)}
            className="sm:w-44 px-3 py-2 text-sm border rounded-lg"
          >
            <option value="">全部负责人</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">{pipelinePagination ? `共 ${pipelinePagination.total} 条流程` : ''}</span>
        </div>
      </div>

      <div className="overflow-y-auto -mx-2">
        {(pipelineLoading || loading) ? (
          <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragStart={(e) => setActiveId(Number(e.active.id))} onDragEnd={handleDragEnd} sensors={sensors}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-1">
              {PIPELINE_COLUMNS.map((col) => {
                const colItems = groupedByStage[col.id] || [];
                return (
                  <div key={col.id} className="min-w-[220px] rounded-2xl border border-[var(--border-light)]/80 bg-[var(--bg-secondary)]/40 shadow-sm backdrop-blur-sm">
                    <div className={`flex items-center justify-between rounded-t-2xl px-3.5 py-2.5 text-xs font-semibold text-white ${col.headerClass}`}>
                      <span>{col.title}</span>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">{colItems.length}</span>
                    </div>
                    <div className="min-h-[220px] rounded-b-2xl bg-[var(--bg-tertiary)]/80 p-2.5">
                      <SortableContext items={colItems.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                        {colItems.map((item) => (
                          <SortablePipelineCard key={item.id} item={item} onClick={() => openDetail(pipelineToDetail(item))} />
                        ))}
                      </SortableContext>
                    </div>
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm font-medium shadow-xl">
                  {pipelines.find((p) => p.id === activeId)?.name}
                </div>
              ) : null}
            </DragOverlay>

            {pipelinePagination && pipelinePagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-light)]">
                <span className="text-xs text-[var(--text-muted)]">第 {pipelinePagination.page} / {pipelinePagination.totalPages} 页</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchPipelines(pipelinePagination.page - 1)}
                    disabled={pipelinePagination.page <= 1}
                    className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => fetchPipelines(pipelinePagination.page + 1)}
                    disabled={!pipelinePagination.hasMore}
                    className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-light)] disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </DndContext>
        )}
      </div>
    </div>
  );
}

export default PipelineList;
