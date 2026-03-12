import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Box, Users, TrendingUp, Settings, LogOut, BarChart3 } from 'lucide-react';
import { supabase } from '../services/supabase';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-slate-900 text-slate-300 p-6 flex flex-col h-full border-r border-slate-800">
      <div className="flex items-center gap-3 mb-10">
        <img
          src="https://aynqhizuumdqicenaogx.supabase.co/storage/v1/object/sign/logo/ChatGPT%20Image%205%20de%20set.%20de%202025,%2015_40_41.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81ZmE3Njk5YS1iNDNiLTRhYzQtODJkOS1hNmVjOTc4YzYxMzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvL0NoYXRHUFQgSW1hZ2UgNSBkZSBzZXQuIGRlIDIwMjUsIDE1XzQwXzQxLnBuZyIsImlhdCI6MTc3MjEzMDgxMSwiZXhwIjoxODAzNjY2ODExfQ.PUEHxi__YYHjT4bfrNc0HhsuLZQFHCPwCA0EgBfOZMA"
          alt="AgriControl Logo"
          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
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
          Gestão de Pivôs
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
          to="/inteligencia"
          className={({ isActive }) =>
            `flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800/50 hover:text-white'}`
          }
        >
          <BarChart3 className="w-4 h-4" />
          Inteligência
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
        <div className="flex items-center gap-3 px-3 mb-4">
          <img
            src="https://aynqhizuumdqicenaogx.supabase.co/storage/v1/object/sign/profile/Gemini_Generated_Image_x5vcg2x5vcg2x5vc.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81ZmE3Njk5YS1iNDNiLTRhYzQtODJkOS1hNmVjOTc4YzYxMzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwcm9maWxlL0dlbWluaV9HZW5lcmF0ZWRfSW1hZ2VfeDV2Y2cyeDV2Y2cyeDV2Yy5wbmciLCJpYXQiOjE3NzIxMzA1MDgsImV4cCI6MTgwMzY2NjUwOH0.fc4gjNDgmuB50AFHntfzMV78oQfUKXnwahxmzRpqovA"
            alt="Paloma Pires"
            className="w-9 h-9 rounded-full object-cover border-2 border-slate-700 flex-shrink-0"
            onError={(e) => {
              // Fallback para iniciais se a imagem não carregar
              e.currentTarget.style.display = 'none';
              (e.currentTarget.nextSibling as HTMLElement)?.style && ((e.currentTarget.nextSibling as HTMLElement).style.display = 'flex');
            }}
          />
          <div className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 hidden">
            PP
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Paloma Pires</p>
            <p className="text-xs text-slate-500 truncate">Administradora</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
