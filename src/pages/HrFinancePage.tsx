import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AggregatedPivotData, aggregateData } from '../services/aggregationService';
import { Colaborador, ConfiguracoesLegais } from '../types';
import {
  Users, DollarSign, TrendingUp, Briefcase,
  Search, ChevronDown, ChevronUp, Award,
  BarChart2, Info
} from 'lucide-react';
import { getSalarioEfetivo, calcularCustoEmpresa } from '../utils/financialUtils';

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// ── Mini barra de progresso ──────────────────────────────────
const Bar: React.FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
    <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
  </div>
);

// ── Tooltip ──────────────────────────────────────────────────
import { createPortal } from 'react-dom';

const Tooltip: React.FC<{
  text: string;
  title?: string;
  formula?: string;
  interpretation?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right'
}> = ({ text, title, formula, interpretation, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 260;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;

    let top = triggerRect.bottom + 8;
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);

    const tooltipHeight = tooltipRef.current.offsetHeight || 120;
    if (top + tooltipHeight > viewportHeight - margin) {
      top = triggerRect.top - tooltipHeight - 8;
    }

    if (left < margin) {
      left = margin;
    } else if (left + tooltipWidth > viewportWidth - margin) {
      left = viewportWidth - tooltipWidth - margin;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const interval = setInterval(updatePosition, 10);
      window.addEventListener('resize', updatePosition);
      return () => {
        clearInterval(interval);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setIsVisible(true), 150);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  return (
    <div ref={triggerRef} className="inline-flex items-center cursor-help" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: '260px', zIndex: 9999999 }}
          className="pointer-events-none animate-in fade-in slide-in-from-top-1 duration-120"
        >
          <div className="bg-[#0f172a]/98 backdrop-blur-md shadow-2xl rounded-[8px] p-3 text-left border border-white/10 ring-1 ring-black/50">
            {title && (
              <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                <span className="font-bold text-white text-[12px] tracking-tight">{title}</span>
              </div>
            )}
            <div className="space-y-2.5">
              <div className="text-[#e2e8f0] text-[12px] leading-[1.4] font-medium break-words">
                <span className="mr-1.5 text-blue-400">💡</span>{text}
              </div>
              {formula && (
                <div className="bg-white/5 rounded-md p-2 border border-white/5">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">🧮 Fórmula</p>
                  <code className="text-blue-300 text-[11px] font-mono break-all">{formula}</code>
                </div>
              )}
              {interpretation && (
                <div className="text-[10px] text-slate-300 leading-[1.4] italic border-l-2 border-emerald-500/50 pl-2">
                  <span className="mr-1.5 not-italic text-emerald-400">📌</span>{interpretation}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── KPI Card ─────────────────────────────────────────────────
const KpiCard: React.FC<{
  label: string; value: string; sub: string;
  icon: React.ReactNode; gradient: string; barPct?: number; barColor?: string;
}> = ({ label, value, sub, icon, gradient, barPct, barColor }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-3xl font-bold leading-tight">{value}</p>
      <p className="text-xs opacity-70 mt-1">{sub}</p>
      {barPct !== undefined && barColor && <Bar pct={barPct} color={barColor} />}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
const HrFinancePage: React.FC = () => {
  const [aggregatedData, setAggregatedData] = useState<AggregatedPivotData[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [legalSettings, setLegalSettings] = useState<ConfiguracoesLegais | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'pivos' | 'colaboradores'>('pivos');
  const [sortField, setSortField] = useState<'nome' | 'custo'>('custo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Estado do Simulador RH
  const [showSimuladorRH, setShowSimuladorRH] = useState(false);

  // Parâmetros do Simulador RH
  const [simHeadcount, setSimHeadcount] = useState(0);
  const [simEficiencia, setSimEficiencia] = useState(100);
  const [simAbsenteismo, setSimAbsenteismo] = useState(5);
  const [simSalario, setSimSalario] = useState(1621);
  const [simEncargos, setSimEncargos] = useState(55.24);
  const [simHorasUteis, setSimHorasUteis] = useState(8);

  useEffect(() => {
      const fetchData = async () => {
        try {
          const [aggData, colabRes, legalRes] = await Promise.all([
            aggregateData(),
            fetch('/api/colaboradores'),
            fetch('/api/configuracoes-legais')
          ]);

          const safeJson = async (res: Response) => {
            if (!res.ok) return null;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              try {
                return await res.json();
              } catch (e) {
                console.error('Error parsing JSON from', res.url, e);
                return null;
              }
            }
            return null;
          };

          const c = await safeJson(colabRes);
          const l = await safeJson(legalRes);

          setAggregatedData(aggData || []);
          if (c) {
            setColaboradores(c);
            setSimHeadcount(c.length);
          }
          if (l) {
            setLegalSettings(l);
            setSimSalario(l.salario_minimo || 1621);
            const enc = (l.inss_empresa_percentual || 20) + (l.fgts_percentual || 8) + (l.rat_percentual || 2) +
              (l.terceiros_percentual || 5.8) + (l.provisao_ferias_percentual || 11.11) + (l.provisao_13_percentual || 8.33);
            setSimEncargos(enc);
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
    fetchData();
  }, []);

  const config = legalSettings || {
    id: '', salario_minimo: 1621, inss_empresa_percentual: 20,
    fgts_percentual: 8, rat_percentual: 2, terceiros_percentual: 5.8,
    provisao_ferias_percentual: 11.11, provisao_13_percentual: 8.33,
    adicionais_percentual: 0
  };

  // ── Totalizadores Atuais ──
  const totalCustoBase = aggregatedData.reduce((s, d) => s + d.custo_real, 0);
  const totalColaboradoresBase = colaboradores.length;
  const maxCustoBase = Math.max(...aggregatedData.map(d => d.custo_real), 1);
  const custoMedioBase = totalColaboradoresBase > 0 ? totalCustoBase / totalColaboradoresBase : 0;

  // ── Colaboradores filtrados e ordenados ──
  const colabProcessados = useMemo(() => {
    return colaboradores.map(c => ({
      ...c,
      salarioEfetivo: getSalarioEfetivo(c, config),
      custoEmpresa: c.custo_empresa_calculado || calcularCustoEmpresa(c, config),
    }));
  }, [colaboradores, config]);

  const colabFiltrados = useMemo(() => {
    let list = colabProcessados.filter(c =>
      !search || c.nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.cargo?.toLowerCase().includes(search.toLowerCase())
    );
    list.sort((a, b) => {
      const av = sortField === 'custo' ? a.custoEmpresa : (a.nome || '');
      const bv = sortField === 'custo' ? b.custoEmpresa : (b.nome || '');
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [colabProcessados, search, sortField, sortDir]);

  const toggleSort = (f: 'nome' | 'custo') => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const encargosTotalInfo = (
    config.inss_empresa_percentual + config.fgts_percentual +
    config.rat_percentual + config.terceiros_percentual +
    config.provisao_ferias_percentual + config.provisao_13_percentual
  ).toFixed(1);

  // ── Lógica do Simulador RH ──
  // Eficiência base = 100%. Se eficiência cai, precisamos de mais pessoas proporcionais ao que foi agendado? 
  // O headcount reflete headcount planejado, absenteísmo exige cobertura.
  const necessidadeAjustada = simHeadcount * (100 / simEficiencia);
  const custoReposicaoAbsenteismo = necessidadeAjustada * (simAbsenteismo / 100);
  const headcountRealSimulado = necessidadeAjustada + custoReposicaoAbsenteismo;

  // Considerar horas úteis (cada hora a menos de 8h implica um decréscimo de produtividade e aumento de headcount)
  const ajusteHoras = simHorasUteis < 8 ? (8 / simHorasUteis) : 1;
  const headcountFinalSim = headcountRealSimulado * ajusteHoras;

  const custoPorPessoaSim = simSalario * (1 + (simEncargos / 100));
  const simCustoMensal = headcountFinalSim * custoPorPessoaSim;
  const simCustoAnual = simCustoMensal * 12;

  const diffCustoAnual = simCustoAnual - (totalCustoBase * 12);
  const percAumento = totalCustoBase > 0 ? (diffCustoAnual / (totalCustoBase * 12)) * 100 : 0;

  // Ações do simulador
  const applyScenario = (type: string) => {
    if (type === 'conservador') {
      setSimEficiencia(90);
      setSimAbsenteismo(8);
    } else if (type === 'base') {
      setSimHeadcount(totalColaboradoresBase);
      setSimSalario(config.salario_minimo);
      setSimEficiencia(100);
      setSimAbsenteismo(5);
      setSimHorasUteis(8);
    } else if (type === 'expansao') {
      setSimHeadcount(Math.ceil(totalColaboradoresBase * 1.15));
      setSimSalario(config.salario_minimo * 1.05);
    } else if (type === 'reestruturacao') {
      setSimHeadcount(Math.max(1, Math.floor(totalColaboradoresBase * 0.90)));
      setSimEficiencia(95);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-500">Carregando dados financeiros...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-rose-600">Erro: {error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Painel Gerencial</p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Recursos Humanos <span className="text-slate-400">&</span> Financeiro</h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de custos reais e folha de pagamento</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2 text-xs text-slate-500">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            Salário mínimo: <span className="font-bold text-slate-700">{brl(config.salario_minimo)}</span>
            &nbsp;·&nbsp; Encargos: <span className="font-bold text-slate-700">{encargosTotalInfo}%</span>
          </div>
          <button
            onClick={() => setShowSimuladorRH(!showSimuladorRH)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-xl transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${showSimuladorRH ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <BarChart2 className="w-4 h-4" /> Simulação Estratégica RH
          </button>
        </div>
      </div>

      {/* ── Simulador RH Expandido (Accordion) ── */}
      {showSimuladorRH && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 shadow-inner p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" /> Laboratório Interno — Simulação de RH
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">Cenários Rápidos:</span>
              <button onClick={() => applyScenario('base')} className="px-3 py-1 bg-white border border-slate-300 text-slate-600 rounded-md text-xs font-semibold hover:bg-slate-100">Atual (Base)</button>
              <button onClick={() => applyScenario('conservador')} className="px-3 py-1 bg-white border border-rose-200 text-rose-600 rounded-md text-xs font-semibold hover:bg-rose-50">Conservador</button>
              <button onClick={() => applyScenario('expansao')} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-600 rounded-md text-xs font-semibold hover:bg-emerald-50">Expansão (+15%)</button>
              <button onClick={() => applyScenario('reestruturacao')} className="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded-md text-xs font-semibold hover:bg-blue-50">Corte (-10%)</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Seção 1 - Parâmetros Ajustáveis */}
            <div className="space-y-5 bg-white p-5 border border-slate-200 rounded-xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Parâmetros Ajustáveis</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Headcount Planejado
                    <Tooltip text="Quantidade projetada inicial de colaboradores. O motor ajustará este número de acordo com eficiência e horas reais."><Info className="w-3 h-3 text-slate-400" /></Tooltip>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSimHeadcount(Math.max(1, simHeadcount - 10))} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs hover:bg-slate-200">-10</button>
                    <input type="number" value={simHeadcount} onChange={(e) => setSimHeadcount(Number(e.target.value))} className="w-16 border rounded px-2 py-1 text-right text-sm font-bold font-mono text-slate-700" />
                    <button onClick={() => setSimHeadcount(simHeadcount + 10)} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs hover:bg-slate-200">+10</button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Eficiência (%)
                    <Tooltip text="Impacta a necessidade de colaboradores indiretamente. Menor eficiência aumenta demanda de pessoas."><Info className="w-3 h-3 text-slate-400" /></Tooltip>
                  </label>
                  <div className="flex items-center gap-3 w-48">
                    <input type="range" min="50" max="100" value={simEficiencia} onChange={(e) => setSimEficiencia(Number(e.target.value))} className="w-full accent-blue-500 h-1.5" />
                    <span className="font-mono text-xs font-bold w-10 text-right">{simEficiencia}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Salário Base (R$)
                    <Tooltip text="Permite simular reajustes salariais da categoria. Afeta todos proporcionalmente."><Info className="w-3 h-3 text-slate-400" /></Tooltip>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSimSalario(simSalario * 0.95)} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold hover:bg-slate-200">-5%</button>
                    <input type="number" value={Math.round(simSalario)} onChange={(e) => setSimSalario(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-right text-sm font-bold font-mono text-slate-700" />
                    <button onClick={() => setSimSalario(simSalario * 1.05)} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold hover:bg-slate-200">+5%</button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Encargos Totais (%)
                    <Tooltip text="Percentual de encargos e provisões legais aplicados. Edite para testar isenção patronal ou aumento de CSLL, etc."><Info className="w-3 h-3 text-slate-400" /></Tooltip>
                  </label>
                  <input type="number" step="0.01" value={simEncargos} onChange={(e) => setSimEncargos(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-right text-sm font-mono text-slate-700" />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Absenteísmo (%)
                    <Tooltip text="Percentual médio de ausência. O modelo exige reposição dessa força para manter produção, gerando custo de substitutos."><Info className="w-3 h-3 text-slate-400" /></Tooltip>
                  </label>
                  <input type="number" value={simAbsenteismo} onChange={(e) => setSimAbsenteismo(Number(e.target.value))} className="w-16 border rounded px-2 py-1 text-right text-sm font-mono text-slate-700" />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    Horas Úteis/Dia
                    <Tooltip text="Quantidade de horas gastas executando. Abaixo de 8h reduz produtividade, demandando contratação adicional forçada para compensar."><Info className="w-3 h-3 text-slate-400" /></Tooltip>
                  </label>
                  <input type="number" min="4" max="12" value={simHorasUteis} onChange={(e) => setSimHorasUteis(Number(e.target.value))} className="w-16 border rounded px-2 py-1 text-right text-sm font-mono text-slate-700" />
                </div>
              </div>
            </div>

            {/* Seção 2 - Resultados Dinâmicos */}
            <div className="space-y-4">

              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Projeção Dinâmica</h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Custo Mensal</p>
                      <p className="text-xl font-bold font-mono text-slate-900">{brl(simCustoMensal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Custo Anual</p>
                      <p className="text-xl font-bold font-mono text-slate-900">{brl(simCustoAnual)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Custo Médio / Pessoa</p>
                      <p className="text-sm font-bold font-mono text-slate-600">{brl(custoPorPessoaSim)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Pessoas Real Req.</p>
                      <p className="text-sm font-bold font-mono text-blue-700">{Math.ceil(headcountFinalSim)} pessoas</p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg flex flex-col border ${diffCustoAnual > 0 ? 'bg-rose-50 border-rose-100' : diffCustoAnual < 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Impacto Financeiro Anual (vs Atual)</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-black font-mono ${diffCustoAnual > 0 ? 'text-rose-600' : diffCustoAnual < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {diffCustoAnual > 0 ? '+' : ''}{brl(diffCustoAnual)}
                      </span>
                    </div>
                    <span className={`text-sm font-bold px-2 py-1 rounded bg-white border ${diffCustoAnual > 0 ? 'text-rose-600 border-rose-200' : diffCustoAnual < 0 ? 'text-emerald-600 border-emerald-200' : 'text-slate-400 border-slate-200'}`}>
                      {diffCustoAnual > 0 ? '↑' : diffCustoAnual < 0 ? '↓' : ''} {Math.abs(percAumento).toFixed(2)}%
                    </span>
                  </div>
                  <p className={`text-[10px] tracking-wide mt-2 font-medium ${diffCustoAnual > 0 ? 'text-rose-500' : diffCustoAnual < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {diffCustoAnual > 0 ? 'Aumento de custo operacional verificado.' : diffCustoAnual < 0 ? 'Economia projetada na folha.' : 'Manteve-se inalterado em relação ao consolidado atual.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          label="Custo Mensal Total"
          value={brl(totalCustoBase)}
          sub="Salário + encargos + provisões consolidados"
          icon={<DollarSign className="w-4 h-4 text-white" />}
          gradient="bg-gradient-to-br from-slate-800 to-slate-900"
        />
        <KpiCard
          label="Total de Colaboradores"
          value={String(totalColaboradoresBase)}
          sub="Ativos registrados no sistema"
          icon={<Users className="w-4 h-4 text-white" />}
          gradient="bg-gradient-to-br from-blue-600 to-blue-800"
          barPct={100}
          barColor="bg-white/60"
        />
        <KpiCard
          label="Custo Médio / Pessoa"
          value={brl(custoMedioBase)}
          sub="Custo empresa real por colaborador"
          icon={<TrendingUp className="w-4 h-4 text-white" />}
          gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['pivos', 'colaboradores'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {t === 'pivos' ? `Custo por Pivô (${aggregatedData.length})` : `Colaboradores (${totalColaboradoresBase})`}
          </button>
        ))}
      </div>

      {/* ── Tab: Custo por Pivô ── */}
      {tab === 'pivos' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative z-10 hover:z-[100] transition-all duration-300">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Custo por Unidade Operacional</h3>
              <p className="text-xs text-slate-400 mt-0.5">Custo real mensal contabilizado sobre as folhas</p>
            </div>
            <Briefcase className="w-4 h-4 text-slate-300" />
          </div>
          <div className="divide-y divide-gray-50">
            {aggregatedData.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">Nenhum dado disponível.</div>
            ) : aggregatedData
              .slice()
              .sort((a, b) => b.custo_real - a.custo_real)
              .map((data, idx) => {
                const pct = (data.custo_real / maxCustoBase) * 100;
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                const color = colors[idx % colors.length];
                return (
                  <div key={data.pivo_nome} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-sm font-semibold text-slate-800">{data.pivo_nome}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded-full">
                          {data.total_colaboradores} pessoas
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 font-mono">{brl(data.custo_real)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400">{pct.toFixed(0)}% do maior custo</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {brl(data.total_colaboradores > 0 ? data.custo_real / data.total_colaboradores : 0)} / pessoa
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
          {aggregatedData.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Geral Consolidado</span>
              <span className="text-sm font-bold text-slate-900 font-mono">{brl(totalCustoBase)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Colaboradores ── */}
      {tab === 'colaboradores' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl relative z-10 hover:z-[100] transition-all duration-300">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Detalhamento de Colaboradores</h3>
              <p className="text-xs text-slate-400 mt-0.5">Salário efetivo e custo real fixado para a empresa</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 w-52"
              />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-gray-100">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 relative"
                    onClick={() => toggleSort('nome')}
                  >
                    <Tooltip title="🔹 Nome do Colaborador" text="Identificação oficial do funcionário conforme registro em folha." position="bottom">
                      <span className="flex items-center gap-1">
                        Nome
                        {sortField === 'nome' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </span>
                    </Tooltip>
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider relative">
                    <Tooltip title="🔹 Cargo / Função" text="Ocupação principal do colaborador na estrutura organizacional." position="bottom">
                      Cargo
                    </Tooltip>
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider relative">
                    <Tooltip title="🔹 Salário Fixo" text="Remuneração bruta mensal contratual, sem considerar encargos ou benefícios." position="bottom">
                      Salário Fixo
                    </Tooltip>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 relative"
                    onClick={() => toggleSort('custo')}
                  >
                    <Tooltip title="🔹 Custo Empresa" text="Custo total real para a empresa, incluindo Salário + Encargos (INSS, FGTS, Férias, 13º, RAT, etc)." position="bottom">
                      <span className="flex items-center gap-1">
                        Custo Empresa Mensal
                        {sortField === 'custo' ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </span>
                    </Tooltip>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {colabFiltrados.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">Nenhum colaborador encontrado.</td></tr>
                ) : colabFiltrados.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                          {(c.nome || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{c.nome || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                        {c.cargo || 'Sem cargo'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-600 font-mono">{brl(c.salarioEfetivo)}</td>
                    <td className="px-6 py-3.5 text-sm font-bold text-slate-900 font-mono">{brl(c.custoEmpresa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {colabFiltrados.length > 0 && (
            <div className="px-6 py-3.5 bg-slate-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">{colabFiltrados.length} colaboradores</span>
              <span className="text-xs font-bold text-slate-600 font-mono">
                Total: {brl(colabFiltrados.reduce((s, c) => s + c.custoEmpresa, 0))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HrFinancePage;
