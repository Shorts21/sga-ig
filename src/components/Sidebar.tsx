import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Box, Users, TrendingUp, Settings } from 'lucide-react';

const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-slate-900 text-slate-300 p-6 flex flex-col h-full border-r border-slate-800">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-slate-900 rounded-sm" />
        </div>
        <div className="text-xl font-bold text-white tracking-tight">AgriControl</div>
      </div>
      
      <nav className="flex-1 space-y-1">
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => 
            `flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800/50 hover:text-white'}`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>
        <NavLink 
          to="/assets"
          className={({ isActive }) => 
            `flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800/50 hover:text-white'}`
          }
        >
          <Box className="w-4 h-4" />
          Gestão de Ativos
        </NavLink>
        <NavLink 
          to="/hr-finance"
          className={({ isActive }) => 
            `flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800/50 hover:text-white'}`
          }
        >
          <Users className="w-4 h-4" />
          RH & Financeiro
        </NavLink>
        <NavLink 
          to="/strategic-simulation"
          className={({ isActive }) => 
            `flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800/50 hover:text-white'}`
          }
        >
          <TrendingUp className="w-4 h-4" />
          Simulação
        </NavLink>
        <NavLink 
          to="/data-settings"
          className={({ isActive }) => 
            `flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800/50 hover:text-white'}`
          }
        >
          <Settings className="w-4 h-4" />
          Configurações
        </NavLink>
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">João Doria</p>
            <p className="text-xs text-slate-500 truncate">Administrador</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
