import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  Moon,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import { NavigationSection } from '../types/studysync';
import { useStudySync } from '../hooks/useStudySync';

interface NavItem {
  id: NavigationSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'library', label: 'Learning Library', icon: BookOpen },
  { id: 'quizzes', label: 'AI Quizzes', icon: CheckCircle2 },
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  { id: 'planner', label: 'Study Planner', icon: CalendarClock },
  { id: 'wellness', label: 'Student Wellness', icon: HeartHandshake },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const {
    state,
    activeSection,
    setActiveSection,
    toggleTheme,
    resetDemoWorkspace,
    backendHealth,
    storageQuotaWarning,
  } = useStudySync();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];

  const handleSelectNav = (id: NavigationSection) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 transition-colors duration-150">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800/90 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary Navigation"
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/90">
          <button
            type="button"
            onClick={() => handleSelectNav('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </span>
            <span className="font-display font-semibold text-base tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              StudySync AI
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Demo Profile & AI Backend Status Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/90 space-y-3">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {state.student.displayName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Try Demo Workspace · No Sign-up
            </p>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <span className="block font-medium text-slate-700 dark:text-slate-300">
              {backendHealth.aiConnected
                ? 'Gemini API: Connected'
                : 'AI Mode: Demonstration Rubric'}
            </span>
            <span className="block mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {backendHealth.aiConnected
                ? 'Server proxy active'
                : 'Local prototype storage'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800/90 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 whitespace-nowrap">
                StudySync AI
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">
                /
              </span>
              <h1 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 truncate">
                {currentNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {resetConfirmOpen ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Reset demo data?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetDemoWorkspace();
                    setResetConfirmOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setResetConfirmOpen(false)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label={
                state.theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              title={
                state.theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
            >
              {state.theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-4">
          {storageQuotaWarning && (
            <div
              role="alert"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Browser local storage is nearing capacity. Consider removing older large extracted text entries or deploying Cloudflare D1 persistence.
              </span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
