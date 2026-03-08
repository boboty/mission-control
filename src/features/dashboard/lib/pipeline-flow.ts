import type { Pipeline } from '@/lib/types';

export type PipelineStageKey = 'draft' | 'in_progress' | 'review' | 'done';

export const PIPELINE_COLUMNS: Array<{ id: PipelineStageKey; title: string; headerClass: string }> = [
  { id: 'draft', title: '草稿', headerClass: 'bg-slate-500/90' },
  { id: 'in_progress', title: '进行中', headerClass: 'bg-blue-500/90' },
  { id: 'review', title: '评审中', headerClass: 'bg-violet-500/90' },
  { id: 'done', title: '已完成', headerClass: 'bg-emerald-500/90' },
];

export const PIPELINE_STAGE_META: Record<
  PipelineStageKey,
  { label: string; hint: string; accent: string; softAccent: string }
> = {
  draft: {
    label: '草稿',
    hint: '明确范围、负责人和截止时间',
    accent: 'bg-slate-500',
    softAccent: 'bg-slate-500/10 text-slate-700',
  },
  in_progress: {
    label: '进行中',
    hint: '执行主体工作并持续补齐材料',
    accent: 'bg-blue-500',
    softAccent: 'bg-blue-500/10 text-blue-700',
  },
  review: {
    label: '评审中',
    hint: '等待复核、校验和最终确认',
    accent: 'bg-violet-500',
    softAccent: 'bg-violet-500/10 text-violet-700',
  },
  done: {
    label: '已完成',
    hint: '已闭环，可归档复用经验',
    accent: 'bg-emerald-500',
    softAccent: 'bg-emerald-500/10 text-emerald-700',
  },
};

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPipelineName(item: Pipeline) {
  return item.item_name || item.name || `流程 #${item.id}`;
}

export function groupPipelinesByStage(pipelines: Pipeline[]) {
  return PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.id] = pipelines.filter((p) => (p.stage || 'draft') === col.id);
    return acc;
  }, {} as Record<PipelineStageKey, Pipeline[]>);
}

export function getPipelineFlowSummary(pipelines: Pipeline[]) {
  const now = Date.now();
  const nextWeek = now + 1000 * 60 * 60 * 24 * 7;

  const owners = new Set<string>();
  let overdue = 0;
  let dueSoon = 0;
  let withoutDeadline = 0;

  for (const pipeline of pipelines) {
    if (pipeline.owner) owners.add(pipeline.owner);

    const due = parseDate(pipeline.due_at);
    if (!due) {
      withoutDeadline += 1;
      continue;
    }

    const time = due.getTime();
    if (time < now && pipeline.stage !== 'done') {
      overdue += 1;
    } else if (time <= nextWeek && pipeline.stage !== 'done') {
      dueSoon += 1;
    }
  }

  const grouped = groupPipelinesByStage(pipelines);

  return {
    total: pipelines.length,
    overdue,
    dueSoon,
    withoutDeadline,
    owners: owners.size,
    grouped,
  };
}

export function getSpotlightPipelines(pipelines: Pipeline[]) {
  return [...pipelines]
    .sort((left, right) => {
      const leftDone = left.stage === 'done' ? 1 : 0;
      const rightDone = right.stage === 'done' ? 1 : 0;
      if (leftDone !== rightDone) return leftDone - rightDone;

      const leftDue = parseDate(left.due_at)?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightDue = parseDate(right.due_at)?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftDue - rightDue;
    })
    .slice(0, 4);
}

export function getDueState(dueAt: string | null | undefined, stage: string) {
  if (stage === 'done') return 'success';

  const due = parseDate(dueAt);
  if (!due) return 'neutral';

  const diff = due.getTime() - Date.now();
  if (diff < 0) return 'danger';
  if (diff <= 1000 * 60 * 60 * 24 * 7) return 'warning';
  return 'neutral';
}
