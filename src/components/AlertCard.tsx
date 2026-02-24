'use client';

import { Icon } from './Icon';

export interface Alert {
  id: string;
  type: 'blocked' | 'pending' | 'stale' | 'error' | 'warning' | 'info';
  level: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  count?: number;
  timestamp?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AlertCardProps {
  alerts: Alert[];
  onDismiss?: (alertId: string) => void;
  compact?: boolean;
}

export function AlertCard({ alerts, onDismiss, compact = false }: AlertCardProps) {
  if (!alerts || alerts.length === 0) return null;

  const getLevelStyles = (level: Alert['level']) => {
    switch (level) {
      case 'error':
        return {
          bg: 'bg-[var(--badge-error-bg)]',
          border: 'border-[var(--color-danger)]',
          text: 'text-[var(--badge-error-text)]',
          icon: 'text-[var(--color-danger)]',
          iconBg: 'bg-[var(--color-danger)]',
        };
      case 'warning':
        return {
          bg: 'bg-[var(--badge-warning-bg)]',
          border: 'border-[var(--color-warning)]',
          text: 'text-[var(--badge-warning-text)]',
          icon: 'text-[var(--color-warning)]',
          iconBg: 'bg-[var(--color-warning)]',
        };
      case 'info':
      default:
        return {
          bg: 'bg-[var(--badge-info-bg)]',
          border: 'border-[var(--color-primary)]',
          text: 'text-[var(--badge-info-text)]',
          icon: 'text-[var(--color-primary)]',
          iconBg: 'bg-[var(--color-primary)]',
        };
    }
  };

  const getIconForType = (type: Alert['type']) => {
    switch (type) {
      case 'blocked':
        return 'blocked';
      case 'pending':
        return 'pending';
      case 'stale':
        return 'clock';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const styles = getLevelStyles(alert.level);
        const icon = getIconForType(alert.type);

        return (
          <div
            key={alert.id}
            className={`
              ${styles.bg} ${styles.border} border-l-4 rounded-lg p-4
              flex items-start justify-between gap-4
              transition-all duration-200
              ${compact ? 'py-2 px-3' : ''}
            `}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* 图标 */}
              <div className={`flex-shrink-0 w-8 h-8 ${styles.iconBg} rounded-lg flex items-center justify-center`}>
                <Icon name={icon} size={18} color="white" />
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-semibold text-sm ${styles.text}`}>
                    {alert.title}
                  </h4>
                  {alert.count !== undefined && alert.count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${styles.iconBg} text-white font-medium`}>
                      {alert.count}
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-1 ${styles.text} opacity-90`}>
                  {alert.message}
                </p>
                {alert.timestamp && (
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(alert.timestamp).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {alert.action && (
                  <button
                    onClick={alert.action.onClick}
                    className={`mt-2 text-xs font-medium ${styles.text} underline underline-offset-2 hover:opacity-80 transition-opacity`}
                  >
                    {alert.action.label}
                  </button>
                )}
              </div>
            </div>

            {/* 关闭按钮 */}
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className={`flex-shrink-0 p-1 rounded-md ${styles.text} opacity-60 hover:opacity-100 transition-opacity`}
                aria-label="关闭告警"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 告警聚合工具函数
export function aggregateAlerts(
  health: any[],
  tasks: any[],
  lastUpdated: string | null
): Alert[] {
  const alerts: Alert[] = [];
  const latestHealth = health[0];

  // 阻塞告警
  if (latestHealth?.blocked_count > 0) {
    alerts.push({
      id: 'blocked-tasks',
      type: 'blocked',
      level: 'error',
      title: '有任务被阻塞',
      message: `当前有 ${latestHealth.blocked_count} 个任务处于阻塞状态，需要立即关注`,
      count: latestHealth.blocked_count,
      timestamp: latestHealth.created_at,
      action: {
        label: '查看阻塞任务',
        onClick: () => console.log('Navigate to blocked tasks'),
      },
    });
  }

  // 待决策告警
  if (latestHealth?.pending_decisions > 0) {
    alerts.push({
      id: 'pending-decisions',
      type: 'pending',
      level: 'warning',
      title: '有待决策项',
      message: `当前有 ${latestHealth.pending_decisions} 个待决策项等待处理`,
      count: latestHealth.pending_decisions,
      timestamp: latestHealth.created_at,
      action: {
        label: '查看决策中心',
        onClick: () => console.log('Navigate to decisions'),
      },
    });
  }

  // 长时间未更新告警（stale）
  const syncBase = latestHealth?.last_sync_at || latestHealth?.created_at || lastUpdated;
  if (syncBase) {
    const lastUpdateTime = new Date(syncBase).getTime();
    const now = Date.now();
    const hoursSinceUpdate = (now - lastUpdateTime) / (1000 * 60 * 60);

    if (hoursSinceUpdate > 24) {
      alerts.push({
        id: 'stale-data',
        type: 'stale',
        level: 'warning',
        title: '数据长时间未更新',
        message: `数据已超过 ${Math.floor(hoursSinceUpdate)} 小时未同步，请检查数据源连接`,
        timestamp: syncBase,
        action: {
          label: '手动刷新',
          onClick: () => window.location.reload(),
        },
      });
    } else if (hoursSinceUpdate > 2) {
      alerts.push({
        id: 'stale-data-minor',
        type: 'stale',
        level: 'info',
        title: '数据更新延迟',
        message: `数据已超过 ${Math.floor(hoursSinceUpdate)} 小时未同步`,
        timestamp: syncBase,
      });
    }
  }

  // Cron 任务失败告警
  if (latestHealth && latestHealth.cron_ok === false) {
    alerts.push({
      id: 'cron-failed',
      type: 'error',
      level: 'error',
      title: '定时任务执行失败',
      message: '健康检测发现定时任务执行异常，请检查系统日志',
      timestamp: latestHealth.created_at,
    });
  }

  return alerts;
}
