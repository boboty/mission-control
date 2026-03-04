-- Mission Control: 财务流程管线 Schema 扩展
-- 创建时间：2026-03-04
-- 说明：支持代理记账公司完整业务流程（12 阶段）

-- ============================================
-- 1. 扩展 pipelines 表
-- ============================================
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS company_id INTEGER;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS period VARCHAR(7);
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS current_stage INTEGER DEFAULT 1;
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'normal';
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_pipelines_company_id ON pipelines(company_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_period ON pipelines(period);
CREATE INDEX IF NOT EXISTS idx_pipelines_current_stage ON pipelines(current_stage);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);

-- ============================================
-- 2. 创建 companies 表（客户公司）
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  industry VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- ============================================
-- 3. 创建 pipeline_stage_definitions 表（阶段定义）
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_stage_definitions (
  id SERIAL PRIMARY KEY,
  stage_no INTEGER NOT NULL UNIQUE,
  stage_name VARCHAR(50) NOT NULL,
  stage_group VARCHAR(50) NOT NULL,
  checklist_template JSONB DEFAULT '[]'::jsonb,
  role_required VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_def_group ON pipeline_stage_definitions(stage_group);

-- ============================================
-- 4. 创建 pipeline_stages 表（流程实例的阶段）
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id SERIAL PRIMARY KEY,
  pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  stage_no INTEGER NOT NULL,
  stage_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  checker VARCHAR(100),
  checked_at TIMESTAMP WITH TIME ZONE,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_stage_no ON pipeline_stages(stage_no);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_status ON pipeline_stages(status);

-- ============================================
-- 5. 创建 pipeline_documents 表（文档管理）
-- ============================================
CREATE TABLE IF NOT EXISTS pipeline_documents (
  id SERIAL PRIMARY KEY,
  pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL,
  doc_name VARCHAR(255),
  doc_path VARCHAR(500),
  file_size INTEGER,
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_documents_pipeline_id ON pipeline_documents(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_documents_doc_type ON pipeline_documents(doc_type);

-- ============================================
-- 6. 插入 12 阶段默认配置
-- ============================================
INSERT INTO pipeline_stage_definitions (stage_no, stage_name, stage_group, checklist_template, role_required) VALUES
(1, '客户对接', '客户对接', 
 '[{"name": "服务合同签署", "done": false}, {"name": "客户档案建立", "done": false}, {"name": "服务清单确认", "done": false}, {"name": "联系人信息录入", "done": false}]',
 '客户经理'),

(2, '票据收集', '票据收集',
 '[{"name": "银行流水完整", "done": false}, {"name": "发票收集完整", "done": false}, {"name": "费用单据收集", "done": false}, {"name": "票据清单核对", "done": false}]',
 '会计助理'),

(3, '票据初审', '票据收集',
 '[{"name": "发票真伪验证", "done": false}, {"name": "票据分类整理", "done": false}, {"name": "问题票据标记", "done": false}, {"name": "初审通过率≥95%", "done": false}]',
 '会计助理'),

(4, '银行对账', '票据收集',
 '[{"name": "余额一致", "done": false}, {"name": "差异项说明", "done": false}, {"name": "余额调节表编制", "done": false}]',
 '会计助理'),

(5, '凭证编制', '账务处理',
 '[{"name": "科目使用准确", "done": false}, {"name": "借贷平衡", "done": false}, {"name": "附件完整", "done": false}]',
 '会计'),

(6, '账簿登记', '账务处理',
 '[{"name": "账证相符", "done": false}, {"name": "账账相符", "done": false}, {"name": "试算平衡", "done": false}]',
 '会计'),

(7, '报表编制', '账务处理',
 '[{"name": "资产负债表", "done": false}, {"name": "利润表", "done": false}, {"name": "现金流量表", "done": false}, {"name": "报表勾稽关系", "done": false}]',
 '会计'),

(8, '税务计算', '税务申报',
 '[{"name": "税种完整", "done": false}, {"name": "计算准确", "done": false}, {"name": "优惠政策应用", "done": false}]',
 '税务会计'),

(9, '纳税申报', '税务申报',
 '[{"name": "申报成功", "done": false}, {"name": "缴款完成", "done": false}, {"name": "申报回执保存", "done": false}]',
 '税务会计'),

(10, '账务复核', '复核归档',
 '[{"name": "全面复核", "done": false}, {"name": "问题修正", "done": false}, {"name": "复核签字", "done": false}]',
 '财务主管'),

(11, '档案归档', '复核归档',
 '[{"name": "凭证装订", "done": false}, {"name": "账簿装订", "done": false}, {"name": "报表归档", "done": false}, {"name": "专柜保管", "done": false}]',
 '档案员'),

(12, '客户交接', '复核归档',
 '[{"name": "财务报表交付", "done": false}, {"name": "税务资料交付", "done": false}, {"name": "客户确认签字", "done": false}, {"name": "问题解答", "done": false}]',
 '客户经理')
ON CONFLICT (stage_no) DO UPDATE SET
  stage_name = EXCLUDED.stage_name,
  stage_group = EXCLUDED.stage_group,
  checklist_template = EXCLUDED.checklist_template,
  role_required = EXCLUDED.role_required;

-- ============================================
-- 7. 插入示例客户公司
-- ============================================
INSERT INTO companies (name, tax_id, contact_person, contact_phone, industry) VALUES
('示例科技有限公司', '91110108MA01234567', '张三', '13800138000', '科技服务'),
('示例贸易公司', '91110105MA98765432', '李四', '13900139000', '商贸零售'),
('示例咨询公司', '91110106MA11223344', '王五', '13700137000', '咨询服务')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. 插入示例流程（2026-03 会计期间）
-- ============================================
INSERT INTO pipelines (company_id, company_name, period, current_stage, status, item_name, stage, owner, due_at) VALUES
(1, '示例科技有限公司', '2026-03', 5, 'normal', '2026 年 3 月账务', '账务处理', '会计 A', '2026-03-15'),
(2, '示例贸易公司', '2026-03', 3, 'normal', '2026 年 3 月账务', '票据初审', '会计助理 B', '2026-03-10'),
(3, '示例咨询公司', '2026-03', 8, 'normal', '2026 年 3 月账务', '税务计算', '税务会计 C', '2026-03-15')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. 创建视图：流程概览
-- ============================================
CREATE OR REPLACE VIEW pipeline_overview AS
SELECT 
  p.id,
  p.company_id,
  p.company_name,
  p.period,
  p.current_stage,
  p.status,
  psd.stage_name as current_stage_name,
  psd.stage_group as current_stage_group,
  p.item_name,
  p.owner,
  p.due_at,
  p.updated_at
FROM pipelines p
LEFT JOIN pipeline_stage_definitions psd ON p.current_stage = psd.stage_no
ORDER BY p.period DESC, p.current_stage ASC;

COMMENT ON TABLE pipelines IS '财务流程管线 - 管理客户公司月度账务流程';
COMMENT ON TABLE companies IS '客户公司表 - 代理记账服务对象';
COMMENT ON TABLE pipeline_stage_definitions IS '阶段定义表 - 12 阶段标准配置';
COMMENT ON TABLE pipeline_stages IS '流程实例阶段表 - 每个流程的具体阶段执行记录';
COMMENT ON TABLE pipeline_documents IS '流程文档表 - 关联的票据/凭证/报表等';
