/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import AssetManagementPage from './pages/AssetManagementPage';
import HrFinancePage from './pages/HrFinancePage';
import StrategicSimulationPage from './pages/StrategicSimulationPage';
import DataSettingsPage from './pages/DataSettingsPage';


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="assets" element={<AssetManagementPage />} />
          <Route path="hr-finance" element={<HrFinancePage />} />
          <Route path="strategic-simulation" element={<StrategicSimulationPage />} />
          <Route path="data-settings" element={<DataSettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

