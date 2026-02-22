/**
 * 数据完整性验证工具
 * 
 * 用于验证从 API 获取的数据是否符合预期格式
 * 提供数据质量检查和错误报告
 */

// 数据类型验证结果
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats?: DataStats;
}

export interface DataStats {
  totalRecords: number;
  emptyFields: Record<string, number>;
  invalidDates: number;
  duplicateIds: number;
}

// 验证任务数据
export function validateTasks(data: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const emptyFields: Record<string, number> = {};
  let invalidDates = 0;
  const ids = new Set<number>();
  let duplicateIds = 0;

  if (!Array.isArray(data)) {
    errors.push('数据格式错误：期望数组类型');
    return { valid: false, errors, warnings };
  }

  data.forEach((item, index) => {
    // 检查必需字段
    if (!item.id) {
      errors.push(`第 ${index + 1} 条记录缺少 id 字段`);
    } else {
      if (ids.has(item.id)) {
        duplicateIds++;
        warnings.push(`发现重复 ID: ${item.id}`);
      }
      ids.add(item.id);
    }

    if (!item.title) {
      errors.push(`第 ${index + 1} 条记录缺少 title 字段`);
    }

    // 检查可选字段为空的情况
    const optionalFields = ['status', 'priority', 'owner', 'next_action', 'due_at'];
    optionalFields.forEach(field => {
      if (!item[field] && item[field] !== false && item[field] !== 0) {
        emptyFields[field] = (emptyFields[field] || 0) + 1;
      }
    });

    // 验证日期格式
    if (item.due_at) {
      const date = new Date(item.due_at);
      if (isNaN(date.getTime())) {
        invalidDates++;
        warnings.push(`第 ${index + 1} 条记录的 due_at 日期格式无效`);
      }
    }

    // 验证状态值
    const validStatuses = ['todo', 'in_progress', 'done', 'blocked'];
    if (item.status && !validStatuses.includes(item.status)) {
      warnings.push(`第 ${index + 1} 条记录的状态值 "${item.status}" 不在预期范围内`);
    }

    // 验证优先级值
    const validPriorities = ['low', 'medium', 'high'];
    if (item.priority && !validPriorities.includes(item.priority)) {
      warnings.push(`第 ${index + 1} 条记录的优先级 "${item.priority}" 不在预期范围内`);
    }
  });

  const stats: DataStats = {
    totalRecords: data.length,
    emptyFields,
    invalidDates,
    duplicateIds,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

// 验证健康快照数据
export function validateHealthSnapshots(data: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('数据格式错误：期望数组类型');
    return { valid: false, errors, warnings };
  }

  if (data.length === 0) {
    warnings.push('健康快照数据为空，可能需要等待首次检测生成');
  }

  data.forEach((item, index) => {
    if (!item.id) {
      errors.push(`第 ${index + 1} 条记录缺少 id 字段`);
    }

    // 检查关键字段
    if (typeof item.blocked_count !== 'number') {
      warnings.push(`第 ${index + 1} 条记录的 blocked_count 不是数字`);
    }

    if (typeof item.pending_decisions !== 'number') {
      warnings.push(`第 ${index + 1} 条记录的 pending_decisions 不是数字`);
    }

    if (typeof item.cron_ok !== 'boolean') {
      warnings.push(`第 ${index + 1} 条记录的 cron_ok 不是布尔值`);
    }

    // 验证时间戳
    if (item.created_at) {
      const date = new Date(item.created_at);
      if (isNaN(date.getTime())) {
        errors.push(`第 ${index + 1} 条记录的 created_at 日期格式无效`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// 通用验证函数
export function validateData(type: string, data: any[]): ValidationResult {
  switch (type) {
    case 'tasks':
      return validateTasks(data);
    case 'health':
      return validateHealthSnapshots(data);
    default:
      // 对其他类型进行基础验证
      if (!Array.isArray(data)) {
        return {
          valid: false,
          errors: ['数据格式错误：期望数组类型'],
          warnings: [],
        };
      }
      return {
        valid: true,
        errors: [],
        warnings: data.length === 0 ? ['数据为空'] : [],
        stats: {
          totalRecords: data.length,
          emptyFields: {},
          invalidDates: 0,
          duplicateIds: 0,
        },
      };
  }
}

// 数据质量报告（用于调试）
export function generateDataQualityReport(validation: ValidationResult, moduleName: string): string {
  const lines: string[] = [];
  
  lines.push(`📊 ${moduleName} 数据质量报告`);
  lines.push('=' .repeat(40));
  
  if (validation.valid) {
    lines.push('✅ 数据验证通过');
  } else {
    lines.push('❌ 数据验证失败');
  }
  
  if (validation.stats) {
    lines.push(`📈 总记录数：${validation.stats.totalRecords}`);
    
    if (Object.keys(validation.stats.emptyFields).length > 0) {
      lines.push('⚠️ 空字段统计:');
      Object.entries(validation.stats.emptyFields).forEach(([field, count]) => {
        lines.push(`   - ${field}: ${count} 条`);
      });
    }
    
    if (validation.stats.invalidDates > 0) {
      lines.push(`⚠️ 无效日期：${validation.stats.invalidDates} 条`);
    }
    
    if (validation.stats.duplicateIds > 0) {
      lines.push(`⚠️ 重复 ID: ${validation.stats.duplicateIds} 个`);
    }
  }
  
  if (validation.errors.length > 0) {
    lines.push('');
    lines.push('❌ 错误:');
    validation.errors.forEach(error => lines.push(`   - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    lines.push('');
    lines.push('⚠️ 警告:');
    validation.warnings.forEach(warning => lines.push(`   - ${warning}`));
  }
  
  return lines.join('\n');
}
