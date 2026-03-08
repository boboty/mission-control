import type { TimelineEvent } from '@/components/DetailModal';

function getStatusLabel(status: string | null) {
  if (!status) return '未知';

  const labels: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    blocked: '已阻塞',
    done: '已完成',
  };

  return labels[status] || status;
}

function getPriorityLabel(priority: string | null) {
  if (!priority) return '未知';

  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
    none: '无',
  };

  return labels[priority] || priority;
}

function getEventDisplayInfo(eventType: string, oldValue: string | null, newValue: string) {
  switch (eventType) {
    case 'created':
      return { title: '任务创建', description: '任务已创建', icon: 'clock' as const };
    case 'status_change':
      return {
        title: '状态变更',
        description: `从 "${getStatusLabel(oldValue)}" 改为 "${getStatusLabel(newValue)}"`,
        icon: 'status' as const,
      };
    case 'owner_change':
      return {
        title: '负责人变更',
        description: `从 "${oldValue || '未分配'}" 改为 "${newValue || '未分配'}"`,
        icon: 'owner' as const,
      };
    case 'priority_change':
      return {
        title: '优先级变更',
        description: `从 "${getPriorityLabel(oldValue || 'none')}" 改为 "${getPriorityLabel(newValue)}"`,
        icon: 'priority' as const,
      };
    case 'due_date_change':
      return { title: '截止日期变更', description: '截止日期已更新', icon: 'calendar' as const };
    case 'next_action_change':
      return { title: '下一步行动更新', description: '下一步行动已更新', icon: 'action' as const };
    case 'comment':
      return { title: '评论', description: newValue, icon: 'note' as const };
    default:
      return { title: '更新', description: newValue, icon: 'clock' as const };
  }
}

export async function loadTaskTimeline(taskId: number): Promise<TimelineEvent[]> {
  try {
    const res = await fetch(`/api/tasks?taskId=${taskId}&timeline=true`);
    const data = await res.json();

    if (data.success && data.events) {
      return data.events.map((event: any) => {
        const displayInfo = getEventDisplayInfo(event.event_type, event.old_value, event.new_value);
        return {
          timestamp: event.created_at,
          type: event.event_type === 'comment' ? 'comment' : 'updated',
          title: displayInfo.title,
          description: event.comment || displayInfo.description,
          icon: displayInfo.icon,
          metadata: {
            actor: event.actor,
            event_type: event.event_type,
          },
        } satisfies TimelineEvent;
      });
    }
  } catch (error) {
    console.error('Failed to load task timeline:', error);
  }

  return [];
}
