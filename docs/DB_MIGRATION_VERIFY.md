# DB 迁移验证清单

## 执行方式

### 方式 1：Supabase Dashboard SQL Editor（推荐）

1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 进入项目 `lzhgwgwqldflbozvhuot`
3. 打开 **SQL Editor**
4. 复制并执行 `db/migrations/20260304_pipeline_finance_schema.sql` 全部内容

---

## 验证 SQL

### 1. 验证表创建成功

```sql
-- 检查 4 个新表是否存在
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'companies',
    'pipeline_stage_definitions',
    'pipeline_stages',
    'pipeline_documents'
  )
order by table_name;
```

**预期结果**：返回 4 行

| table_name |
|-----------|
| companies |
| pipeline_documents |
| pipeline_stage_definitions |
| pipeline_stages |

---

### 2. 验证 12 阶段配置已插入

```sql
-- 检查阶段数量和范围
select 
  count(*) as stage_count,
  min(stage_no) as min_stage,
  max(stage_no) as max_stage
from pipeline_stage_definitions;
```

**预期结果**：`stage_count=12, min_stage=1, max_stage=12`

---

```sql
-- 查看所有阶段定义
select stage_no, stage_name, stage_group, role_required
from pipeline_stage_definitions
order by stage_no;
```

**预期结果**：

| stage_no | stage_name | stage_group | role_required |
|----------|-----------|-------------|---------------|
| 1 | 客户对接 | 客户对接 | 客户经理 |
| 2 | 票据收集 | 票据收集 | 会计助理 |
| 3 | 票据初审 | 票据收集 | 会计助理 |
| 4 | 银行对账 | 票据收集 | 会计助理 |
| 5 | 凭证编制 | 账务处理 | 会计 |
| 6 | 账簿登记 | 账务处理 | 会计 |
| 7 | 报表编制 | 账务处理 | 会计 |
| 8 | 税务计算 | 税务申报 | 税务会计 |
| 9 | 纳税申报 | 税务申报 | 税务会计 |
| 10 | 账务复核 | 复核归档 | 财务主管 |
| 11 | 档案归档 | 复核归档 | 档案员 |
| 12 | 客户交接 | 复核归档 | 客户经理 |

---

### 3. 验证示例客户公司

```sql
select id, name, tax_id, contact_person, industry
from companies
order by id;
```

**预期结果**：3 条示例公司记录

---

### 4. 验证 pipelines 表扩展字段

```sql
-- 检查 pipelines 表新增列
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' 
  and table_name='pipelines'
  and column_name in ('company_id', 'period', 'current_stage', 'status', 'company_name')
order by ordinal_position;
```

**预期结果**：返回 5 列定义

---

### 5. 验证视图创建

```sql
-- 检查 pipeline_overview 视图
select * from pipeline_overview limit 5;
```

**预期结果**：返回示例流程数据（如果有插入）

---

## 失败处理

### 如果表不存在
- 检查 SQL 执行是否有报错
- 确认 Supabase 项目连接正确

### 如果阶段数据不存在
- 重新执行 INSERT 语句部分
- 检查是否有约束冲突

### 如果 pipelines 扩展字段不存在
- 检查 ALTER TABLE 语句是否执行成功
- 可能需要手动执行 ALTER TABLE 语句

---

## 执行完成后

将验证结果（截图或 SQL 输出）发送给主代理，确认后可以继续推进前端联调。
