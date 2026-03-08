'use client';

import { useEffect, useMemo, useState } from 'react';
import { DetailModal, Icon, LeftNav, type DetailData, type RelatedObject } from '@/components';
import { formatUpdateTime, eventToDetail, pipelineToDetail, taskToDetail } from '@/lib/data-utils';
import { DASHBOARD_MODULES, getDashboardModule } from '@/features/dashboard/lib/dashboard-config';
import { loadTaskTimeline } from '@/features/dashboard/lib/task-timeline';
import { SystemStatus } from '@/features/dashboard/components/HealthOverviewCard';
import { DashboardOverview } from '@/features/dashboard/components/DashboardOverview';
import { ModuleContent, type ModuleContentProps } from '@/features/dashboard/components/ModuleContent';
import { SingleModuleView } from '@/features/dashboard/components/SingleModuleView';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

export default function Dashboard() {
  const dashboard = useDashboardData();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DetailData | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const openDetail = async (data: DetailData) => {
    if (data.type === 'task' && !data.timeline) {
      const timeline = await loadTaskTimeline(Number(data.id));
      data.timeline = timeline.length > 0 ? timeline : undefined;
    }

    setSelectedItem(data);
    setDetailOpen(true);
  };

  const handleRelatedObjectClick = async (obj: RelatedObject) => {
    try {
      let detailData: DetailData | null = null;

      if (obj.type === 'task') {
        const res = await fetch(`/api/tasks?taskId=${obj.id}`);
        const data = await res.json();
        if (data.tasks && data.tasks.length > 0) {
          detailData = taskToDetail(data.tasks[0]);
        }
      } else if (obj.type === 'pipeline') {
        const res = await fetch(`/api/pipelines?id=${obj.id}`);
        const data = await res.json();
        if (data.pipelines && data.pipelines.length > 0) {
          detailData = pipelineToDetail(data.pipelines[0]);
        }
      } else if (obj.type === 'event') {
        const res = await fetch(`/api/events?id=${obj.id}`);
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          detailData = eventToDetail(data.events[0]);
        }
      }

      if (detailData) {
        await openDetail(detailData);
      }
    } catch (error) {
      console.error('Failed to fetch related object details:', error);
    }
  };

  const moduleContentProps: Omit<ModuleContentProps, 'moduleKey' | 'isSingleModule'> = {
    tasks: dashboard.tasks,
    taskLoading: dashboard.taskLoading,
    taskPagination: dashboard.taskPagination,
    taskViewMode: dashboard.taskViewMode,
    onTaskPageChange: dashboard.handleTaskPageChange,
    taskDrag: dashboard.taskDrag,
    pipelines: dashboard.pipelines,
    events: dashboard.events,
    eventLoading: dashboard.eventLoading,
    eventPagination: dashboard.eventPagination,
    onEventPageChange: dashboard.handleEventPageChange,
    agents: dashboard.agents,
    health: dashboard.health,
    lastUpdated: dashboard.lastUpdated,
    alerts: dashboard.alerts,
    memoryTopics: dashboard.memoryTopics,
    onOpenDetail: openDetail,
    onCreateEvent: dashboard.createEvent,
  };

  const hasValidationWarnings = useMemo(
    () => Object.values(dashboard.dataValidation).some((validation) => validation.warnings.length > 0),
    [dashboard.dataValidation]
  );

  const activeModuleName = activeModule === 'dashboard'
    ? '任务控制中心'
    : getDashboardModule(activeModule)?.name || '模块';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] via-[var(--bg-primary)] to-[var(--bg-secondary)] dark:from-[var(--bg-primary)] dark:via-[var(--bg-secondary)] dark:to-[var(--bg-primary)]">
      <LeftNav
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed(!navCollapsed)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <main className={`transition-all duration-300 ${isMobile ? 'ml-0' : navCollapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 max-w-7xl mx-auto">
          <header className="mb-6 sm:mb-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <button onClick={() => setMobileNavOpen(true)} className="hamburger-btn flex-shrink-0" aria-label="打开导航菜单">
                      <Icon name="menu" size={22} color="var(--text-secondary)" />
                    </button>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight truncate">{activeModuleName}</h1>
                </div>
                <p className="text-[var(--text-secondary)] mt-2 text-xs sm:text-sm flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] font-medium text-xs">
                    数据源：{dashboard.dataSource}
                  </span>
                  {dashboard.lastUpdated && (
                    <span className="text-[var(--text-muted)] truncate">· 最近同步：{formatUpdateTime(dashboard.lastUpdated)}</span>
                  )}
                  {activeModule !== 'dashboard' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium text-xs">
                      单模块视图
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {activeModule === 'dashboard' && !isMobile && <SystemStatus health={dashboard.health} />}
                <button
                  onClick={() => void dashboard.refreshAllData(true)}
                  disabled={dashboard.isRefreshing}
                  className={`inline-flex items-center justify-center p-2 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-all min-w-[44px] min-h-[44px] ${
                    dashboard.isRefreshing
                      ? 'bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
                      : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                  }`}
                  title="手动刷新所有数据"
                  aria-label="刷新数据"
                >
                  <Icon name="refresh" size={18} className={dashboard.isRefreshing ? 'animate-spin' : ''} />
                  {!isMobile && <span className="ml-1.5">{dashboard.isRefreshing ? '刷新中...' : '刷新'}</span>}
                </button>
              </div>
            </div>
          </header>

          {dashboard.isRefreshing && (
            <div className="mb-6 p-3 rounded-xl bg-[var(--color-primary-soft)] dark:bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="refresh" size={16} className="text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-[var(--color-primary)]">正在刷新数据...</span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                自动刷新：{dashboard.autoRefreshEnabled ? '已启用' : '已禁用'}
              </span>
            </div>
          )}

          {dashboard.error && (
            <div className="mb-8 p-5 bg-[var(--badge-error-bg)] rounded-2xl border border-[var(--border-medium)] shadow-sm flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--badge-error-bg)] flex items-center justify-center flex-shrink-0">
                <Icon name="error" size={24} className="text-[var(--badge-error-text)]" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--badge-error-text)] font-semibold text-sm">加载失败</p>
                <p className="text-[var(--badge-error-text)]/85 text-sm mt-1.5">{dashboard.error}</p>
              </div>
            </div>
          )}

          {hasValidationWarnings && (
            <div className="mb-8 p-5 bg-[var(--badge-warning-bg)] rounded-2xl border border-[var(--border-medium)] shadow-sm flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--badge-warning-bg)] flex items-center justify-center flex-shrink-0">
                <Icon name="warning" size={24} className="text-[var(--badge-warning-text)]" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--badge-warning-text)] font-semibold text-sm">数据质量提醒</p>
                <ul className="text-[var(--badge-warning-text)]/85 text-sm mt-1.5 space-y-1">
                  {Object.entries(dashboard.dataValidation).flatMap(([module, validation]) =>
                    validation.warnings.map((warning, index) => (
                      <li key={`${module}-${index}`} className="flex items-start">
                        <span className="text-[var(--badge-warning-text)] mr-2 mt-0.5">·</span>
                        <span><span className="font-semibold capitalize">{module}:</span> {warning}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeModule !== 'dashboard' ? (
            <SingleModuleView
              activeModule={activeModule}
              onBack={() => setActiveModule('dashboard')}
              tasks={dashboard.tasks}
              setTasks={dashboard.setTasks}
              taskLoading={dashboard.taskLoading}
              taskViewMode={dashboard.taskViewMode}
              setTaskViewMode={dashboard.setTaskViewMode}
              pipelines={dashboard.pipelines}
              setPipelines={dashboard.setPipelines}
              events={dashboard.events}
              eventLoading={dashboard.eventLoading}
              eventPagination={dashboard.eventPagination}
              loading={dashboard.loading}
              openDetail={openDetail}
              moduleContentProps={moduleContentProps}
            />
          ) : (
            <DashboardOverview
              loading={dashboard.loading}
              metrics={dashboard.metrics}
              trends={dashboard.trends}
              filteredAlerts={dashboard.filteredAlerts}
              onDismissAlert={dashboard.dismissAlert}
              decisions={dashboard.decisions}
              decisionSummary={dashboard.decisionSummary}
              onRefreshDecisions={() => void dashboard.refreshDecisions()}
              onResolveDecision={(decision) => void dashboard.resolveDecision(decision)}
              moduleContentProps={moduleContentProps}
              taskPagination={dashboard.taskPagination}
              pipelinesCount={dashboard.pipelines.length}
              eventPagination={dashboard.eventPagination}
              memoryTopicsCount={dashboard.memoryTopics.length}
              agentsCount={dashboard.agents.length}
              healthCount={dashboard.health.length}
            />
          )}

          {isMobile && (
            <nav className="mobile-bottom-nav" role="navigation" aria-label="底部导航">
              {DASHBOARD_MODULES.map((module) => (
                <button
                  key={module.key}
                  onClick={() => setActiveModule(module.key)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 min-w-[50px] transition-colors ${
                    activeModule === module.key ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'
                  }`}
                  aria-label={module.name}
                  aria-current={activeModule === module.key ? 'page' : undefined}
                >
                  <Icon name={module.icon} size={22} color={activeModule === module.key ? 'var(--color-primary)' : 'var(--text-muted)'} className="mb-0.5" />
                  <span className="text-[10px] font-medium truncate w-full text-center">{module.name.slice(0, 2)}</span>
                </button>
              ))}
            </nav>
          )}

          <footer className="mt-12 mb-6 hide-mobile">
            <div className="rounded-2xl border border-[var(--border-light)] dark:border-[var(--border-medium)] bg-[var(--bg-secondary)] dark:bg-[var(--bg-tertiary)] px-6 py-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/20 dark:ring-white/10">
                    M
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">Mission Claw</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">MVP · 实时任务总览</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-[var(--color-success)] rounded-full mr-2" />
                    数据源：{dashboard.dataSource}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--bg-tertiary)] dark:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-[var(--color-primary)] rounded-full mr-2" />
                    {dashboard.lastUpdated ? `最近同步：${formatUpdateTime(dashboard.lastUpdated)}` : '等待首次同步'}
                  </span>
                </div>
              </div>
            </div>
          </footer>

          <DetailModal
            isOpen={detailOpen}
            onClose={() => setDetailOpen(false)}
            data={selectedItem}
            onTaskUpdated={() => void dashboard.fetchTasks(dashboard.taskPage)}
            onRelatedObjectClick={handleRelatedObjectClick}
          />
        </div>
      </main>
    </div>
  );
}
