'use client';

import { useState } from 'react';
import { DndContext, DragOverlay, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ClickableItem, EmptyState, type Alert, type DetailData } from '@/components';
import { CalendarCard } from '@/components/dashboard/CalendarCard';
import { TaskItem, SortableTaskItem, Pagination } from '@/components/dashboard/TaskBoard';
import { PipelineItem } from '@/components/dashboard/Pipeline';
import { TeamOverview } from '@/components/dashboard/TeamOverview';
import { HealthOverviewCard } from './HealthOverviewCard';
import { eventToDetail, formatDate, groupTasksByStatus, pipelineToDetail, taskToDetail } from '@/lib/data-utils';
import type {
  Agent,
  Event,
  Health,
  MemoryTopic,
  PaginationInfo,
  Pipeline,
  Task,
} from '@/lib/types';
import { KANBAN_COLUMNS, STATUS_GROUP_NAMES } from '@/lib/types';

type TaskViewMode = 'list' | 'grouped' | 'kanban';

type TaskDragProps = {
  activeId: number | null;
  sensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  onDragStart: (event: { active: { id: string | number } }) => void;
  onDragEnd: (event: DragEndEvent) => void;
};

export interface ModuleContentProps {
  moduleKey: string;
  isSingleModule: boolean;
  tasks: Task[];
  taskLoading: boolean;
  taskPagination: PaginationInfo | null;
  taskViewMode: TaskViewMode;
  onTaskPageChange: (page: number) => void;
  taskDrag: TaskDragProps;
  pipelines: Pipeline[];
  events: Event[];
  eventLoading: boolean;
  eventPagination: PaginationInfo | null;
  onEventPageChange: (page: number) => void;
  agents: Agent[];
  health: Health[];
  lastUpdated: string | null;
  alerts: Alert[];
  memoryTopics: MemoryTopic[];
  onOpenDetail: (data: DetailData) => void | Promise<void>;
  onCreateEvent: (eventData: { title: string; starts_at: string; ends_at?: string; type?: string }) => void | Promise<void>;
}

function TaskGroup({
  title,
  tasks,
  onTaskClick,
  compact = false,
}: {
  title: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  compact?: boolean;
}) {
  return (
    <div className="mb-3">
      <div className="px-2 py-2 text-xs font-semibold text-[var(--text-muted)]">
        {title} · {tasks.length}
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onClick={() => onTaskClick(task)} compact={compact} />
        ))}
      </div>
    </div>
  );
}

function EventListItem({ event, onClick }: { event: Event; onClick: () => void }) {
  return (
    <ClickableItem onClick={onClick} className="-mx-2 px-2 rounded-lg">
      <div className="py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0">
        <div className="text-sm font-medium text-[var(--text-primary)]">{event.title}</div>
        <div className="text-xs text-[var(--text-muted)] mt-1">{formatDate(event.starts_at)}</div>
      </div>
    </ClickableItem>
  );
}

async function openMemoryTopic(topic: MemoryTopic, onOpenDetail: ModuleContentProps['onOpenDetail']) {
  const res = await fetch(`/api/memory-topics/${topic.slug}`);
  const data = await res.json();

  await onOpenDetail({
    id: topic.slug,
    type: 'memory',
    title: topic.title || topic.slug,
    category: 'topic',
    description: data?.content || '',
    source: data?.ref_path || topic.ref_path,
    createdAt: new Date().toISOString(),
    metadata: { tags: ['memory/topics'] },
  });
}

