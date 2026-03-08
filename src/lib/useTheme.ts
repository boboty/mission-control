'use client';

import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'mission-claw-theme';

/**
 * 主题管理 Hook
 * - 支持三种模式：light(浅色) / dark(深色) / system(系统自动)
 * - 使用 localStorage 保存用户偏好
 * - 默认跟随系统，用户手动切换后记住选择
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // 获取系统主题偏好
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // 从 localStorage 读取主题
  const loadTheme = (): ThemeMode => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system'; // 默认跟随系统
  };

  // 更新 HTML data-theme 属性
  const updateThemeAttribute = (mode: ThemeMode) => {
    if (typeof window === 'undefined') return;
    
    const actualTheme = mode === 'system' ? getSystemTheme() : mode;
    document.documentElement.setAttribute('data-theme', mode);
    setResolvedTheme(actualTheme);
  };

  // 初始化主题
  useEffect(() => {
    const savedTheme = loadTheme();
    setTheme(savedTheme);
    updateThemeAttribute(savedTheme);

    // 监听系统主题变化（仅在 system 模式下生效）
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateThemeAttribute('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 设置主题
  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    updateThemeAttribute(mode);
  };

  // 切换主题（循环：light -> dark -> system -> light）
  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex]);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeMode,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };
}

/**
 * 获取当前主题（非 React 环境使用）
 */
export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

/**
 * 设置主题（非 React 环境使用）
 */
export function setTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  document.documentElement.setAttribute('data-theme', mode);
}
