import React, { useState, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ServiceOrder, DashboardFilters, ThemeMode, DensityMode } from '../types';
import { 
  FileText, 
  Search,
  Table,
  FileSpreadsheet,
  AlertCircle,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Info,
  Smartphone,
  Monitor,
  X,
  Loader2,
  FileDown,
  Edit3
} from 'lucide-react';

interface ReportGeneratorProps {
  data: ServiceOrder[];
  filters: DashboardFilters;
  themeMode?: ThemeMode;
  density?: DensityMode;
}

type SortField = 'DT_ABERTURA' | 'SITUACAO' | 'TP_REALIZADO';
type SortOrder = 'asc' | 'desc';

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ data, filters, themeMode = 'light', density = 'comfortable' }) => {
  const [reportTitle, setReportTitle] = useState('Dossiê Técnico de Manutenção');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMachines, setExpandedMachines] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('DT_ABERTURA');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<'p' | 'l'>('p');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const isDark = themeMode === 'dark';
  const isCompact = density === 'comfortable';

  const machinesWithOS = useMemo(() => {
    const map = new Map<string, { code: string, name: string, osList: ServiceOrder[] }>();
    data.forEach(os => {
      if (!map.has(os.COD_EQP)) map.set(os.COD_EQP, { code: os.COD_EQP, name: os.DESC_EQP, osList: [] });
      map.get(os.COD_EQP)!.osList.push(os);
    });

    return Array.from(map.values())
      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.code.includes(searchTerm))
      .map(m => {
        const sortedList = [...m.osList].sort((a, b) => {
          let valA: any = a[sortField];
          let valB: any = b[sortField];
          if (sortField === 'DT_ABERTURA') { valA = new Date(a.DT_ABERTURA).getTime(); valB = new Date(b.DT_ABERTURA).getTime(); }
          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
        return { ...m, osList: sortedList };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, searchTerm, sortField, sortOrder]);

  const toggleExpand = (code: string) => {
    const next = new Set(expandedMachines);
    if (next.has(code)) next.delete(code); else next.add(code);
    setExpandedMachines(next);
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDark ? '#020617' : '#f8fafc',
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      doc.setFillColor(isDark ? 2 : 248, isDark ? 6 : 250, isDark ? 23 : 252);
      doc.rect(0, 0, pdfWidth, pdfHeight, 'F');
      doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight, undefined, 'FAST');

      doc.save(`${reportTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      setShowPdfOptions(false);
    } catch (err: any) {
      alert("Erro ao exportar dossiê com fidelidade.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = () => {
    const headers = ['COD_OS', 'COD_EQP', 'DESC_EQP', 'DEFEITO', 'SITUAÇÃO', 'TEMPO_MIN', 'DATA_ABERTURA', 'OBSERVACAO'];
    const rows = data.map(os => [os.COD_OS, os.COD_EQP, os.DESC_EQP, os.DESC_DFT, os.SITUACAO, os.TP_REALIZADO, os.DT_ABERTURA, (os.OBSERVACAO || '-').replace(/,/g, ';').replace(/\n/g, ' ')]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Dossie_Tecnico_COLEPACK_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className={`p-8 md:p-10 rounded-[2.5rem] border-2 shadow-sm transition-colors ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-[#72a024]'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6" ref={reportRef}>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-[#72a024]/10' : 'bg-[#72a024]/5'}`}>
              <FileSearch className="h-8 w-8 text-[#72a024]" />
            </div>
            <div>
              <div className="relative group/title inline-block">
                <input 
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className={`text-3xl font-black bg-transparent border-none outline-none focus:ring-2 focus:ring-[#72a024]/20 rounded-lg pr-8 w-full max-w-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}
                />
                <Edit3 className={`absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover/title:opacity-30 transition-opacity ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <p className="font-bold text-sm text-slate-500 mt-1">Dossiê completo de ordens de serviço filtradas.</p>
            </div>
          </div>
          <div className="flex gap-3" data-html2canvas-ignore="true">
            <button onClick={exportCSV} disabled={data.length === 0} className={`px-6 py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center gap-2 ${data.length === 0 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:bg-slate-800 hover:text-white'} ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}><FileSpreadsheet className="h-4 w-4" /> CSV</button>
            <button onClick={() => setShowPdfOptions(true)} disabled={data.length === 0} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-xl flex items-center gap-2 ${data.length === 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#72a024] hover:bg-[#72a024]/80 active:scale-95'} text-white shadow-[#72a024]/20`}><FileText className="h-4 w-4" /> Exportar Fiel</button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4" data-html2canvas-ignore="true">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" placeholder="Pesquisar por equipamento ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full pl-16 pr-6 py-4 border-2 rounded-2xl outline-none text-sm font-bold transition-all ${isDark ? 'bg-slate-950 border-slate-700 text-slate-200 focus:border-[#72a024]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#72a024]'}`} />
            </div>
          </div>

          {machinesWithOS.length > 0 ? (
            <div className="space-y-4">
              {machinesWithOS.map((m) => {
                const isExpanded = expandedMachines.has(m.code);
                return (
                  <div key={m.code} className={`rounded-[2rem] border-2 overflow-hidden transition-all ${isDark ? 'bg-slate-950/50 border-slate-800 text-white' : 'bg-slate-50/50 border-slate-200 text-slate-900'}`}>
                    <button onClick={() => toggleExpand(m.code)} className={`w-full flex items-center justify-between p-6 transition-colors hover:bg-[#72a024]/5 ${isExpanded ? 'border-b-2 dark:border-slate-800' : ''}`}>
                      <div className="flex items-center gap-4 text-left">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-[#72a024] text-white' : 'bg-white dark:bg-slate-800 border-2 dark:border-slate-700 text-[#72a024]'}`}><Table className="h-5 w-5" /></div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight leading-tight">{m.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono font-bold">{m.code} • {m.osList.length} registros</p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                    </button>
                    {isExpanded && (
                      <div className="overflow-x-auto p-2">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className={`text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 dark:border-slate-800`}><th className="px-4 py-3">Cód. OS</th><th className="px-4 py-3">Abertura</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Defeito</th><th className="px-4 py-3 text-center">Tempo</th><th className="px-4 py-3">Observação</th></tr>
                          </thead>
                          <tbody className="divide-y dark:divide-slate-800">
                            {m.osList.map((os) => (
                              <tr key={os.COD_OS} className="hover:bg-white dark:hover:bg-slate-900 transition-colors">
                                <td className="px-4 py-3 font-bold text-[#72a024]">{os.COD_OS}</td>
                                <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">{os.DT_ABERTURA}</td>
                                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${os.SITUACAO.toLowerCase().includes('fechada') || os.SITUACAO.toLowerCase().includes('finalizada') ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>{os.SITUACAO}</span></td>
                                <td className="px-4 py-3 font-bold truncate max-w-[150px]">{os.DESC_DFT}</td>
                                <td className="px-4 py-3 text-center font-black">{os.TP_REALIZADO}m</td>
                                <td className="px-4 py-3 italic text-slate-500 text-[10px]">{os.OBSERVACAO || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`p-20 border-2 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center text-center ${isDark ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50'}`}>
              <AlertCircle className="h-16 w-16 text-slate-300 mb-6" /><h3 className="text-2xl font-black text-slate-400">Nenhum registro encontrado</h3>
            </div>
          )}
        </div>
      </div>

      {showPdfOptions && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-md rounded-[2.5rem] border-4 p-8 animate-in zoom-in-95 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black">Configuração de Exportação</h3>
              <button onClick={() => setShowPdfOptions(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-2 text-slate-500">Título do Relatório</label>
                <input 
                  type="text" 
                  value={reportTitle} 
                  onChange={(e) => setReportTitle(e.target.value)} 
                  className={`w-full p-4 rounded-xl border-2 outline-none text-sm font-bold transition-all ${isDark ? 'bg-slate-950 border-slate-800 focus:border-[#72a024] text-white' : 'bg-slate-50 border-slate-200 focus:border-[#72a024] text-slate-900'}`} 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest block mb-3 text-slate-500">Orientação da Página</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPdfOrientation('p')} className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-black text-xs uppercase ${pdfOrientation === 'p' ? 'border-[#72a024] bg-[#72a024]/10 text-[#72a024]' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}><Smartphone className="h-4 w-4" /> Retrato</button>
                  <button onClick={() => setPdfOrientation('l')} className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-black text-xs uppercase ${pdfOrientation === 'l' ? 'border-[#72a024] bg-[#72a024]/10 text-[#72a024]' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}><Monitor className="h-4 w-4" /> Paisagem</button>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={() => setShowPdfOptions(false)} className="flex-1 py-4 font-black uppercase text-xs text-slate-500">Cancelar</button>
                <button onClick={generatePDF} disabled={isExporting} className="flex-[2] bg-[#72a024] text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Confirmar Captura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`p-8 rounded-[2rem] border-2 flex items-center gap-6 ${isDark ? 'bg-[#72a024]/5 border-slate-800' : 'bg-[#72a024]/5 border-[#72a024]/20'}`}>
        <div className="w-12 h-12 rounded-full bg-[#72a024] flex items-center justify-center text-white shrink-0"><Info className="h-6 w-6" /></div>
        <div className="space-y-1">
          <h4 className="text-sm font-black uppercase tracking-tight">Dossiê Técnico Consolidado</h4>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">As ordens de serviço são agrupadas por ativo para facilitar a auditoria técnica e o histórico de intervenções.</p>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;