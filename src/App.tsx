/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import AssetManagementPage from './pages/AssetManagementPage';
import HrFinancePage from './pages/HrFinancePage';
import StrategicSimulationPage from './pages/StrategicSimulationPage';
import DataSettingsPage from './pages/DataSettingsPage';
import LoginPage from './pages/LoginPage';
import PainelEstudos from './pages/PainelEstudos';


export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/dashboard" replace />} />

        <Route path="/" element={session ? <AppLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="assets" element={<AssetManagementPage />} />
          <Route path="hr-finance" element={<HrFinancePage />} />
          <Route path="strategic-simulation" element={<StrategicSimulationPage />} />
          <Route path="inteligencia" element={<PainelEstudos />} />
          <Route path="data-settings" element={<DataSettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

