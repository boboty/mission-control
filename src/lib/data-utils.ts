import { type Task, type Pipeline, type Event, type Agent, type Health } from './types';
import { type DetailData } from '../components/DetailModal';

// ============ 格式化函数 ============

/**
 * 格式化日期为相对时间
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * 格式化更新时间为中文格式
 */
export function formatUpdateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// ============ 数据转换函数 ============

/**
 * 按状态分组任务
 */
export function groupTasksByStatus(tasks: Task[]): Record<string, Task[]> {
  return tasks.reduce((groups, task) => {
    const status = task.status || 'todo';
    if (!groups[status]) {
      groups[status] = [];
    }
    groups[status].push(task);
    return groups;
  }, {} as Record<string, Task[]>);
}

/**
 * 任务转换为详情数据
 */
export function taskToDetail(task: Task): DetailData {
  const timeline: any[] = [];
  if (task.due_at) {
    timeline.push({
      timestamp: task.due_at,
      type: 'custom' as const,
      title: '截止日期',
      description: `任务到期`,
      icon: 'calendar',
    });
  }
  timeline.push({
    timestamp: task.updated_at || new Date().toISOString(),
    type: 'updated' as const,
    title: '任务更新',
    description: `状态：${task.status}`,
    icon: 'clock',
  });
  
  const relatedObjects: any[] = [];
  if (task.blocker) {
    relatedObjects.push({
      id: 999,
      type: 'task' as const,
      title: '阻塞任务示例',
      status: 'in_progress',
      link: `/tasks/999`,
    });
  }
  // Add linked pipeline
  if (task.linked_pipeline_id) {
    relatedObjects.push({
      id: task.linked_pipeline_id,
      type: 'pipeline' as const,
      title: `管线 #${task.linked_pipeline_id}`,
      link: `/pipelines/${task.linked_pipeline_id}`,
    });
  }
  // Add linked event
  if (task.linked_event_id) {
    relatedObjects.push({
      id: task.linked_event_id,
      type: 'event' as const,
      title: `日程 #${task.linked_event_id}`,
      link: `/events/${task.linked_event_id}`,
    });
  }
  
  return {
    id: task.id,
    type: 'task',
    title: task.title,
    status: task.status,
    priority: task.priority,
    owner: task.owner,
    dueAt: task.due_at,
    nextAction: task.next_action,
    createdAt: task.due_at ? new Date(new Date(task.due_at).getTime() - 86400000 * 3).toISOString() : undefined,
    updatedAt: task.updated_at,
    extra: {
      blocker: task.blocker,
      linked_pipeline_id: task.linked_pipeline_id,
      linked_event_id: task.linked_event_id,
    },
    metadata: {
      createdUser: task.owner || '系统',
      updatedUser: task.owner || '系统',
      tags: task.priority === 'high' ? ['高优', '重点关注'] : [],
    },
    timeline: timeline.length > 0 ? timeline : undefined,
    relatedObjects: relatedObjects.length > 0 ? relatedObjects : undefined,
  };
}

/**
 * 管线转换为详情数据
 */
export function pipelineToDetail(item: Pipeline): DetailData {
  const relatedObjects: any[] = [];
  // Add linked tasks if available
  if (item.linked_task_ids && item.linked_task_ids.length > 0) {
    item.linked_task_ids.forEach((taskId: number) => {
      relatedObjects.push({
        id: taskId,
        type: 'task' as const,
        title: `任务 #${taskId}`,
        link: `/tasks/${taskId}`,
      });
    });
  }
  
  return {
    id: item.id,
    type: 'pipeline',
    title: item.item_name,
    status: item.stage,
    owner: item.owner,
    dueAt: item.due_at,
    createdAt: item.due_at ? new Date(new Date(item.due_at).getTime() - 86400000 * 7).toISOString() : undefined,
    updatedAt: item.due_at,
    metadata: {
      createdUser: item.owner || '系统',
      tags: ['流程'],
    },
    relatedObjects: relatedObjects.length > 0 ? relatedObjects : undefined,
    timeline: [
      {
        timestamp: item.due_at || new Date().toISOString(),
        type: 'created' as const,
        title: '流程创建',
        description: `阶段：${item.stage}`,
      },
    ],
  };
}

/**
 * 日程转换为详情数据
 */
export function eventToDetail(event: Event): DetailData {
  const relatedObjects: any[] = [];
  // Add linked tasks if available
  if (event.linked_task_ids && event.linked_task_ids.length > 0) {
    event.linked_task_ids.forEach((taskId: number) => {
      relatedObjects.push({
        id: taskId,
        type: 'task' as const,
        title: `任务 #${taskId}`,
        link: `/tasks/${taskId}`,
      });
    });
  }
  
  return {
    id: event.id,
    type: 'event',
    title: event.title,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    category: event.type,
    createdAt: event.starts_at ? new Date(new Date(event.starts_at).getTime() - 86400000).toISOString() : undefined,
    metadata: {
      tags: [event.type || '日程'],
    },
    relatedObjects: relatedObjects.length > 0 ? relatedObjects : undefined,
    timeline: [
      {
        timestamp: event.starts_at,
        type: 'custom' as const,
        title: '日程开始',
        icon: 'calendar',
      },
      ...(event.ends_at ? [{
        timestamp: event.ends_at,
        type: 'custom' as const,
        title: '日程结束',
        icon: 'calendar',
      }] : []),
    ],
  };
}

/**
 * 智能体转换为详情数据
 */
export function agentToDetail(agent: Agent): DetailData {
  return {
    id: agent.id,
    type: 'agent',
    title: agent.display_name,
    status: agent.state,
    lastSeenAt: agent.last_seen_at,
    extra: {
      agent_key: agent.agent_key,
    },
    metadata: {
      tags: ['智能体'],
    },
    timeline: agent.last_seen_at ? [{
      timestamp: agent.last_seen_at,
      type: 'updated' as const,
      title: '状态更新',
      description: `状态：${agent.state}`,
    }] : undefined,
  };
}

/**
 * 健康快照转换为详情数据
 */
export function healthToDetail(snapshot: Health): DetailData {
  return {
    id: snapshot.id,
    type: 'health',
    title: `健康检测 #${snapshot.id}`,
    status: snapshot.cron_ok ? 'success' : 'error',
    createdAt: snapshot.created_at,
    extra: {
      blocked_count: snapshot.blocked_count,
      pending_decisions: snapshot.pending_decisions,
      cron_ok: snapshot.cron_ok,
    },
    metadata: {
      tags: ['健康检测'],
    },
    timeline: snapshot.created_at ? [{
      timestamp: snapshot.created_at,
      type: 'created' as const,
      title: '健康检测执行',
      description: `阻塞：${snapshot.blocked_count}, 待决：${snapshot.pending_decisions}`,
    }] : undefined,
  };
}
