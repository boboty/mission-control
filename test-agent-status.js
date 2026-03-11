// 测试 Agent Status API
const BASE_URL = 'http://localhost:3000';

async function testAgentStatus() {
  console.log('🧪 测试 Agent Status API\n');

  // 测试 1: 上报 running 状态
  console.log('1. 测试上报 running 状态...');
  const res1 = await fetch(`${BASE_URL}/api/agents/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_key: 'main',
      state: 'running',
      current_task: '处理用户请求',
    }),
  });
  const data1 = await res1.json();
  console.log('   响应:', JSON.stringify(data1, null, 2));

  // 测试 2: 上报 idle 状态
  console.log('\n2. 测试上报 idle 状态...');
  const res2 = await fetch(`${BASE_URL}/api/agents/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_key: 'feishu_main',
      state: 'idle',
      display_name: '道 Q 鲍特',
    }),
  });
  const data2 = await res2.json();
  console.log('   响应:', JSON.stringify(data2, null, 2));

  // 测试 3: 上报 offline 状态
  console.log('\n3. 测试上报 offline 状态...');
  const res3 = await fetch(`${BASE_URL}/api/agents/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_key: 'baotedu',
      state: 'offline',
    }),
  });
  const data3 = await res3.json();
  console.log('   响应:', JSON.stringify(data3, null, 2));

  // 测试 4: 拒绝 boss
  console.log('\n4. 测试拒绝 boss (非 agent)...');
  const res4 = await fetch(`${BASE_URL}/api/agents/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_key: 'boss',
      state: 'running',
    }),
  });
  const data4 = await res4.json();
  console.log('   响应:', JSON.stringify(data4, null, 2));

  // 测试 5: 获取所有 agents
  console.log('\n5. 测试获取 agents 列表...');
  const res5 = await fetch(`${BASE_URL}/api/agents`);
  const data5 = await res5.json();
  console.log('   Agents 数量:', data5.agents?.length || 0);
  if (data5.agents) {
    data5.agents.forEach(agent => {
      console.log(`   - ${agent.agent_key}: ${agent.display_name} | state=${agent.state} | presence=${agent.presence} | freshness=${agent.freshness_level}`);
    });
  }

  console.log('\n✅ 测试完成');
}

testAgentStatus().catch(console.error);
