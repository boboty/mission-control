'use client';

import { Card, CardHeader, Icon } from '@/components';
import { CalendarList } from '@/components/dashboard/CalendarList';
import { PipelineList } from '@/components/dashboard/PipelineList';
import { TaskBoard } from '@/components/dashboard/TaskBoard';
import type { DetailData } from '@/components';
import type { Event, PaginationInfo, Pipeline, Task } from '@/lib/types';
import { ModuleContent, type ModuleContentProps } from './ModuleContent';
import { getDashboardModule } from '../lib/dashboard-config';

export function SingleModuleView({
  activeModule,
  onBack,
  tasks,
  setTasks,
  taskLoading,
  taskViewMode,
  setTaskViewMode,
  pipelines,
  setPipelines,
  events,
  setEvents,
  eventLoading,
  eventPage,
  eventPagination,
  loading,
  openDetail,
  moduleContentProps,
}: {
  activeModule: string;
  onBack: () => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskLoading: boolean;
  taskViewMode: 'list' | 'grouped' | 'kanban';
  setTaskViewMode: (mode: 'list' | 'grouped' | 'kanban') => void;
  pipelines: Pipeline[];
  setPipelines: React.Dispatch<React.SetStateAction<Pipeline[]>>;
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  eventLoading: boolean;
  eventPage: number;
  eventPagination: PaginationInfo | null;
  loading: boolean;
  openDetail: (data: DetailData) => void | Promise<void>;
  moduleContentProps: Omit<ModuleContentProps, 'moduleKey' | 'isSingleModule'>;
}) {
  const module = getDashboardModule(activeModule);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] border border-[var(--border-light)] dark:border-[var(--border-medium)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center space-x-2"
        >
          <Icon name="arrow-left" size={16} />
          <span>返回仪表盘</span>
        </button>
      </div>

      <Card hover={false} padding="none">
        <div className="p-5">
          {activeModule === 'tasks' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-[var(--text-primary)]">任务看板</h2>
                <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                  {(['list', 'grouped', 'kanban'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTaskViewMode(mode)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        taskViewMode === mode
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'list' ? '列表' : mode === 'grouped' ? '分组' : '看板'}
                    </button>
                  ))}
                </div>
              </div>
              <TaskBoard tasks={tasks} setTasks={setTasks} loading={taskLoading} openDetail={openDetail} taskViewMode={taskViewMode} setTaskViewMode={setTaskViewMode} />
            </>
          ) : activeModule === 'pipelines' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-[var(--text-primary)]">业务管线</h2>
              </div>
              <PipelineList pipelines={pipelines} setPipelines={setPipelines} loading={loading} openDetail={openDetail} />
            </>
          ) : activeModule === 'events' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold dark:text-[var(--text-primary)]">日历列表</h2>
                {eventPagination && <span className="text-xs text-[var(--text-muted)]">第 {eventPage} 页 · 共 {eventPagination.total} 项</span>}
              </div>
              <CalendarList events={events} setEvents={setEvents} loading={eventLoading} openDetail={openDetail} />
            </>
          ) : (
            <>
              <CardHeader icon={module?.icon || 'metrics'} iconColor={module?.color || 'from-slate-500 to-slate-600'} title={module?.name || activeModule} subtitle="单模块视图" />
              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <ModuleContent moduleKey={activeModule} isSingleModule={true} {...moduleContentProps} />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
