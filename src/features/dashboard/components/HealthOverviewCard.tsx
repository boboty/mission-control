'use client';

import { Card, CardHeader, StatusBadge, type Alert } from '@/components';
import { formatUpdateTime } from '@/lib/data-utils';
import type { Health } from '@/lib/types';

export function SystemStatus({ health }: { health: Health[] }) {
  const latest = health[0];
  const isHealthy = latest?.cron_ok && (!latest.blocked_count || latest.blocked_count === 0);

  return (
    <div
      className={`inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-xl ${
        isHealthy
          ? 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]'
          : 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]'
      } shadow-sm border border-[var(--border-light)] dark:border-[var(--border-medium)]`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isHealthy ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'
          }`}
        />
      </span>
      <span className="text-sm font-semibold">{isHealthy ? '系统正常' : '需要关注'}</span>
    </div>
  );
}

export function HealthOverviewCard({
  health,
  lastUpdated,
  alerts,
}: {
  health: Health[];
  lastUpdated: string | null;
  alerts: Alert[];
}) {
  const latest = health[0];
  if (!latest) return null;

  const staleBase = latest.last_sync_at || latest.created_at || lastUpdated;
  const staleHours = staleBase ? (Date.now() - new Date(staleBase).getTime()) / (1000 * 60 * 60) : 0;
  const staleLevel = staleHours > 24 ? 'error' : staleHours > 2 ? 'warning' : 'success';

  return (
    <Card hover={false} padding="none" className="overflow-hidden">
      <div className="p-6">
        <CardHeader
          icon="health"
          iconColor="from-rose-500 to-rose-600"
          title="健康状态"
          subtitle={`最近检测：${formatUpdateTime(latest.created_at)}`}
        />

        <div className="border-t border-[var(--border-light)] dark:border-[var(--border-medium)] pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4 transition-all duration-200 hover:shadow-md">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">阻塞任务</div>
              <div className={`mt-2 text-2xl font-bold ${latest.blocked_count > 0 ? 'text-[var(--badge-error-text)]' : 'text-[var(--text-primary)]'}`}>
                {latest.blocked_count}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4 transition-all duration-200 hover:shadow-md">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">待决策</div>
              <div className={`mt-2 text-2xl font-bold ${latest.pending_decisions > 0 ? 'text-[var(--badge-warning-text)]' : 'text-[var(--text-primary)]'}`}>
                {latest.pending_decisions}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4 transition-all duration-200 hover:shadow-md">
              <div className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Cron 心跳</div>
              <div className="mt-2">
                <StatusBadge status={latest.cron_ok ? 'success' : 'error'} size="sm" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)] font-medium">告警聚合</span>
              <span className="text-[var(--text-muted)]">{alerts.length} 条</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={latest.blocked_count > 0 ? 'error' : 'success'} size="sm" label={latest.blocked_count > 0 ? '阻塞>2h/阻塞中' : '阻塞正常'} />
              <StatusBadge
                status={staleLevel === 'error' ? 'error' : staleLevel === 'warning' ? 'warning' : 'success'}
                size="sm"
                label={staleLevel === 'error' ? '数据落后>24h' : staleLevel === 'warning' ? '数据落后>2h' : '数据新鲜'}
              />
              <StatusBadge status={latest.cron_ok ? 'success' : 'error'} size="sm" label={latest.cron_ok ? '心跳正常' : '失败心跳'} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
