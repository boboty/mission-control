/**
 * Export utilities for CSV and PDF export
 */

import { type Task } from './types';

/**
 * Convert tasks to CSV format with UTF-8 BOM for Chinese character support
 */
export function tasksToCSV(tasks: Task[]): string {
  // UTF-8 BOM for proper Chinese character rendering in Excel
  const BOM = '\uFEFF';
  
  // CSV header
  const headers = ['ID', '标题', '状态', '优先级', '负责人', '截止日期', '更新时间'];
  
  // Status mapping
  const statusMap: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    blocked: '已阻塞',
    done: '已完成',
  };
  
  // Priority mapping
  const priorityMap: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  
  // Convert tasks to CSV rows
  const rows = tasks.map(task => {
    const formatDate = (dateStr: string | null | undefined) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    
    return [
      task.id.toString(),
      `"${(task.title || '').replace(/"/g, '""')}"`, // Escape quotes
      statusMap[task.status] || task.status,
      priorityMap[task.priority] || task.priority,
      task.owner || '',
      formatDate(task.due_at),
      formatDate(task.updated_at),
    ].join(',');
  });
  
  return BOM + [headers.join(','), ...rows].join('\n');
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export tasks to CSV file
 */
export function exportTasksToCSV(tasks: Task[], filename?: string) {
  const csvContent = tasksToCSV(tasks);
  const defaultFilename = `任务导出_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, filename || defaultFilename);
}

/**
 * Export tasks to PDF using browser print
 * This creates a print-friendly view and triggers window.print()
 */
export function exportTasksToPDF(tasks: Task[]) {
  // Create a print-friendly window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('请允许弹出窗口以导出 PDF');
    return;
  }
  
  // Status mapping
  const statusMap: Record<string, string> = {
    todo: '待办',
    in_progress: '进行中',
    blocked: '已阻塞',
    done: '已完成',
  };
  
  // Priority mapping
  const priorityMap: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>任务导出 - ${new Date().toLocaleDateString('zh-CN')}</title>
      <style>
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #1a1a1a;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1 {
          font-size: 18px;
          margin-bottom: 8px;
          color: #1a1a1a;
        }
        .subtitle {
          font-size: 11px;
          color: #666;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px 10px;
          text-align: left;
        }
        th {
          background-color: #f5f5f5;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
        }
        tr:nth-child(even) {
          background-color: #fafafa;
        }
        tr:hover {
          background-color: #f0f0f0;
        }
        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
        }
        .status-todo { background-color: #e2e8f0; color: #475569; }
        .status-in_progress { background-color: #dbeafe; color: #1e40af; }
        .status-blocked { background-color: #fee2e2; color: #991b1b; }
        .status-done { background-color: #d1fae5; color: #065f46; }
        .priority-high { color: #dc2626; font-weight: 600; }
        .priority-medium { color: #6b7280; }
        .priority-low { color: #9ca3af; }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #999;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>任务列表</h1>
      <p class="subtitle">导出时间：${new Date().toLocaleString('zh-CN')} · 共 ${tasks.length} 项任务</p>
      
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">ID</th>
            <th>标题</th>
            <th style="width: 80px;">状态</th>
            <th style="width: 60px;">优先级</th>
            <th style="width: 80px;">负责人</th>
            <th style="width: 120px;">截止日期</th>
            <th style="width: 120px;">更新时间</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => `
            <tr>
              <td>${task.id}</td>
              <td>${(task.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
              <td>
                <span class="status-badge status-${task.status}">
                  ${statusMap[task.status] || task.status}
                </span>
              </td>
              <td class="priority-${task.priority}">
                ${priorityMap[task.priority] || task.priority}
              </td>
              <td>${task.owner || ''}</td>
              <td>${formatDate(task.due_at)}</td>
              <td>${formatDate(task.updated_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        Mission Control · 任务管理系统
      </div>
      
      <script>
        // Auto-print on load
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Interface for export state
 */
export interface ExportState {
  isExporting: boolean;
  exportType: 'csv' | 'pdf' | null;
}