export function ModuleContent({
  moduleKey,
  isSingleModule,
  tasks,
  taskLoading,
  taskPagination,
  taskViewMode,
  onTaskPageChange,
  taskDrag,
  pipelines,
  events,
  eventLoading,
  eventPagination,
  onEventPageChange,
  agents,
  health,
  lastUpdated,
  alerts,
  memoryTopics,
  onOpenDetail,
  onCreateEvent,
}: ModuleContentProps) {
  const [topicLoading, setTopicLoading] = useState(false);

  switch (moduleKey) {
    case 'tasks': {
      if (tasks.length === 0 && !taskLoading) {
        return <EmptyState moduleType="tasks" icon="empty-tasks" title="暂无任务" description="当前没有待办任务，一切正常！" />;
      }

      if (taskViewMode === 'grouped') {
        const groupedTasks = groupTasksByStatus(tasks);
        return (
          <div className={`${isSingleModule ? 'max-h-none' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
            {Object.entries(groupedTasks).map(([status, statusTasks]) => (
              <TaskGroup
                key={status}
                title={STATUS_GROUP_NAMES[status] || status}
                tasks={statusTasks}
                compact={!isSingleModule}
                onTaskClick={(task) => onOpenDetail(taskToDetail(task))}
              />
            ))}
            {taskPagination && <Pagination pagination={taskPagination} onPageChange={onTaskPageChange} />}
          </div>
        );
      }

      if (taskViewMode === 'kanban') {
        const groupedTasks = groupTasksByStatus(tasks);
        return (
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={taskDrag.onDragStart}
            onDragEnd={taskDrag.onDragEnd}
            sensors={taskDrag.sensors}
          >
            <div className="grid grid-cols-5 gap-3 overflow-x-auto">
              {KANBAN_COLUMNS.map((column) => (
                <div key={column.id} className="min-w-[200px]">
                  <div className={`${column.color} text-white text-xs font-medium px-3 py-2 rounded-t-lg flex items-center justify-between`}>
                    <span>{column.title}</span>
                    <span className="opacity-75">{groupedTasks[column.id]?.length || 0}</span>
                  </div>
                  <div className="bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] rounded-b-lg p-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                    <SortableContext items={groupedTasks[column.id]?.map((task) => task.id) || []} strategy={verticalListSortingStrategy}>
                      {groupedTasks[column.id]?.map((task) => (
                        <SortableTaskItem key={task.id} task={task} onClick={() => onOpenDetail(taskToDetail(task))} />
                      ))}
                    </SortableContext>
                    {(!groupedTasks[column.id] || groupedTasks[column.id].length === 0) && (
                      <div className="text-center text-xs text-[var(--text-muted)] py-4">暂无</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <DragOverlay>
              {taskDrag.activeId ? (
                <div className="bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] p-3 rounded-lg shadow-lg border border-[var(--color-primary)] opacity-90">
                  <span className="text-sm text-[var(--text-primary)]">
                    {tasks.find((task) => task.id === taskDrag.activeId)?.title?.substring(0, 30)}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        );
      }

      return (
        <div className={`${isSingleModule ? 'max-h-none' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
          {taskLoading ? (
            <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>
          ) : (
            <>
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} onClick={() => onOpenDetail(taskToDetail(task))} compact={!isSingleModule} />
              ))}
              {taskPagination && <Pagination pagination={taskPagination} onPageChange={onTaskPageChange} />}
            </>
          )}
        </div>
      );
    }

    case 'pipelines':
      if (pipelines.length === 0) {
        return <EmptyState moduleType="pipelines" icon="empty-pipeline" title="暂无流程" description="当前没有进行中的流程项目" action={<button className="btn btn-primary">新建流程</button>} />;
      }

      return (
        <div className={`${isSingleModule ? '' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
          {pipelines.map((item) => (
            <PipelineItem key={item.id} item={item} onClick={() => onOpenDetail(pipelineToDetail(item))} />
          ))}
        </div>
      );

    case 'events':
      if (eventLoading && events.length === 0) {
        return <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>;
      }

      if (events.length === 0) {
        return (
          <EmptyState
            moduleType="events"
            icon="empty-calendar"
            title="暂无日程"
            description="近期没有安排的日程"
            action={
              <button
                onClick={() => {
                  const title = prompt('请输入日程标题：');
                  if (!title) return;
                  const starts_at = prompt('开始时间（格式：2026-03-08T14:00）：');
                  if (!starts_at) return;
                  void onCreateEvent({ title, starts_at });
                }}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
              >
                新建日程
              </button>
            }
          />
        );
      }

      if (!isSingleModule) {
        return <CalendarCard events={events} openDetail={onOpenDetail} />;
      }

      return (
        <div className="overflow-y-auto -mx-2">
          {events.map((event) => (
            <EventListItem key={event.id} event={event} onClick={() => onOpenDetail(eventToDetail(event))} />
          ))}
          {eventPagination && <Pagination pagination={eventPagination} onPageChange={onEventPageChange} />}
        </div>
      );

    case 'agents':
      return <TeamOverview agents={agents} openDetail={onOpenDetail} showScene={isSingleModule} />;

    case 'memory_topics':
      if (topicLoading) {
        return <div className="py-4 text-center text-sm text-[var(--text-muted)]">加载中...</div>;
      }

      if (memoryTopics.length === 0) {
        return <EmptyState moduleType="memories" icon="empty-archive" title="暂无主题" description="memory/topics 下还没有主题文件" />;
      }

      return (
        <div className={`${isSingleModule ? '' : 'max-h-[420px]'} overflow-y-auto -mx-2`}>
          {memoryTopics.map((topic) => (
            <ClickableItem
              key={topic.slug}
              onClick={async () => {
                try {
                  setTopicLoading(true);
                  await openMemoryTopic(topic, onOpenDetail);
                } finally {
                  setTopicLoading(false);
                }
              }}
              className="-mx-2 px-2 rounded-lg"
            >
              <div className="py-2.5 border-b border-[var(--border-light)] dark:border-[var(--border-medium)] last:border-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">{topic.title || topic.slug}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1 truncate">{topic.summary || topic.ref_path}</div>
              </div>
            </ClickableItem>
          ))}
        </div>
      );

    case 'health':
      if (health.length === 0) {
        return <EmptyState moduleType="health" icon="empty-heart" title="暂无数据" description="健康检测数据尚未生成" />;
      }

      return <HealthOverviewCard health={health} lastUpdated={lastUpdated} alerts={alerts} compact={!isSingleModule} />;

    default:
      return null;
  }
}
