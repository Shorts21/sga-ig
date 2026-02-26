import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon: Icon, trend }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between min-h-[110px]">
      <div className="flex justify-between items-start">
        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h4>
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
      </div>
      
      <div className="mt-2">
        <div className="flex items-baseline space-x-2">
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          {trend && (
            <span className={`text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      </div>
    </div>
  );
};

export default StatCard;
