'use client';

import { useMemo } from 'react';
import { ClickableItem, EmptyState, StatusBadge, type DetailData } from '@/components';
import { formatDate, pipelineToDetail } from '@/lib/data-utils';
import type { Pipeline } from '@/lib/types';

interface PipelineCardProps {
  pipelines: Pipeline[];
  openDetail: (data: DetailData) => void;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDueTone(dueAt: string | null | undefined) {
  const due = parseDate(dueAt);
  if (!due) return 'text-[var(--text-muted)]';

  const now = Date.now();
  const diff = due.getTime() - now;
  if (diff < 0) return 'text-rose-700';
  if (diff <= 1000 * 60 * 60 * 24 * 7) return 'text-amber-700';
  return 'text-[var(--text-muted)]';
}

function getStageAccent(index: number) {
  const accents = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
  ];

  return accents[index % accents.length];
}

function getDueStats(pipelines: Pipeline[]) {
  const now = Date.now();
  const nextWeek = now + 1000 * 60 * 60 * 24 * 7;

  return pipelines.reduce(
    (result, pipeline) => {
      const due = parseDate(pipeline.due_at);
      if (!due) {
        result.noDeadline += 1;
        return result;
      }

      const time = due.getTime();
      if (time < now) {
        result.overdue += 1;
      } else if (time <= nextWeek) {
        result.dueSoon += 1;
      } else {
        result.onTrack += 1;
      }

      return result;
    },
    { overdue: 0, dueSoon: 0, onTrack: 0, noDeadline: 0 }
  );
}

function getSpotlightPipelines(pipelines: Pipeline[]) {
  return [...pipelines]
    .sort((left, right) => {
      const leftDue = parseDate(left.due_at)?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightDue = parseDate(right.due_at)?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    })
    .slice(0, 3);
}

export function PipelineCard({ pipelines, openDetail }: PipelineCardProps) {
  const stageSummary = useMemo(() => {
    return Object.entries(
      pipelines.reduce<Record<string, number>>((result, pipeline) => {
        const stage = pipeline.stage || '未分类';
        result[stage] = (result[stage] || 0) + 1;
        return result;
      }, {})
    ).sort((left, right) => right[1] - left[1]);
  }, [pipelines]);

  const dueStats = useMemo(() => getDueStats(pipelines), [pipelines]);
  const spotlight = useMemo(() => getSpotlightPipelines(pipelines), [pipelines]);

  if (pipelines.length === 0) {
    return <EmptyState moduleType="pipelines" icon="empty-pipeline" title="暂无流程" description="当前没有进行中的流程项目" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">临期</div>
          <div className={`mt-1 text-xl font-semibold ${dueStats.dueSoon > 0 ? 'text-amber-700' : 'text-[var(--text-primary)]'}`}>{dueStats.dueSoon}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">逾期</div>
          <div className={`mt-1 text-xl font-semibold ${dueStats.overdue > 0 ? 'text-rose-700' : 'text-[var(--text-primary)]'}`}>{dueStats.overdue}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">无截止</div>
          <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{dueStats.noDeadline}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--text-primary)]">阶段分布</div>
          <div className="text-xs text-[var(--text-muted)]">按当前流程数排序</div>
        </div>
        <div className="space-y-2">
          {stageSummary.slice(0, 4).map(([stage, count], index) => {
            const width = `${Math.max((count / pipelines.length) * 100, 10)}%`;
            return (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="truncate font-medium text-[var(--text-secondary)]">{stage}</div>
                  <div className="shrink-0 text-[var(--text-muted)]">{count} 项</div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                  <div className={`h-full rounded-full ${getStageAccent(index)}`} style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-[var(--text-primary)]">重点流程</div>
          <div className="text-xs text-[var(--text-muted)]">默认按截止时间优先</div>
        </div>
        <div className="space-y-2">
          {spotlight.map((pipeline) => (
            <ClickableItem
              key={pipeline.id}
              onClick={() => openDetail(pipelineToDetail(pipeline))}
              className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text-primary)]">{pipeline.item_name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span>负责人：{pipeline.owner || '未分配'}</span>
                    <span className={getDueTone(pipeline.due_at)}>
                      截止：{pipeline.due_at ? formatDate(pipeline.due_at) : '未设置'}
                    </span>
                  </div>
                </div>
                <StatusBadge status={pipeline.stage || 'draft'} size="sm" />
              </div>
            </ClickableItem>
          ))}
        </div>
      </div>
    </div>
  );
}
