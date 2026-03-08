'use client';

import { ClickableItem, EmptyState, StatusBadge, type DetailData } from '@/components';
import { type Pipeline as PipelineType } from '@/lib/types';
import { pipelineToDetail } from '@/lib/data-utils';

interface PipelineProps {
  pipelines: PipelineType[];
  openDetail: (data: DetailData) => void;
}

const STAGE_STYLE_MAP: Record<string, { border: string; title: string; glow: string }> = {
  ideas: {
    border: 'border-l-blue-500/80',
    title: 'text-blue-700 dark:text-blue-300',
    glow: 'hover:shadow-blue-500/20',
  },
  script: {
    border: 'border-l-orange-500/80',
    title: 'text-orange-700 dark:text-orange-300',
    glow: 'hover:shadow-orange-500/20',
  },
  thumbnail: {
    border: 'border-l-emerald-500/80',
    title: 'text-emerald-700 dark:text-emerald-300',
    glow: 'hover:shadow-emerald-500/20',
  },
  filming: {
    border: 'border-l-cyan-500/80',
    title: 'text-cyan-700 dark:text-cyan-300',
    glow: 'hover:shadow-cyan-500/20',
  },
  published: {
    border: 'border-l-blue-800/80 dark:border-l-blue-400/80',
    title: 'text-blue-900 dark:text-blue-200',
    glow: 'hover:shadow-blue-900/20 dark:hover:shadow-blue-300/20',
  },
};

function getStageStyle(stage: string) {
  const key = stage?.toLowerCase?.() ?? '';
  return (
    STAGE_STYLE_MAP[key] ?? {
      border: 'border-l-[var(--border-light)]',
      title: 'text-[var(--text-primary)]',
      glow: 'hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]',
    }
  );
}

export function PipelineItem({ item, onClick }: { item: PipelineType; onClick: () => void }) {
  const stageStyle = getStageStyle(item.stage);

  return (
    <ClickableItem
      onClick={onClick}
      className={`group relative rounded-xl border border-[var(--border-light)] bg-[var(--surface-elevated)]/80 px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-lg hover:shadow-[var(--shadow-md)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset ${stageStyle.glow}`}
      aria-label={`流程项目：${item.item_name}，阶段：${item.stage}`}
    >
      <div
        className={`absolute left-0 top-0 h-full w-1.5 rounded-l-xl border-l-4 ${stageStyle.border}`}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-3 pl-2">
        <span className={`text-sm font-medium truncate flex-1 transition-colors duration-200 group-hover:text-[var(--text-primary)] ${stageStyle.title}`}>
          {item.item_name}
        </span>
        <StatusBadge status={item.stage} size="sm" />
      </div>
    </ClickableItem>
  );
}

export function Pipeline({ pipelines, openDetail }: PipelineProps) {
  if (pipelines.length === 0) {
    return (
      <EmptyState
        moduleType="pipelines"
        icon="empty-pipeline"
        title="暂无流程"
        description="当前没有进行中的流程项目"
        action={<button className="btn btn-primary">新建流程</button>}
      />
    );
  }

  return (
    <div className="overflow-y-auto space-y-2">
      {pipelines.map((item) => (
        <PipelineItem key={item.id} item={item} onClick={() => openDetail(pipelineToDetail(item))} />
      ))}
    </div>
  );
}

export default Pipeline;
