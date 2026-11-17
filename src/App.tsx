/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StudySyncProvider, useStudySync } from './hooks/useStudySync';
import { LayoutShell } from './components/LayoutShell';
import { DashboardPage } from './pages/DashboardPage';
import { LearningLibraryPage } from './pages/LearningLibraryPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PlannerPage } from './pages/PlannerPage';
import { WellnessPage } from './pages/WellnessPage';

function ActiveSectionRouter() {
  const { activeSection } = useStudySync();

  switch (activeSection) {
    case 'dashboard':
      return <DashboardPage />;
    case 'library':
      return <LearningLibraryPage />;
    case 'quizzes':
      return <QuizzesPage />;
    case 'analytics':
      return <AnalyticsPage />;
    case 'planner':
      return <PlannerPage />;
    case 'wellness':
      return <WellnessPage />;
    default:
      return <DashboardPage />;
  }
}

export default function App() {
  return (
    <StudySyncProvider>
      <LayoutShell>
        <ActiveSectionRouter />
      </LayoutShell>
    </StudySyncProvider>
  );
}
