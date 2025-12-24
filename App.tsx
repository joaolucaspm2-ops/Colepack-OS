import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Settings, 
  Upload,
  LayoutDashboard,
  Database,
  Sun,
  Moon,
  X,
  Check,
  History,
  User,
  Shield
} from 'lucide-react';
import { ServiceOrder, DashboardFilters, ThemeMode, UserPreferences, ImportHistory, DensityMode, UserRole, SavedScenario } from './types';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import ReportGenerator from './components/ReportGenerator';

const App: React.FC = () => {
  const [data, setData] = useState<ServiceOrder[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>(JSON.parse(localStorage.getItem('maintlytics_history') || '[]'));
  
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('maintlytics_scenarios') || '[]');
    } catch {
      return [];
    }
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('maintlytics_prefs');
    return saved ? JSON.parse(saved) : {
      theme: 'light',
      density: 'comfortable',
      role: 'admin',
      goals: { mttr: 120, mtbf: 24, availability: 90 }
    };
  });

  const [filters, setFilters] = useState<DashboardFilters>({
    machineCodes: [],
    period: 'all',
    status: 'all'
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('maintlytics_prefs', JSON.stringify(preferences));
  }, [preferences]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json<any>(ws);

      const cleanedData: ServiceOrder[] = rawData.map((row) => ({
        DT_INCLUSAO: row.DT_INCLUSAO || row.dt_inclusao,
        COD_EQP: String(row.COD_EQP || row.cod_eqp).trim(),
        DESC_EQP: String(row.DESC_EQP || row.desc_eqp).trim(),
        COD_OS: String(row.COD_OS || row.cod_os),
        CODIGO_DFT: String(row.CODIGO_DFT || row.codigo_dft),
        DESC_DFT: String(row.DESC_DFT || row.desc_dft),
        SITUACAO: String(row.SITUACAO || row.situacao),
        OBSERVACAO: String(row.OBSERVACAO || row.observacao || ""),
        DT_ABERTURA: String(row.DT_ABERTURA || row.dt_abertura),
        HR_ABERTURA: String(row.HR_ABERTURA || row.hr_abertura),
        DT_FECHAMENTO: row.DT_FECHAMENTO || row.dt_fechamento || null,
        HR_FECHAMENTO: row.HR_FECHAMENTO || row.hr_fechamento || null,
        TP_REALIZADO: Number(row.TP_REALIZADO || row.tp_realizado || 0),
      })).filter((item, index, self) => 
        index === self.findIndex((t) => t.COD_OS === item.COD_OS)
      );

      setData(cleanedData);
      const newHistory: ImportHistory = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        fileName: file.name,
        count: cleanedData.length
      };
      const updatedHistory = [newHistory, ...importHistory].slice(0, 10);
      setImportHistory(updatedHistory);
      localStorage.setItem('maintlytics_history', JSON.stringify(updatedHistory));
      setFilters({ machineCodes: [], period: 'all', status: 'all' });
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyScenario = (scenario: SavedScenario) => {
    const availableCodes = new Set(data.map(os => os.COD_EQP));
    const invalidCodes = scenario.filters.machineCodes.filter(c => !availableCodes.has(c));
    
    if (invalidCodes.length > 0 && data.length > 0) {
      alert(`Aviso: Os seguintes códigos de máquinas do cenário "${scenario.name}" não foram encontrados na base de dados atual e serão ignorados: ${invalidCodes.join(', ')}`);
    }

    const filteredMachineCodes = scenario.filters.machineCodes.filter(c => availableCodes.has(c));
    setFilters({ ...scenario.filters, machineCodes: data.length > 0 ? filteredMachineCodes : scenario.filters.machineCodes });
    setActiveTab('dashboard');
  };

  const handleDeleteScenario = (id: string) => {
    const updated = scenarios.filter(s => s.id !== id);
    setScenarios(updated);
    localStorage.setItem('maintlytics_scenarios', JSON.stringify(updated));
  };

  const handleSaveScenario = (name: string) => {
    const newScenario: SavedScenario = {
      id: crypto.randomUUID(),
      name,
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };
    const updated = [newScenario, ...scenarios];
    setScenarios(updated);
    localStorage.setItem('maintlytics_scenarios', JSON.stringify(updated));
  };

  const filteredData = useMemo(() => {
    return data.filter(os => {
      const matchMachine = filters.machineCodes.length === 0 || filters.machineCodes.includes(os.COD_EQP);
      const matchStatus = filters.status === 'all' || os.SITUACAO === filters.status;
      const date = new Date(os.DT_INCLUSAO);
      if (isNaN(date.getTime())) return matchMachine && matchStatus && filters.period === 'all';
      const periodStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const matchPeriod = filters.period === 'all' || periodStr === filters.period;
      return matchMachine && matchStatus && matchPeriod;
    });
  }, [data, filters]);

  const isDark = preferences.theme === 'dark';
  const isCompact = preferences.density === 'compact';

  return (
    <div className={`flex min-h-screen font-sans transition-all duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        data={data}
        onFileUpload={handleFileUpload}
        themeMode={preferences.theme}
        role={preferences.role}
        scenarios={scenarios}
        onApplyScenario={handleApplyScenario}
        onDeleteScenario={handleDeleteScenario}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className={`${isCompact ? 'h-12' : 'h-16'} border-b flex items-center justify-between px-8 shrink-0 shadow-sm z-20 transition-all duration-300 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-[#72a024] h-6 w-6" />
            <h1 className={`${isCompact ? 'text-lg' : 'text-xl'} font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>COLEPACK PCM</h1>
            <span className={`h-6 w-px mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></span>
            <div className="flex items-center gap-2">
              <p className={`hidden md:block text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeTab === 'dashboard' ? 'Relatório de O.Ss' : 'Gerador de Documentos'}
              </p>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isDark ? 'bg-slate-800 text-[#72a024]' : 'bg-[#72a024]/10 text-[#72a024]'}`}>
                {preferences.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {data.length > 0 && (
               <div className={`flex items-center px-3 py-1 rounded-lg text-[10px] font-black border uppercase transition-colors ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                <Database className="h-3 w-3 mr-2 text-[#72a024]" />
                {data.length} OS Carregadas
               </div>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
              aria-label="Configurações"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-2 md:p-4' : 'p-4 md:p-8'} scroll-smooth`}>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-xl mx-auto">
              <div className={`${isDark ? 'bg-slate-900 ring-slate-800/50' : 'bg-[#72a024]/10 ring-[#72a024]/5'} p-8 rounded-full mb-8 ring-8 transition-colors`}>
                <FileSpreadsheet className={`${isDark ? 'text-[#72a024]' : 'text-[#72a024]'} h-16 w-16`} />
              </div>
              <h2 className={`text-3xl font-black mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Gestão Inteligente de PCM</h2>
              <p className={`text-lg mb-8 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Importe ordens de serviço para gerar dashboards dinâmicos, indicadores de performance (KPIs) e relatórios automatizados de manutenção industrial.
              </p>
              <label className={`cursor-pointer px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl ${isDark ? 'bg-[#72a024] hover:bg-[#72a024]/80 text-white shadow-[#72a024]/20' : 'bg-slate-900 hover:bg-[#72a024] text-white shadow-slate-200'}`}>
                <Upload className="h-5 w-5" />
                Importar Dados (Excel)
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === 'dashboard' ? (
                <Dashboard 
                  data={filteredData} 
                  fullData={data} 
                  filters={filters} 
                  setFilters={setFilters} 
                  themeMode={preferences.theme}
                  density={preferences.density}
                  goals={preferences.goals}
                  onLogoUpload={() => {}} // No logo upload needed anymore
                  scenarios={scenarios}
                  onSaveScenario={handleSaveScenario}
                  onDeleteScenario={handleDeleteScenario}
                />
              ) : (
                <ReportGenerator 
                  data={filteredData} 
                  filters={filters} 
                  themeMode={preferences.theme} 
                  density={preferences.density}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-[2.5rem] shadow-2xl border transition-colors duration-300 overflow-hidden animate-in zoom-in-95 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-8 py-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-[#72a024]" />
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>Painel de Configurações</h3>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-4 text-slate-500">Interface & Tema</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPreferences({...preferences, theme: 'light'})} className={`p-3 rounded-xl border-2 flex items-center gap-2 font-bold text-xs transition-all ${preferences.theme === 'light' ? 'border-[#72a024] bg-[#72a024]/10' : 'border-transparent bg-slate-100'}`}>
                      <Sun className="h-4 w-4" /> Claro
                    </button>
                    <button onClick={() => setPreferences({...preferences, theme: 'dark'})} className={`p-3 rounded-xl border-2 flex items-center gap-2 font-bold text-xs transition-all ${preferences.theme === 'dark' ? 'border-[#72a024] bg-slate-800' : 'border-transparent bg-slate-800'}`}>
                      <Moon className="h-4 w-4" /> Escuro
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => setPreferences({...preferences, density: 'comfortable'})} className={`p-3 rounded-xl border-2 font-bold text-xs transition-all ${preferences.density === 'comfortable' ? 'border-[#72a024] bg-[#72a024]/10' : 'border-transparent bg-slate-100'}`}>Confortável</button>
                    <button onClick={() => setPreferences({...preferences, density: 'compact'})} className={`p-3 rounded-xl border-2 font-bold text-xs transition-all ${preferences.density === 'compact' ? 'border-[#72a024] bg-[#72a024]/10' : 'border-transparent bg-slate-100'}`}>Compacto</button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-4 text-slate-500">Perfil de Acesso</label>
                  <div className="space-y-2">
                    {(['admin', 'editor', 'viewer'] as UserRole[]).map(r => (
                      <button key={r} onClick={() => setPreferences({...preferences, role: r})} className={`w-full p-3 rounded-xl border-2 flex items-center justify-between font-bold text-xs transition-all ${preferences.role === r ? 'border-[#72a024] bg-[#72a024]/10' : 'border-transparent bg-slate-100/50'}`}>
                        <div className="flex items-center gap-2">
                          {r === 'admin' ? <Shield className="h-4 w-4 text-red-500" /> : r === 'editor' ? <Database className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-slate-500" />}
                          {r.toUpperCase()}
                        </div>
                        {preferences.role === r && <Check className="h-4 w-4 text-[#72a024]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-4 text-slate-500">Metas de Indicadores</label>
                  <div className="space-y-4">
                    <GoalInput label="MTTR Máximo (min)" value={preferences.goals.mttr} onChange={(v) => setPreferences({...preferences, goals: {...preferences.goals, mttr: v}})} isDark={isDark} />
                    <GoalInput label="MTBF Mínimo (h)" value={preferences.goals.mtbf} onChange={(v) => setPreferences({...preferences, goals: {...preferences.goals, mtbf: v}})} isDark={isDark} />
                    <GoalInput label="Disponibilidade (%)" value={preferences.goals.availability} onChange={(v) => setPreferences({...preferences, goals: {...preferences.goals, availability: v}})} isDark={isDark} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-4 text-slate-500">Log de Importações</label>
                  <div className={`rounded-xl p-3 border space-y-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    {importHistory.length > 0 ? importHistory.map(h => (
                      <div key={h.id} className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-500 truncate max-w-[120px]">{h.fileName}</span>
                        <span className="font-black text-[#72a024]">{h.count} OS</span>
                      </div>
                    )) : <p className="text-[10px] text-center text-slate-400 py-2 italic">Nenhum histórico</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className={`px-8 py-6 flex justify-end transition-colors ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="bg-[#72a024] hover:bg-[#72a024]/80 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#72a024]/20 transition-all active:scale-95"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GoalInput: React.FC<{label: string, value: number, onChange: (v: number) => void, isDark: boolean}> = ({label, value, onChange, isDark}) => (
  <div className="space-y-1.5">
    <p className="text-[10px] font-bold text-slate-400">{label}</p>
    <input 
      type="number" 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full px-4 py-2 rounded-xl text-xs font-black outline-none border-2 transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-[#72a024] text-white' : 'bg-white border-slate-200 focus:border-[#72a024]'}`} 
    />
  </div>
);

export default App;