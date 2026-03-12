import { NextResponse } from 'next/server';
import { updateAgentStatus } from '@/lib/agent-status';

export type OperatorAction = '工作' | '喝茶' | '巡视';

const OPERATOR_KEY = 'boss';
const OPERATOR_NAME = '一波';
const ALLOWED_ACTIONS = new Set<OperatorAction>(['工作', '喝茶', '巡视']);

function mapActionToRuntime(action: OperatorAction): { state: 'running' | 'idle' | 'online'; currentTask: OperatorAction } {
  switch (action) {
    case '工作':
      return { state: 'running', currentTask: action };
    case '喝茶':
      return { state: 'idle', currentTask: action };
    case '巡视':
      return { state: 'online', currentTask: action };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action as OperatorAction | undefined;

    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const runtime = mapActionToRuntime(action);
    await updateAgentStatus(OPERATOR_KEY, runtime.state, {
      displayName: OPERATOR_NAME,
      description: '操作者，不纳入 agent roster',
      currentTask: runtime.currentTask,
      statusSource: 'operator_manual',
    });

    const response = NextResponse.json({
      success: true,
      operator: {
        agent_key: OPERATOR_KEY,
        display_name: OPERATOR_NAME,
        role: 'operator',
        action,
        state: runtime.state,
        current_task: runtime.currentTask,
        status_source: 'operator_manual',
        last_seen_at: new Date().toISOString(),
      },
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Failed to update operator status:', error);
    return NextResponse.json(
      {
        error: 'Failed to update operator status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
