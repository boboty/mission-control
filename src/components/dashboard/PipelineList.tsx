'use client';

import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmptyState, Icon, StatusBadge, ClickableItem, type DetailData } from '@/components';
import { PipelineFlowOverview } from '@/components/dashboard/PipelineFlowOverview';
import type { Pipeline, PaginationInfo } from '@/lib/types';
import { pipelineToDetail, formatDate } from '@/lib/data-utils';
import { exportTasksToCSV, exportTasksToPDF } from '@/lib/export-utils';
import { groupPipelinesByStage, getPipelineName, PIPELINE_COLUMNS, type PipelineStageKey } from '@/features/dashboard/lib/pipeline-flow';

interface PipelineListProps {
  pipelines: Pipeline[];
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
  loading: boolean;
  openDetail: (data: DetailData) => void;
}

type PipelineStage = '' | PipelineStageKey;

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
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{getPipelineName(item)}</p>
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
  
  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

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

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-export-container]')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportMenu]);

  // Export handlers for pipelines
  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      // Fetch all pipelines with current filters
      const params = new URLSearchParams({ page: '1', pageSize: '1000' });
      if (pipelineStageFilter) params.append('stage', pipelineStageFilter);
      if (pipelineSearch) params.append('search', pipelineSearch);
      if (pipelineOwnerFilter) params.append('owner', pipelineOwnerFilter);
      
      const res = await fetch(`/api/pipelines?${params.toString()}`);
      const data = await res.json();
      
      if (data.pipelines) {
        // Reuse task export utility but adapt for pipeline data
        const BOM = '\uFEFF';
        const headers = ['ID', '名称', '阶段', '负责人', '截止日期'];
        const stageMap: Record<string, string> = {
          draft: '草稿',
          in_progress: '进行中',
          review: '评审中',
          done: '已完成',
        };
        
        const rows = data.pipelines.map((p: Pipeline) => {
          const fmtDate = (d: string | null) => {
            if (!d) return '';
            return new Date(d).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
          };
          return [
            p.id.toString(),
            `"${getPipelineName(p).replace(/"/g, '""')}"`,
            stageMap[p.stage || 'draft'] || p.stage,
            p.owner || '',
            fmtDate(p.due_at),
          ].join(',');
        });
        
        const csvContent = BOM + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `流程导出_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export CSV error:', error);
      alert('导出失败，请重试');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      // Fetch all pipelines with current filters
      const params = new URLSearchParams({ page: '1', pageSize: '1000' });
      if (pipelineStageFilter) params.append('stage', pipelineStageFilter);
      if (pipelineSearch) params.append('search', pipelineSearch);
      if (pipelineOwnerFilter) params.append('owner', pipelineOwnerFilter);
      
      const res = await fetch(`/api/pipelines?${params.toString()}`);
      const data = await res.json();
      
      if (data.pipelines) {
        // Reuse task PDF export logic adapted for pipelines
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('请允许弹出窗口以导出 PDF');
          return;
        }
        
        const stageMap: Record<string, string> = {
          draft: '草稿',
          in_progress: '进行中',
          review: '评审中',
          done: '已完成',
        };
        
        const fmtDate = (d: string | null) => {
          if (!d) return '';
          return new Date(d).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        };
        
        const htmlContent = `
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head>
            <meta charset="UTF-8">
            <title>流程导出 - ${new Date().toLocaleDateString('zh-CN')}</title>
            <style>
              @media print { @page { size: A4; margin: 20mm; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { font-size: 18px; margin-bottom: 8px; }
              .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: 600; font-size: 11px; }
              tr:nth-child(even) { background-color: #fafafa; }
              .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
            </style>
          </head>
          <body>
            <h1>流程列表</h1>
            <p class="subtitle">导出时间：${new Date().toLocaleString('zh-CN')} · 共 ${data.pipelines.length} 项流程</p>
            <table>
              <thead><tr><th style="width:50px">ID</th><th>名称</th><th style="width:80px">阶段</th><th style="width:80px">负责人</th><th style="width:120px">截止日期</th></tr></thead>
              <tbody>
                ${data.pipelines.map((p: Pipeline) => `
                  <tr>
                    <td>${p.id}</td>
                    <td>${getPipelineName(p).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                    <td>${stageMap[p.stage || 'draft'] || p.stage}</td>
                    <td>${p.owner || ''}</td>
                    <td>${fmtDate(p.due_at)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">Mission Control · 流程管理系统</div>
            <script>window.onload = function() { window.print(); };</script>
          </body>
          </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      alert('导出失败，请重试');
    } finally {
      setExportLoading(false);
      setShowExportMenu(false);
    }
  };

  const groupedByStage = useMemo(() => groupPipelinesByStage(pipelines), [pipelines]);

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
      <div className="mb-5">
        <PipelineFlowOverview pipelines={pipelines} openDetail={openDetail} />
      </div>

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
          {/* Export button with dropdown */}
          <div className="relative" data-export-container>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExportMenu(!showExportMenu);
              }}
              disabled={exportLoading || pipelines.length === 0}
              className="px-3 py-2 text-sm border rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              aria-label="导出流程"
            >
              {exportLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Icon name="download" size={16} />
              )}
              <span className="hide-mobile">导出</span>
            </button>
            
            {/* Export dropdown menu */}
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-40 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] shadow-lg z-50 overflow-hidden" data-export-container>
                <button
                  onClick={handleExportCSV}
                  disabled={exportLoading}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2"
                >
                  <span className="text-base">📊</span>
                  导出 CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exportLoading}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 border-t border-[var(--border-light)]"
                >
                  <span className="text-base">📄</span>
                  导出 PDF
                </button>
              </div>
            )}
          </div>
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
            <div className="mb-3 flex items-center justify-between gap-3 px-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">拖拽推进面板</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">把流程卡拖到下一阶段，页面上方总览会同步反映流转状态。</p>
              </div>
              <div className="hidden rounded-full border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)] sm:block">
                从左到右表示业务推进顺序
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-1 md:grid-cols-2 xl:grid-cols-4">
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
                  {getPipelineName(pipelines.find((p) => p.id === activeId) as Pipeline)}
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
