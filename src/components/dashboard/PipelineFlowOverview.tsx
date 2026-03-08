'use client';

import { ClickableItem, Icon, StatusBadge, type DetailData } from '@/components';
import { formatDate, pipelineToDetail } from '@/lib/data-utils';
import type { Pipeline } from '@/lib/types';
import {
  getDueState,
  getPipelineFlowSummary,
  getPipelineName,
  getSpotlightPipelines,
  PIPELINE_COLUMNS,
  PIPELINE_STAGE_META,
} from '@/features/dashboard/lib/pipeline-flow';

interface PipelineFlowOverviewProps {
  pipelines: Pipeline[];
  openDetail: (data: DetailData) => void;
}

function SummaryChip({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200/80 bg-rose-500/10 text-rose-700'
      : tone === 'warning'
        ? 'border-amber-200/80 bg-amber-500/10 text-amber-700'
        : tone === 'success'
          ? 'border-emerald-200/80 bg-emerald-500/10 text-emerald-700'
          : 'border-[var(--border-light)] bg-[var(--bg-secondary)] text-[var(--text-primary)]';

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function SpotlightCard({
  item,
  openDetail,
}: {
  item: Pipeline;
  openDetail: (data: DetailData) => void;
}) {
  const dueState = getDueState(item.due_at, item.stage);
  const dueClass =
    dueState === 'danger'
      ? 'text-rose-700'
      : dueState === 'warning'
        ? 'text-amber-700'
        : 'text-[var(--text-muted)]';

  return (
    <ClickableItem
      onClick={() => openDetail(pipelineToDetail(item))}
      className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[var(--text-primary)]">{getPipelineName(item)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            <span>负责人：{item.owner || '未分配'}</span>
            <span className={dueClass}>截止：{item.due_at ? formatDate(item.due_at) : '未设置'}</span>
          </div>
        </div>
        <StatusBadge status={item.stage || 'draft'} size="sm" />
      </div>
    </ClickableItem>
  );
}

export function PipelineFlowOverview({ pipelines, openDetail }: PipelineFlowOverviewProps) {
  const summary = getPipelineFlowSummary(pipelines);
  const spotlight = getSpotlightPipelines(pipelines);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryChip label="总流程" value={summary.total} />
        <SummaryChip label="临期 7 天" value={summary.dueSoon} tone={summary.dueSoon > 0 ? 'warning' : 'success'} />
        <SummaryChip label="已逾期" value={summary.overdue} tone={summary.overdue > 0 ? 'danger' : 'success'} />
        <SummaryChip label="负责人" value={summary.owners} />
      </div>

      <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">业务流转总览</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">先看流程卡在哪一步，再拖动卡片推进阶段。</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            <Icon name="pipelines" size={14} />
            当前页支持拖拽推进
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-4">
          {PIPELINE_COLUMNS.map((column, index) => {
            const meta = PIPELINE_STAGE_META[column.id];
            const items = summary.grouped[column.id];

            return (
              <div key={column.id} className="relative rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                {index < PIPELINE_COLUMNS.length - 1 && (
                  <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 xl:block">
                    <Icon name="arrow-right" size={16} color="var(--text-muted)" />
                  </div>
                )}
                <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${meta.softAccent}`}>{meta.label}</div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-3xl font-semibold text-[var(--text-primary)]">{items.length}</div>
                  <div className={`h-2.5 w-16 rounded-full ${meta.accent}`} />
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{meta.hint}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">关键流程</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">优先展示未完成且截止更近的流程。</p>
          </div>
          <div className="text-xs text-[var(--text-muted)]">点开可看详情</div>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {spotlight.map((item) => (
            <SpotlightCard key={item.id} item={item} openDetail={openDetail} />
          ))}
        </div>
      </div>
    </div>
  );
}
