
import React, { useMemo, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LabelList
} from 'recharts';
import { ServiceOrder, DashboardFilters, ThemeMode, DensityMode, KpiGoals, SavedScenario } from '../types';
import { 
  Activity, Timer, ShieldCheck, 
  ChevronDown, Check, X, Search, Info, ArrowUpRight, ArrowDownRight, TrendingUp, Monitor, Loader2, FileDown, Printer, Clock,
  Sun, Moon, List, RefreshCw, Edit3, Eye, FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Moving constants and sub-components to the top to avoid "used before declaration" errors
const COLORS = ['#72a024', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const ShiftCard: React.FC<{label: string, average: number, count: number, icon: React.ReactNode, isDark: boolean, highlight?: boolean, textColors: any}> = ({ label, average, count, icon, isDark, highlight, textColors }) => (
  <div className={`p-6 rounded-3xl border-2 flex flex-col justify-between transition-all ${highlight ? 'ring-2 ring-[#72a024]/30 shadow-md' : ''} ${isDark ? (highlight ? 'bg-[#72a024]/10 border-[#72a024]' : 'bg-slate-950 border-slate-800') : (highlight ? 'bg-[#72a024]/5 border-[#72a024]' : 'bg-slate-50 border-slate-100')} hover:border-[#72a024]`}>
    <div className="flex items-center justify-between mb-2">
      <span className={`text-[10px] font-black uppercase tracking-widest ${textColors.auxiliary}`}>{label}</span>
      <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white shadow-sm'}`}>{icon}</div>
    </div>
    <div>
      <h4 className={`text-3xl font-black ${textColors.kpi}`}>{average}</h4>
      <p className="text-[10px] font-bold text-[#72a024] uppercase tracking-wide">Média OS/Dia</p>
    </div>
    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
       <p className={`text-[9px] font-black uppercase ${textColors.auxiliary}`}>Acumulado: {count} O.S</p>
    </div>
  </div>
);

const KpiCard: React.FC<{title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: string; isDark: boolean; trend: 'good' | 'bad'; textColors: any; tooltipTitle?: string; tooltipText?: string}> = ({ title, value, subtitle, icon, color, isDark, trend, textColors, tooltipTitle, tooltipText }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`p-6 rounded-[2rem] border-[1px] shadow-sm relative group hover:shadow-md transition-all ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#72a024]'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color} transition-transform group-hover:scale-110`}>{icon}</div>
        <div className="flex items-center gap-1.5">
          {tooltipText && (
            <div className="relative">
              <button 
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {showTooltip && (
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none ${isDark ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
                  <p className="text-[10px] font-black uppercase mb-1">{tooltipTitle || title}</p>
                  <p className="text-[9px] font-medium leading-relaxed opacity-80">{tooltipText}</p>
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent ${isDark ? 'border-t-white' : 'border-t-slate-900'}`}></div>
                </div>
              )}
            </div>
          )}
          {trend === 'good' ? <ArrowDownRight className="text-green-500 h-4 w-4" /> : <ArrowUpRight className="text-red-500 h-4 w-4" />}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className={`text-[10px] font-black uppercase tracking-widest ${textColors.auxiliary}`}>{title}</p>
        <h4 className={`text-2xl font-black ${textColors.kpi}`}>{value}</h4>
        <p className={`text-[9px] font-bold ${trend === 'good' ? 'text-green-500' : 'text-red-500'}`}>{subtitle}</p>
      </div>
    </div>
  );
};

interface DashboardProps {
  data: ServiceOrder[];
  fullData: ServiceOrder[];
  filters: DashboardFilters;
  setFilters: (f: DashboardFilters) => void;
  themeMode?: ThemeMode;
  density?: DensityMode;
  goals: KpiGoals;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  scenarios: SavedScenario[];
  onSaveScenario: (name: string) => void;
  onDeleteScenario: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  data, 
  fullData, 
  filters, 
  setFilters, 
  themeMode = 'light', 
  density = 'comfortable', 
  goals, 
  onLogoUpload,
  scenarios,
  onSaveScenario,
  onDeleteScenario
}) => {
  const [reportTitle, setReportTitle] = useState('Painel Gerencial PCM');
  const [isMachineMenuOpen, setIsMachineMenuOpen] = useState(false);
  const [machineSearchTerm, setMachineSearchTerm] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  const [pdfComment, setPdfComment] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const dashboardRef = useRef<HTMLDivElement>(null);
  const previewPagesRef = useRef<HTMLDivElement>(null);
  
  const isDark = themeMode === 'dark';
  const isCompact = density === 'compact';

  const textColors = {
    title: isDark ? 'text-white' : 'text-slate-900',
    subtitle: isDark ? 'text-slate-300' : 'text-slate-600',
    auxiliary: isDark ? 'text-slate-400' : 'text-slate-500',
    kpi: isDark ? 'text-white' : 'text-slate-900',
  };

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const closedOS = data.filter(os => os.DT_FECHAMENTO);
    const totalOS = data.length;
    const totalDowntime = data.reduce((acc, curr) => acc + curr.TP_REALIZADO, 0);
    const mttr = closedOS.length > 0 ? totalDowntime / closedOS.length : 0;
    const machines = new Set(data.map(os => os.COD_EQP));
    let totalMTBF = 0;
    let machinesWithMultipleOS = 0;
    machines.forEach(m => {
      const machineOS = data.filter(os => os.COD_EQP === m).sort((a, b) => new Date(a.DT_ABERTURA).getTime() - new Date(b.DT_ABERTURA).getTime());
      if (machineOS.length > 1) {
        let diffs = 0;
        for (let i = 1; i < machineOS.length; i++) {
          diffs += (new Date(machineOS[i].DT_ABERTURA).getTime() - new Date(machineOS[i-1].DT_ABERTURA).getTime());
        }
        totalMTBF += (diffs / (machineOS.length - 1)) / (1000 * 60 * 60);
        machinesWithMultipleOS++;
      }
    });
    const mtbf = machinesWithMultipleOS > 0 ? totalMTBF / machinesWithMultipleOS : 0;
    const availability = (mtbf + mttr/60) > 0 ? (mtbf / (mtbf + mttr/60)) * 100 : 0;
    return { 
      totalOS, 
      totalDowntime, 
      mttr: Number(mttr.toFixed(1)), 
      mtbf: Number(mtbf.toFixed(1)), 
      availability: Number(availability.toFixed(1)),
      osTrend: totalOS > (fullData.length / 4) ? 'bad' : 'good'
    };
  }, [data, fullData]);

  const technicalShiftData = useMemo(() => {
    if (data.length === 0) return null;
    const days = new Set(data.map(os => {
        const d = new Date(os.DT_ABERTURA);
        return isNaN(d.getTime()) ? null : os.DT_ABERTURA;
    }).filter(Boolean));
    const totalDays = days.size || 1;
    const p1Count = data.filter(os => {
        const hour = parseInt((os.HR_ABERTURA || "00:00").split(':')[0], 10);
        return hour >= 8 && hour < 18;
    }).length;
    const p2Count = data.filter(os => {
        const hour = parseInt((os.HR_ABERTURA || "00:00").split(':')[0], 10);
        return hour >= 18 && hour < 22;
    }).length;
    const p3Count = data.filter(os => {
        const hour = parseInt((os.HR_ABERTURA || "00:00").split(':')[0], 10);
        return hour >= 22 || hour < 8;
    }).length;
    return {
        totalDays, totalOS: data.length,
        averages: {
            p1: Number((p1Count / totalDays).toFixed(2)),
            p2: Number((p2Count / totalDays).toFixed(2)),
            p3: Number((p3Count / totalDays).toFixed(2)),
            fullDay: Number((data.length / totalDays).toFixed(2))
        },
        rows: [
            { name: '08:00 às 18:00', total: p1Count, avg: Number((p1Count / totalDays).toFixed(2)), icon: <Sun className="h-3 w-3 text-amber-500" /> },
            { name: '18:00 às 22:00', total: p2Count, avg: Number((p2Count / totalDays).toFixed(2)), icon: <Monitor className="h-3 w-3 text-blue-400" /> },
            { name: '22:00 às 08:00', total: p3Count, avg: Number((p3Count / totalDays).toFixed(2)), icon: <Moon className="h-3 w-3 text-indigo-400" /> }
        ]
    };
  }, [data]);

  const machineDowntimeData = useMemo(() => {
    const map: Record<string, { name: string, totalTime: number }> = {};
    data.forEach(os => {
      if (!map[os.COD_EQP]) map[os.COD_EQP] = { name: os.DESC_EQP.split(' ')[0], totalTime: 0 };
      map[os.COD_EQP].totalTime += os.TP_REALIZADO;
    });
    return Object.entries(map)
      .map(([id, info]) => ({ id, ...info, label: info.totalTime >= 120 ? `${(info.totalTime / 60).toFixed(1)} h` : `${info.totalTime} min` }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 15);
  }, [data]);

  const defectData = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(os => {
      const dft = os.DESC_DFT || 'NÃO INFORMADO';
      map[dft] = (map[dft] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [data]);

  const machinesWithOS = useMemo(() => {
    const map = new Map<string, { code: string, name: string, osList: ServiceOrder[] }>();
    data.forEach(os => {
      if (!map.has(os.COD_EQP)) map.set(os.COD_EQP, { code: os.COD_EQP, name: os.DESC_EQP, osList: [] });
      map.get(os.COD_EQP)!.osList.push(os);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const handleExportPDF = async () => {
    if (!dashboardRef.current || !previewPagesRef.current) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pages = previewPagesRef.current.querySelectorAll('.a4-page');
      
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) doc.addPage();
        
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: isDark ? '#020617' : '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      }

      doc.save(`${reportTitle.replace(/\s+/g, '_')}_Consolidado_${Date.now()}.pdf`);
      setShowPreview(false);
    } catch (err) {
      console.error(err);
      alert("Erro crítico ao compilar PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleMachine = (code: string) => {
    const next = filters.machineCodes.includes(code)
      ? filters.machineCodes.filter(c => c !== code)
      : [...filters.machineCodes, code];
    setFilters({ ...filters, machineCodes: next });
  };

  const uniqueMachines = useMemo(() => {
    const map = new Map<string, string>();
    fullData.forEach(os => { if (!map.has(os.COD_EQP)) map.set(os.COD_EQP, os.DESC_EQP); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [fullData]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    fullData.forEach(os => set.add(os.SITUACAO));
    return Array.from(set).sort();
  }, [fullData]);

  const uniquePeriods = useMemo(() => {
    const set = new Set<string>();
    fullData.forEach(os => {
      const date = new Date(os.DT_INCLUSAO);
      if (!isNaN(date.getTime())) set.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [fullData]);

  const chartTooltipStyle = {
    contentStyle: { 
      borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)', 
      backgroundColor: isDark ? '#ffffff' : '#0f172a', color: isDark ? '#0f172a' : '#ffffff',
      padding: '16px', fontSize: '12px', fontWeight: '700', maxWidth: '280px'
    }
  };

  return (
    <div className={`animate-in fade-in duration-700 ${isCompact ? 'space-y-4' : 'space-y-6'}`}>
      
      {/* --- MODAL DE PRÉ-VISUALIZAÇÃO --- */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-7xl flex items-center justify-between mb-6 px-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#72a024] rounded-2xl shadow-lg shadow-[#72a024]/20">
                <Eye className="text-white h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white">Relatório PCM Consolidado</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">{data.length} OS • {machinesWithOS.length} Ativos Filtrados</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPreview(false)} className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase transition-all">Fechar</button>
              <button onClick={handleExportPDF} disabled={isExporting} className="px-8 py-3 rounded-2xl bg-[#72a024] hover:bg-[#72a024]/80 text-white font-black text-xs uppercase shadow-xl transition-all disabled:opacity-50 flex items-center gap-2">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                {isExporting ? 'Processando Relatório...' : 'Gerar PDF Oficial'}
              </button>
            </div>
          </div>

          <div ref={previewPagesRef} className="w-full max-w-7xl flex-1 overflow-y-auto custom-scrollbar p-10 bg-black/30 rounded-[3rem] border border-white/5 flex flex-col items-center gap-16">
            
            {/* Página 1: Dashboard Visual Completo */}
            <div className={`a4-page w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl relative transition-colors overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
               <div className="border-b-4 border-[#72a024] pb-6 mb-8 flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter">{reportTitle}</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#72a024] mt-1">Análise Visual de Performance PCM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase text-slate-500">Documento Emitido em</p>
                    <p className="text-sm font-black">{new Date().toLocaleDateString()}</p>
                  </div>
               </div>

               {/* KPIs */}
               <div className="grid grid-cols-4 gap-4 mb-8">
                  {stats && (
                    <>
                      <div className="p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-[#72a024]/5">
                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1">MTTR</p>
                        <p className="text-2xl font-black">{stats.mttr}m</p>
                      </div>
                      <div className="p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1">MTBF</p>
                        <p className="text-2xl font-black">{stats.mtbf}h</p>
                      </div>
                      <div className="p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1">DISP.</p>
                        <p className="text-2xl font-black">{stats.availability}%</p>
                      </div>
                      <div className="p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-800">
                        <p className="text-[8px] font-black uppercase text-slate-500 mb-1">VOLUME</p>
                        <p className="text-2xl font-black">{stats.totalOS}</p>
                      </div>
                    </>
                  )}
               </div>

               {/* Turnos */}
               {technicalShiftData && (
                 <>
                   <div className="grid grid-cols-2 gap-6 mb-4">
                     <div className="p-6 rounded-[2rem] border-2 border-[#72a024]/20 bg-[#72a024]/5">
                       <h4 className="text-[10px] font-black uppercase mb-4 tracking-widest">Distribuição por Turno</h4>
                       <table className="w-full text-[10px]">
                         <thead className="border-b border-slate-200">
                           <tr><th className="text-left py-2">Turno</th><th className="text-center py-2">O.S</th><th className="text-right py-2">Média</th></tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {technicalShiftData.rows.map(r => (
                             <tr key={r.name}><td className="py-2 font-bold">{r.name}</td><td className="py-2 text-center">{r.total}</td><td className="py-2 text-right font-black text-[#72a024]">{r.avg}</td></tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                     <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={technicalShiftData.rows}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={8} />
                            <YAxis fontSize={8} />
                            <Bar dataKey="avg" fill="#72a024" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                   
                   {/* Relatório Textual no PDF */}
                   <div className="mb-8 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                      <p className="text-[9px] font-black uppercase mb-3 text-slate-400 tracking-widest">📊 Relatório descritivo por período</p>
                      <div className="space-y-1.5">
                        {technicalShiftData.rows.map(row => (
                          <p key={row.name} className="text-[10px] font-medium leading-tight">
                            “No período de {row.name}, foram geradas <span className="font-bold text-[#72a024]">{row.total}</span> O.Ss.”
                          </p>
                        ))}
                      </div>
                   </div>
                 </>
               )}

               {/* Gráficos Principais */}
               <div className="space-y-6">
                  <div className="p-6 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 h-[220px]">
                    <p className="text-[9px] font-black uppercase mb-4 tracking-widest text-slate-500">Indisponibilidade por Ativo (Top 10)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={machineDowntimeData.slice(0, 10)}>
                        <XAxis dataKey="name" fontSize={7} interval={0} />
                        <YAxis fontSize={7} />
                        <Bar dataKey="totalTime" radius={[4, 4, 0, 0]}>
                          {machineDowntimeData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-6 items-center">
                    <div className="h-[180px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={defectData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                             {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="space-y-1">
                      {defectData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-[8px]">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div><span className="font-bold uppercase truncate max-w-[120px]">{d.name}</span></div>
                          <span className="font-black">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               {pdfComment && (
                 <div className="mt-8 p-4 rounded-2xl bg-[#72a024]/5 border-l-4 border-[#72a024]">
                    <p className="text-[8px] font-black uppercase text-[#72a024] mb-1">Observações Técnicas</p>
                    <p className="text-[10px] leading-relaxed italic">{pdfComment}</p>
                 </div>
               )}

               <div className="absolute bottom-10 left-[15mm] right-[15mm] flex justify-between items-center text-[7px] font-black uppercase text-slate-300">
                  <span>COLEPACK Industrial PCM v2.5</span>
                  <span>Pág. 01 / Visual Overview</span>
               </div>
            </div>

            {/* Páginas seguintes: Dossiê Técnico Filtrado */}
            {machinesWithOS.map((machine, idx) => (
              <div key={machine.code} className={`a4-page w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl relative transition-colors ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
                <div className="bg-[#72a024] p-6 rounded-3xl text-white flex justify-between items-center mb-8">
                   <div className="text-left">
                     <h2 className="text-xl font-black">DETALHAMENTO: {machine.name}</h2>
                     <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">TAG: {machine.code} • Histórico Operacional</p>
                   </div>
                   <div className="text-right">
                      <p className="text-2xl font-black leading-none">{machine.osList.length}</p>
                      <p className="text-[8px] font-black uppercase opacity-60">O.S</p>
                   </div>
                </div>

                <div className="rounded-3xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-[8px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 font-black uppercase text-slate-500">ID</th>
                        <th className="px-4 py-3 font-black uppercase text-slate-500">Defeito</th>
                        <th className="px-4 py-3 font-black uppercase text-slate-500">Situação</th>
                        <th className="px-4 py-3 font-black uppercase text-slate-500 text-center">Tempo</th>
                        <th className="px-4 py-3 font-black uppercase text-slate-500">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {machine.osList.map(os => (
                        <tr key={os.COD_OS}>
                          <td className="px-4 py-3 font-black text-[#72a024]">{os.COD_OS}</td>
                          <td className="px-4 py-3 font-bold truncate max-w-[150px]">{os.DESC_DFT}</td>
                          <td className="px-4 py-3 font-medium uppercase opacity-60">{os.SITUACAO}</td>
                          <td className="px-4 py-3 font-black text-center">{os.TP_REALIZADO}m</td>
                          <td className="px-4 py-3 text-slate-400">{os.DT_ABERTURA}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="absolute bottom-10 left-[15mm] right-[15mm] flex justify-between items-center text-[7px] font-black uppercase text-slate-300">
                  <span>Documento gerado para Auditoria Técnica em {new Date().toLocaleString()}</span>
                  <span>Pág. {String(idx + 2).padStart(2, '0')} / Dossiê Ativo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- DASHBOARD PRINCIPAL DA UI --- */}
      <div ref={dashboardRef} className={`space-y-8 p-4 rounded-3xl transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-6">
            <div className="relative group/title">
              <input 
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-black bg-transparent border-none outline-none focus:ring-2 focus:ring-[#72a024]/20 rounded-lg pr-8 transition-all w-full max-w-xl ${textColors.title}`}
              />
              <Edit3 className={`absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover/title:opacity-30 transition-opacity ${textColors.auxiliary}`} />
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-[#72a024] animate-pulse"></span>
                <p className={`font-medium text-xs ${textColors.auxiliary}`}>Monitoramento de Ativos Industrial</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore="true">
            <button 
              onClick={() => setShowPreview(true)} 
              disabled={!data.length} 
              className={`flex items-center gap-2 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 ${isDark ? 'bg-[#72a024] hover:bg-[#72a024]/80' : 'bg-slate-900 hover:bg-[#72a024]'}`}
            >
              <FileDown className="h-4 w-4" /> Pré-visualizar PDF
            </button>
            <div className={`flex flex-wrap items-center gap-2 p-2 rounded-2xl border-2 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#72a024]'}`}>
              <div className="relative">
                <button onClick={() => setIsMachineMenuOpen(!isMachineMenuOpen)} className={`text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 ${textColors.kpi}`}>
                  <span className="truncate max-w-[120px]">{filters.machineCodes.length === 0 ? 'MÁQUINAS: TODAS' : `${filters.machineCodes.length} SELEC.`}</span><ChevronDown className="h-4 w-4" />
                </button>
                {isMachineMenuOpen && (
                  <div className={`absolute top-full left-0 mt-2 w-80 border-2 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in zoom-in-95 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                    <div className="p-3 border-b dark:border-slate-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input type="text" placeholder="Filtrar..." value={machineSearchTerm} onChange={(e) => setMachineSearchTerm(e.target.value)} className={`w-full pl-9 pr-3 py-2 border-2 rounded-lg text-xs outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      {uniqueMachines.filter(m => m[1].toLowerCase().includes(machineSearchTerm.toLowerCase())).map(([code, name]) => (
                        <label key={code} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#72a024]/10 cursor-pointer transition-colors">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${filters.machineCodes.includes(code) ? 'bg-[#72a024] border-[#72a024]' : 'bg-white border-slate-300'}`}>{filters.machineCodes.includes(code) && <Check className="h-3 w-3 text-white" />}</div>
                          <input type="checkbox" className="hidden" checked={filters.machineCodes.includes(code)} onChange={() => toggleMachine(code)} />
                          <div className="truncate"><p className={`text-[10px] font-bold uppercase truncate ${textColors.title}`}>{name}</p><p className={`text-[8px] font-mono ${textColors.auxiliary}`}>{code}</p></div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className={`bg-transparent text-xs font-bold outline-none border-r dark:border-slate-800 px-2 ${textColors.kpi}`}>
                <option value="all">SITUAÇÃO: TODAS</option>
                {uniqueStatuses.map(s => <option key={s} value={s} className="text-black">{s.toUpperCase()}</option>)}
              </select>
              <select value={filters.period} onChange={(e) => setFilters({...filters, period: e.target.value})} className={`bg-transparent text-xs font-bold outline-none px-2 ${textColors.kpi}`}>
                <option value="all">PERÍODO: TODOS</option>
                {uniquePeriods.map(p => <option key={p} value={p} className="text-black">{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
            <KpiCard title="MTTR Médio" value={`${stats.mttr}m`} subtitle={`Meta: <${goals.mttr}m`} icon={<Timer className="text-[#72a024]" />} color={isDark ? 'bg-[#72a024]/10' : 'bg-[#72a024]/5'} isDark={isDark} trend={stats.mttr < goals.mttr ? 'good' : 'bad'} textColors={textColors} tooltipTitle="MTTR (Mean Time To Repair)" tooltipText="Média de tempo gasto no reparo técnico após uma ocorrência de falha." />
            <KpiCard title="MTBF Geral" value={`${stats.mtbf}h`} subtitle={`Meta: >${goals.mtbf}h`} icon={<Activity className="text-blue-600" />} color={isDark ? 'bg-blue-500/10' : 'bg-blue-50'} isDark={isDark} trend={stats.mtbf > goals.mtbf ? 'good' : 'bad'} textColors={textColors} tooltipTitle="MTBF (Mean Time Between Failures)" tooltipText="Tempo médio transcorrido entre falhas. Mede a confiabilidade da planta industrial." />
            <KpiCard title="Disponibilidade" value={`${stats.availability}%`} subtitle={`Alvo: ${goals.availability}%`} icon={<ShieldCheck className="text-green-600" />} color={isDark ? 'bg-green-500/10' : 'bg-green-50'} isDark={isDark} trend={stats.availability >= goals.availability ? 'good' : 'bad'} textColors={textColors} tooltipTitle="Disponibilidade Técnica" tooltipText="Percentual de tempo operacional esperado em relação ao tempo real produtivo." />
            <KpiCard title="Volume de O.S" value={stats.totalOS} subtitle="Período Filtrado" icon={<TrendingUp className="text-red-600" />} color={isDark ? 'bg-red-500/10' : 'bg-red-50'} isDark={isDark} trend={stats.osTrend} textColors={textColors} tooltipTitle="Volume de O.S" tooltipText="Contagem total de Ordens de Serviço processadas sob os critérios de filtro atuais." />
          </div>
        )}

        {technicalShiftData && (
          <div className={`p-8 rounded-[2.5rem] border-2 transition-all mx-4 ${isDark ? 'bg-slate-900 border-slate-700 shadow-lg' : 'bg-white border-[#72a024] shadow-sm'}`}>
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                 <div className="p-3 rounded-2xl bg-[#72a024]/10"><Clock className="text-[#72a024] h-6 w-6" /></div>
                 <div>
                   <h3 className={`text-xl font-black ${textColors.title}`}>Análise de Abertura de O.Ss por Período</h3>
                   <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${textColors.auxiliary}`}>Detalhamento técnico independente por turnos operacionais</p>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <ShiftCard label="Média Geral 24h" average={technicalShiftData.averages.fullDay} count={technicalShiftData.totalOS} icon={<RefreshCw className="h-5 w-5 text-[#72a024]" />} isDark={isDark} highlight textColors={textColors} />
              <ShiftCard label="08:00 às 18:00" average={technicalShiftData.averages.p1} count={technicalShiftData.rows[0].total} icon={<Sun className="h-5 w-5 text-amber-500" />} isDark={isDark} textColors={textColors} />
              <ShiftCard label="18:00 às 22:00" average={technicalShiftData.averages.p2} count={technicalShiftData.rows[1].total} icon={<Monitor className="h-5 w-5 text-blue-400" />} isDark={isDark} textColors={textColors} />
              <ShiftCard label="22:00 às 08:00" average={technicalShiftData.averages.p3} count={technicalShiftData.rows[2].total} icon={<Moon className="h-5 w-5 text-indigo-400" />} isDark={isDark} textColors={textColors} />
            </div>

            {/* Relatório Textual Dinâmico UI */}
            <div className={`mb-10 p-6 rounded-3xl border border-dashed transition-colors ${isDark ? 'bg-[#72a024]/5 border-[#72a024]/30' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-3 w-3 text-[#72a024]" />
                <span className={`text-[10px] font-black uppercase tracking-widest ${textColors.auxiliary}`}>📊 Relatório descritivo por período</span>
              </div>
              <div className="space-y-1">
                {technicalShiftData.rows.map((row) => (
                  <p key={row.name} className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    “No período de <span className="font-bold">{row.name}</span>, foram geradas <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.total}</span> O.Ss.”
                  </p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <List className="h-3 w-3 text-[#72a024]" />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${textColors.auxiliary}`}>Detalhamento Técnico Consolidado</span>
                </div>
                <div className={`rounded-3xl border-2 overflow-hidden ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`text-[9px] font-black uppercase tracking-widest border-b ${isDark ? 'text-slate-500 border-slate-800 bg-slate-900/50' : 'text-slate-400 border-slate-200 bg-white'}`}>
                        <th className="px-6 py-4">Período Operacional</th>
                        <th className="px-6 py-4 text-center">Total O.S</th>
                        <th className="px-6 py-4 text-right">Média/Dia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-transparent">
                      <tr className={`transition-colors font-bold ${isDark ? 'text-white bg-slate-900/30' : 'text-slate-900 bg-[#72a024]/5'}`}>
                        <td className="px-6 py-4 flex items-center gap-3 uppercase text-[10px]"><RefreshCw className="h-3 w-3 text-[#72a024]" /> Geral (24h)</td>
                        <td className="px-6 py-4 text-center font-mono font-bold">{technicalShiftData.totalOS}</td>
                        <td className="px-6 py-4 text-right font-black"><span className="text-[#72a024]">{technicalShiftData.averages.fullDay}</span><span className={`text-[10px] ml-1 font-normal ${textColors.auxiliary}`}>os/d</span></td>
                      </tr>
                      {technicalShiftData.rows.map((row, i) => (
                        <tr key={i} className={`transition-colors hover:bg-[#72a024]/5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <td className="px-6 py-4 font-bold flex items-center gap-3">{row.icon} {row.name}</td>
                          <td className="px-6 py-4 text-center font-mono font-bold">{row.total}</td>
                          <td className="px-6 py-4 text-right font-black">{row.avg}<span className={`text-[10px] ml-1 font-normal ${textColors.auxiliary}`}>os/d</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="h-[300px] w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-[#72a024]" />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${textColors.auxiliary}`}>Tendência Diária por Turno</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={technicalShiftData.rows.map(r => ({ name: r.name, value: r.avg }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="name" fontSize={10} fontWeight="black" stroke={isDark ? '#94a3b8' : '#64748b'} />
                      <YAxis fontSize={10} fontWeight="black" stroke={isDark ? '#94a3b8' : '#64748b'} />
                      <Tooltip {...chartTooltipStyle} cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={50}>
                         {technicalShiftData.rows.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                         <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fontWeight: 'bold', fill: isDark ? '#fff' : '#000' }} />
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">
          <div className={`lg:col-span-2 p-8 rounded-[2rem] border-2 transition-all ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
            <h3 className={`text-xl font-black ${textColors.title}`}>Indisponibilidade por Ativo</h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-8 ${textColors.auxiliary}`}>Tempo Total de Parada Realizada (minutos)</p>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineDowntimeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="name" fontSize={9} fontWeight="bold" angle={-45} textAnchor="end" interval={0} height={70} stroke={isDark ? '#94a3b8' : '#64748b'} />
                  <YAxis fontSize={9} fontWeight="bold" stroke={isDark ? '#94a3b8' : '#64748b'} />
                  <Tooltip {...chartTooltipStyle} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="totalTime" radius={[6, 6, 0, 0]} barSize={40}>
                    {machineDowntimeData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList dataKey="label" position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: isDark ? '#94a3b8' : '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`p-8 rounded-[2rem] border-2 transition-all ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
             <h3 className={`text-xl font-black mb-8 ${textColors.title}`}>Tipologia de Falhas</h3>
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={defectData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value">
                         {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip {...chartTooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
