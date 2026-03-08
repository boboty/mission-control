'use client';

import { Card, CardHeader, StatusBadge, type Alert } from '@/components';
import { formatUpdateTime } from '@/lib/data-utils';
import type { Health } from '@/lib/types';
import { getHealthSummary } from '@/features/dashboard/lib/module-summaries';

export function SystemStatus({ health }: { health: Health[] }) {
  const latest = health[0];
  const isHealthy = latest?.cron_ok && (!latest.blocked_count || latest.blocked_count === 0);

  return (
    <div
      className={`inline-flex items-center space-x-2.5 rounded-xl border border-[var(--border-light)] px-4 py-2.5 shadow-sm ${
        isHealthy
          ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]'
          : 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
      }`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
            isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
            isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
          }`}
        />
      </span>
      <span className="text-sm font-semibold">{isHealthy ? '系统正常' : '需要关注'}</span>
    </div>
  );
}

function StatusInsight({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${valueClassName || 'text-[var(--text-primary)]'}`}>{value}</div>
      <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div>
    </div>
  );
}

export function HealthOverviewCard({
  health,
  lastUpdated,
  alerts,
  compact = false,
}: {
  health: Health[];
  lastUpdated: string | null;
  alerts: Alert[];
  compact?: boolean;
}) {
  const latest = health[0];
  if (!latest) return null;

  const summary = getHealthSummary(health, alerts.length, lastUpdated);
  const statusTone =
    summary.status === 'healthy'
      ? 'border-emerald-200/80 bg-emerald-500/10 text-emerald-700'
      : summary.freshnessLevel === 'error' || !summary.cronOk || summary.blockedCount > 0
        ? 'border-rose-200/80 bg-rose-500/10 text-rose-700'
        : 'border-amber-200/80 bg-amber-500/10 text-amber-700';

  if (compact) {
    return (
      <Card hover={false} padding="none" className="overflow-hidden">
        <div className="p-6">
          <CardHeader
            icon="health"
            iconColor="from-rose-500 to-rose-600"
            title="健康状态"
            subtitle={`最近检测：${formatUpdateTime(latest.created_at)}`}
          />

          <div className="space-y-4 border-t border-[var(--border-light)] pt-4">
            <div className={`rounded-2xl border px-4 py-3 ${statusTone}`}>
              <div className="text-xs font-semibold uppercase tracking-wide">当前判断</div>
              <div className="mt-1 text-sm font-semibold">
                {summary.status === 'healthy' ? '系统稳定，可继续常规运营。' : '存在需要处理的健康信号。'}
              </div>
              <div className="mt-1 text-xs opacity-80">数据新鲜度 {summary.freshnessLabel}，心跳 {summary.cronOk ? '正常' : '异常'}。</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatusInsight label="阻塞任务" value={summary.blockedCount} hint="阻塞超过阈值时优先排查" />
              <StatusInsight label="待决策" value={summary.pendingCount} hint="需要人工确认的事项" />
              <StatusInsight label="告警数" value={summary.alertsCount} hint="聚合后的健康提醒" />
              <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Cron</div>
                <div className="mt-2">
                  <StatusBadge status={summary.cronOk ? 'success' : 'error'} size="sm" />
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">调度链路是否在正常运行</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card hover={false} padding="none" className="overflow-hidden">
      <div className="p-6">
        <CardHeader
          icon="health"
          iconColor="from-rose-500 to-rose-600"
          title="健康状态"
          subtitle={`最近检测：${formatUpdateTime(latest.created_at)}`}
        />

        <div className="space-y-4 border-t border-[var(--border-light)] pt-5">
          <div className={`rounded-2xl border px-4 py-4 ${statusTone}`}>
            <div className="text-xs font-semibold uppercase tracking-wide">当前判断</div>
            <div className="mt-1 text-base font-semibold">
              {summary.status === 'healthy' ? '当前没有阻断运营的系统问题。' : '当前存在需要优先处理的健康风险。'}
            </div>
            <div className="mt-2 text-sm opacity-90">
              数据新鲜度 {summary.freshnessLabel}，告警 {summary.alertsCount} 条，Cron 心跳 {summary.cronOk ? '正常' : '失败'}。
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatusInsight
              label="阻塞任务"
              value={latest.blocked_count}
              valueClassName={latest.blocked_count > 0 ? 'text-[var(--badge-error-text)]' : 'text-[var(--text-primary)]'}
              hint="超过阈值时优先排查链路"
            />
            <StatusInsight
              label="待决策"
              value={latest.pending_decisions}
              valueClassName={latest.pending_decisions > 0 ? 'text-[var(--badge-warning-text)]' : 'text-[var(--text-primary)]'}
              hint="等待人工确认或审批"
            />
            <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Cron 心跳</div>
              <div className="mt-2">
                <StatusBadge status={latest.cron_ok ? 'success' : 'error'} size="sm" />
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">定时任务是否持续执行</div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-tertiary)] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text-secondary)]">告警聚合</span>
              <span className="text-[var(--text-muted)]">{alerts.length} 条</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={latest.blocked_count > 0 ? 'error' : 'success'} size="sm" label={latest.blocked_count > 0 ? '阻塞>2h/阻塞中' : '阻塞正常'} />
              <StatusBadge
                status={summary.freshnessLevel === 'error' ? 'error' : summary.freshnessLevel === 'warning' ? 'warning' : 'success'}
                size="sm"
                label={summary.freshnessLevel === 'error' ? '数据落后>24h' : summary.freshnessLevel === 'warning' ? '数据落后>2h' : '数据新鲜'}
              />
              <StatusBadge status={latest.cron_ok ? 'success' : 'error'} size="sm" label={latest.cron_ok ? '心跳正常' : '失败心跳'} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
