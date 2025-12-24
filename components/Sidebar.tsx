
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Database,
  ShieldAlert,
  ShieldCheck,
  Bookmark,
  ChevronDown,
  Trash2,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { ThemeMode, UserRole, SavedScenario } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'reports') => void;
  data: any[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  themeMode?: ThemeMode;
  role?: UserRole;
  scenarios?: SavedScenario[];
  onApplyScenario?: (scenario: SavedScenario) => void;
  onDeleteScenario?: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  data, 
  onFileUpload, 
  themeMode = 'light', 
  role = 'viewer',
  scenarios = [],
  onApplyScenario,
  onDeleteScenario
}) => {
  const [isScenariosExpanded, setIsScenariosExpanded] = useState(false);
  const isDark = themeMode === 'dark';
  const isAdmin = role === 'admin';
  const canImport = role === 'admin' || role === 'editor';
  
  const sidebarBg = isDark ? 'bg-slate-950' : 'bg-[#72a024]';
  const borderColor = isDark ? 'border-r-2 border-slate-800' : '';

  return (
    <aside className={`w-64 flex flex-col sticky top-0 h-screen transition-colors duration-300 ${sidebarBg} ${borderColor} text-white hidden lg:flex shadow-2xl`}>
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-2 text-white mb-8 px-2">
          <Database className={`h-8 w-8 ${isDark ? 'text-[#72a024]' : 'text-white'}`} />
          <span className="text-xl font-bold tracking-tight">COLEPACK<span className={isDark ? 'text-white' : 'text-slate-100/70'}>OS</span></span>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'dashboard' 
                ? isDark ? 'bg-[#72a024] text-white shadow-lg' : 'bg-white/20 text-white shadow-lg border border-white/30' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-bold text-sm">Dashboard Gerencial</span>
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'reports' 
                ? isDark ? 'bg-[#72a024] text-white shadow-lg' : 'bg-white/20 text-white shadow-lg border border-white/30' 
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="font-bold text-sm">Documentação Técnica</span>
          </button>

          {/* Scenario Section */}
          <div className="pt-2">
            <button
              onClick={() => setIsScenariosExpanded(!isScenariosExpanded)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-white/70 hover:text-white hover:bg-white/10`}
            >
              <Bookmark className="h-5 w-5" />
              <span className="font-bold text-sm flex-1 text-left">Cenários</span>
              {isScenariosExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            
            {isScenariosExpanded && (
              <div className="mt-1 ml-4 pl-4 border-l-2 border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-200">
                {scenarios.length > 0 ? scenarios.map((s) => (
                  <div key={s.id} className="group relative flex items-center">
                    <button
                      onClick={() => onApplyScenario?.(s)}
                      className="flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 truncate transition-all"
                      title={s.name}
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={() => onDeleteScenario?.(s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )) : (
                  <p className="px-3 py-2 text-[10px] text-white/40 italic">Nenhum cenário salvo</p>
                )}
              </div>
            )}
          </div>

          {/* Cost Center Section */}
          <div className="pt-2">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-white/70 hover:text-white hover:bg-white/10 cursor-default outline-none`}
            >
              <Wallet className="h-5 w-5" />
              <span className="font-bold text-sm flex-1 text-left">Centro de Custo</span>
            </button>
          </div>
        </nav>
      </div>

      <div className="p-6 space-y-4 border-t border-white/10">
        {canImport && (
          <div className={`p-4 rounded-2xl border-2 transition-colors ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/10 border-white/20'}`}>
            <div className="flex items-center gap-2 text-white/80 mb-3 text-[10px] font-black uppercase">
              <ShieldAlert className={`h-4 w-4 ${isDark ? 'text-[#72a024]' : 'text-white'}`} />
              <span>Gestão de Dados</span>
            </div>
            <label className="cursor-pointer block">
              <div className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${isDark ? 'bg-slate-700 border-slate-600 hover:bg-[#72a024]' : 'bg-white/20 hover:bg-white/30 border-white/30'} text-white active:scale-95`}>
                <Upload className="h-4 w-4" />
                <span>Atualizar Base</span>
              </div>
              <input type="file" accept=".xlsx, .xls" onChange={onFileUpload} className="hidden" />
            </label>
          </div>
        )}

        <div className={`pt-4 flex items-center gap-3 px-2`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs ${isAdmin ? 'bg-red-500' : 'bg-blue-500'}`}>
            {isAdmin ? <ShieldCheck className="h-5 w-5" /> : role.substring(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <p className="text-[11px] font-black text-white truncate leading-tight uppercase">{role}</p>
            <p className="text-[9px] text-white/60 font-bold">COLEPACK v2.5</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
