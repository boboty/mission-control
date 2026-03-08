'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader } from './Card';
import { StatusBadge } from './StatusBadge';
import { Icon } from './Icon';

type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface HealthSummary {
  status: HealthStatus;
  blocked_count: number;
  pending_decisions: number;
  cron_ok: boolean;
  is_stale: boolean;
  checked_at: string;
  last_sync_at: string;
}

interface HealthSnapshot {
  id: number;
  blocked_count: number;
  pending_decisions: number;
  cron_ok: boolean;
  created_at: string;
  last_sync_at?: string;
  is_stale?: boolean;
}

interface HealthApiResponse {
  data?: {
    summary?: Partial<HealthSummary>;
    health?: HealthSnapshot[];
  };
  summary?: Partial<HealthSummary>;
  health?: HealthSnapshot[];
  error?: string;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapStatusToBadge(status: HealthStatus): 'success' | 'warning' | 'error' {
  if (status === 'healthy') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'critical') return 'error';
  return 'warning';
}

function buildSummary(payload: HealthApiResponse): HealthSummary | null {
  const summary = payload.data?.summary ?? payload.summary;
  if (summary) {
    return {
      status: (summary.status as HealthStatus) ?? 'unknown',
      blocked_count: Number(summary.blocked_count ?? 0),
      pending_decisions: Number(summary.pending_decisions ?? 0),
      cron_ok: Boolean(summary.cron_ok),
      is_stale: Boolean(summary.is_stale),
      checked_at: summary.checked_at ?? new Date().toISOString(),
      last_sync_at: summary.last_sync_at ?? new Date().toISOString(),
    };
  }

  const latest = (payload.data?.health ?? payload.health ?? [])[0];
  if (!latest) return null;

  const status: HealthStatus = latest.cron_ok === false
    ? 'critical'
    : latest.blocked_count > 0 || latest.pending_decisions > 0 || latest.is_stale
      ? 'warning'
      : 'healthy';

  return {
    status,
    blocked_count: latest.blocked_count,
    pending_decisions: latest.pending_decisions,
    cron_ok: latest.cron_ok,
    is_stale: Boolean(latest.is_stale),
    checked_at: latest.created_at,
    last_sync_at: latest.last_sync_at ?? latest.created_at,
  };
}

export function OpsCard() {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const payload: HealthApiResponse = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to fetch health status');
      }

      const normalized = buildSummary(payload);
      if (!normalized) {
        throw new Error('Health response is empty');
      }

      setSummary(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch health status';
      setError(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <Card hover={false} padding="none">
        <div className="p-5">
          <CardHeader icon="health" iconColor="from-rose-500 to-rose-600" title="Ops Health" subtitle="Loading..." />
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
            <div className="h-16 rounded-xl bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-16 rounded-xl bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card hover={false} padding="none">
        <div className="p-5">
          <CardHeader icon="health" iconColor="from-rose-500 to-rose-600" title="Ops Health" subtitle="Failed to load" />
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--badge-error-bg)] p-3 text-sm text-[var(--badge-error-text)]">
              {error}
            </div>
            <button
              onClick={fetchHealth}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border-medium)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Icon name="refresh" size={16} />
              Retry
            </button>
          </div>
        </div>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card hover={false} padding="none">
      <div className="p-5">
        <CardHeader
          icon="health"
          iconColor="from-rose-500 to-rose-600"
          title="Ops Health"
          subtitle={`Checked: ${formatTime(summary.checked_at)}`}
        />
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] p-3">
            <span className="text-sm text-[var(--text-secondary)]">System Status</span>
            <StatusBadge status={mapStatusToBadge(summary.status)} size="sm" label={summary.status} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] p-3">
              <div className="text-xs text-[var(--text-muted)]">Blocked Tasks</div>
              <div className={`mt-1 text-xl font-semibold ${summary.blocked_count > 0 ? 'text-[var(--badge-error-text)]' : 'text-[var(--text-primary)]'}`}>
                {summary.blocked_count}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] p-3">
              <div className="text-xs text-[var(--text-muted)]">Pending Decisions</div>
              <div className={`mt-1 text-xl font-semibold ${summary.pending_decisions > 0 ? 'text-[var(--badge-warning-text)]' : 'text-[var(--text-primary)]'}`}>
                {summary.pending_decisions}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] p-3">
              <div className="text-xs text-[var(--text-muted)]">Cron Heartbeat</div>
              <div className="mt-1">
                <StatusBadge status={summary.cron_ok ? 'success' : 'error'} size="sm" />
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            Last sync: {formatTime(summary.last_sync_at)}
          </div>
        </div>
      </div>
    </Card>
  );
}
