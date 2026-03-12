import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Users, Settings2, ArrowUpDown, AlertCircle, CheckCircle2, TrendingDown, Info, Calculator, DollarSign, Edit2, X, Check } from 'lucide-react';
import { Colaborador, Pivot } from '../types';

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

const AssetManagementPage: React.FC = () => {
  const [pivots, setPivots] = useState<Pivot[]>([]);
  const [colaboradores, setColabs] = useState<Colaborador[]>([]);
  const [pivosGeo, setPivosGeo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<string>('diferenca_abs'); // default sort por maior desvio
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'pivots' | 'geo'>('pivots');

  const [editingPivoId, setEditingPivoId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');

  const parsePivoName = (fullName: string) => {
    const parts = (fullName || '').split('-');
    if (parts.length > 1) {
      const original = parts[0].trim();
      const editable = parts.slice(1).join('-').trim();
      return { original, editable };
    }
    return { original: fullName.trim(), editable: '' };
  };

  const handleEditClick = (pivo: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const { editable } = parsePivoName(pivo.nome);
    setEditingPivoId(pivo.id);
    setEditNameValue(editable);
  };

  const handleSaveEdit = async (pivo: any) => {
    const { original } = parsePivoName(pivo.nome);
    const newName = editNameValue.trim() ? `${original}-${editNameValue}` : original;

    try {
      const res = await fetch(`/api/pivots/${pivo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newName })
      });
      if (res.ok) {
        setPivots(pivots.map(p => p.pivo_id === pivo.id ? { ...p, pivo_nome: newName } : p));
        setEditingPivoId(null);
      } else {
        alert('Erro ao salvar nome');
      }
    } catch (e) {
      alert('Erro de conexão ao salvar nome');
    }
  };

  // Premissas Técnicas Globais
  const [capacidadeBase, setCapacidadeBase] = useState(40); // 40 ha/pessoa
  const [eficienciaGeral, setEficienciaGeral] = useState(90); // 90%
  const [icoDefault, setIcoDefault] = useState(1.0); // 1.0 = normal
  const [capacidadeAlternativa, setCapacidadeAlternativa] = useState<number | ''>('');

  // Impacto Financeiro Default
  const [custoMedio, setCustoMedio] = useState(2500);

  const load = async () => {
    try {
      const [pivotsRes, colabRes, geoRes, legalRes] = await Promise.all([
        fetch('/api/pivots'),
        fetch('/api/colaboradores'),
        fetch('/api/pivos-geo'),
        fetch('/api/configuracoes-legais'),
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

      const pivotsData = await safeJson(pivotsRes);
      if (pivotsData) {
        setPivots(pivotsData.data || pivotsData || []);
      }

      const colabsData = await safeJson(colabRes);
      if (colabsData) setColabs(colabsData);

      const geoData = await safeJson(geoRes);
      if (geoData) {
        setPivosGeo(geoData.data || geoData || []);
      }

      const l = await safeJson(legalRes);
      if (l) {
        const base = l.salario_minimo || 1621;
        const enc = (l.inss_empresa_percentual || 20) + (l.fgts_percentual || 8) + (l.rat_percentual || 2) +
          (l.terceiros_percentual || 5.8) + (l.provisao_ferias_percentual || 11.11) + (l.provisao_13_percentual || 8.33);
        setCustoMedio(base * (1 + enc / 100));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Capacidade Ajustada = Capacidade Base ÷ ICO ÷ Eficiência
  const capacidadeAjustada = capacidadeBase / (icoDefault || 1) / ((eficienciaGeral || 100) / 100);

  const capacidadeAjustadaSimulada = capacidadeAlternativa ? (Number(capacidadeAlternativa) / (icoDefault || 1) / ((eficienciaGeral || 100) / 100)) : null;

  // ── Pivôs Operacionais (Cruzamento) ──
  const pivotAssets = useMemo(() => {
    return pivots.map(p => {
      const pivColabs = colaboradores.filter(c => c.pivo_nome === p.pivo_nome);
      const rhAtual = pivColabs.length > 0 ? pivColabs.length : (Number(p.headcount) || 0);

      let area_ha = Number(p.area_ha) || 0;
      if (area_ha === 0 && pivosGeo.length > 0) {
        const nomeNorm = (p.pivo_nome || '').toLowerCase().trim();
        const match = pivosGeo.find(g =>
          (g.nome || '').toLowerCase().trim() === nomeNorm ||
          (g.nome || '').toLowerCase().includes(nomeNorm)
        );
        if (match) area_ha = Number(match.area_ha) || 0;
      }

      // Necessidade Técnica do Pivô
      const necessidadeteo = area_ha > 0 ? (area_ha / capacidadeAjustada) : 0;
      const rhTecnico = Math.ceil(necessidadeteo);

      // Diferença
      const diferenca = rhAtual - rhTecnico;
      const diferenca_abs = Math.abs(diferenca);

      // Classificação de Performance / Estrutura
      let severidadeDesvio = 'Leve';
      if (diferenca_abs === 2) severidadeDesvio = 'Moderado';
      if (diferenca_abs >= 3) severidadeDesvio = 'Crítico';

      return {
        id: p.pivo_id,
        nome: p.pivo_nome,
        area_ha,
        necessidadeteo,
        rhTecnico,
        rhAtual,
        diferenca,
        diferenca_abs,
        severidadeDesvio
      };
    });
  }, [pivots, colaboradores, pivosGeo, capacidadeAjustada]);

  // ── Pivôs geográficos importados (pivos_geo) ──
  const geoAssets = useMemo(() => {
    return pivosGeo.map((p: any) => {
      const area_ha = Number(p.area_ha) || 0;
      const tipo = p.tipo === 'circle' ? 'Círculo Otimizado' : 'Polígono';
      const raio = p.raio_m ? `${Number(p.raio_m).toFixed(0)} m` : '—';
      return {
        id: p.id || p.nome,
        nome: p.nome,
        tipo_forma: tipo,
        area_ha,
        raio,
      };
    });
  }, [pivosGeo]);

  // ── Ordenação ──
  const sorted = useMemo(() => {
    const list = [...pivotAssets];
    list.sort((a: any, b: any) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [pivotAssets, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // ── Totais e Indicadores ──
  const totalArea = pivotAssets.reduce((s, a) => s + a.area_ha, 0);
  const necessidadeTeoricaGlobal = totalArea > 0 ? totalArea / capacidadeAjustada : 0;
  const totalRhTecnicoAjustado = pivotAssets.reduce((s, a) => s + a.rhTecnico, 0); // Soma dos arredondamentos
  const totalRhAtual = pivotAssets.reduce((s, a) => s + a.rhAtual, 0);
  const ativosCriticos = pivotAssets.filter(a => a.diferenca_abs >= 3).length; // Conta os severos como criticos

  const diferencaGlobal = totalRhAtual - totalRhTecnicoAjustado; // se positivo é excesso

  // Índice de Eficiência Estrutural (%) = Necessidade / RH Atual (não pode passar de 100 no conceito ideal? Ou pode se faltar gente?)
  // "Necessidade Técnica ÷ RH Atual"
  const eficienciaEstrutural = totalRhAtual > 0 ? (totalRhTecnicoAjustado / totalRhAtual) * 100 : 0;

  // Simulador
  const necessidadeTeoricaSimulada = capacidadeAjustadaSimulada && totalArea > 0 ? totalArea / capacidadeAjustadaSimulada : null;

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-500">Monitorando infraestrutura...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-rose-600">Erro: {error}</div>;

  const ThBtn: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
    <th
      className="px-5 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors select-none group/th relative"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-2">
        {children}
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/th:opacity-100 transition-opacity" />
      </span>
    </th>
  );

  const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Diagnóstico Estrutural de Pivôs</h1>
          <p className="text-sm text-slate-500">Avaliação avançada de performance, ociosidade e capacidade instalada</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CALIBRACAO ESTRUTURAL */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative z-10 hover:z-20">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Settings2 className="w-4 h-4 text-slate-500" />
              <Tooltip text="Ajuste os parâmetros base para recalcular o impacto direto no headcout estrutural de toda a fazenda." title="Calibração da Capacidade Ajustada">
                <h3 className="text-sm font-bold text-slate-800">Calibração da Capacidade Ajustada</h3>
              </Tooltip>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <Tooltip text="Potencial padrão de hectares que 1 colaborador deveria operar sozinho." title="Capacidade Base">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 inline-block">Capacidade Base (ha/p)</label>
                </Tooltip>
                <input type="number" min="10" value={capacidadeBase} onChange={e => setCapacidadeBase(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg text-sm text-slate-800 font-mono shadow-sm" />
              </div>
              <div>
                <Tooltip text="Índice de Complexidade Operacional. Peso dado ao manejo da cultura em campo (ex: 1.0 = normal, 1.2 = complexo)." title="Complexidade (ICO)">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 inline-block">Cultura / Clima (ICO)</label>
                </Tooltip>
                <input type="number" min="0.1" step="0.1" value={icoDefault} onChange={e => setIcoDefault(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg text-sm text-slate-800 font-mono shadow-sm" />
              </div>
              <div>
                <Tooltip text="Percentual de eficiência em campo considerando relevo, distância, maquinários, ou perdas de deslocamento." title="Eficiência Geral">
                  <label className="block text-xs font-semibold text-slate-500 mb-1 inline-block">Eficiência Geral (%)</label>
                </Tooltip>
                <input type="number" min="10" max="100" value={eficienciaGeral} onChange={e => setEficienciaGeral(Number(e.target.value))} className="w-full px-3 py-1.5 border rounded-lg text-sm text-slate-800 font-mono shadow-sm" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">Fórmula: CapBase ÷ ICO ÷ (Eficiência/100)</span>
              <span className="font-bold text-slate-700">={capacidadeAjustada.toFixed(2)} ha/p (Ajustada)</span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex justify-between items-start mb-1">
                <Tooltip text="Soma total da área de todos os pivôs com RH mapeado do sistema." title="Área Operante">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-300 inline-block">Área Operante Total</span>
                </Tooltip>
                <Box className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalArea.toFixed(1)} <span className="text-base text-slate-500 font-normal">ha</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">Base sobre a qual se calcula o RH</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 ring-1 ring-blue-500/10">
              <div className="flex justify-between items-start mb-1">
                <Tooltip text="Calculado cruzando a necessidade recomendada contra o efetivo alocado." title="Índice de Eficiência Estrutural">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-dashed border-slate-300 inline-block pointer-events-auto">Índice Eficiência Estrutural <Info className="w-3 h-3 text-slate-300" /></span>
                </Tooltip>
                <TrendingDown className={`w-3.5 h-3.5 ${eficienciaEstrutural < 100 ? 'text-amber-500' : 'text-emerald-500'}`} />
              </div>
              <p className={`text-2xl font-bold ${eficienciaEstrutural < 80 ? 'text-amber-600' : eficienciaEstrutural > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>{eficienciaEstrutural.toFixed(1)}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Real vs Recomendado</p>
            </div>

            <div className={`rounded-xl border shadow-sm p-4 ${diferencaGlobal > 0 ? 'bg-amber-50 border-amber-200' : diferencaGlobal < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex justify-between items-start mb-1">
                <Tooltip text="Visão estimativa considerando a somatória dos devios × custo médio global preestabelecido." title="Impacto Estrutural">
                  <span className={`text-[10px] font-bold uppercase tracking-widest border-b border-dashed inline-block pointer-events-auto ${diferencaGlobal !== 0 ? 'text-amber-700 border-amber-400/50' : 'text-emerald-700 border-emerald-400/50'}`}>Impacto Financeiro Est.</span>
                </Tooltip>
                <DollarSign className={`w-3.5 h-3.5 ${diferencaGlobal !== 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
              </div>
              <p className={`text-xl font-bold font-mono ${diferencaGlobal !== 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {diferencaGlobal !== 0 ? brl(Math.abs(diferencaGlobal) * custoMedio) : brl(0)}
              </p>
              <p className={`text-[10px] mt-0.5 font-bold ${diferencaGlobal > 0 ? 'text-amber-600' : diferencaGlobal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {diferencaGlobal > 0 ? `Custo aprox. do excesso (${diferencaGlobal}p)` : diferencaGlobal < 0 ? `Economia aparente (faltam ${Math.abs(diferencaGlobal)}p)` : 'Sem impacto excedente'}
              </p>
            </div>
          </div>
        </div>

        {/* PAINEL DIREITO: RESULTADOS & SIMULADOR */}
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl p-5 shadow-lg text-white">
            <Tooltip title="Métrica Dupla Global" text="Compara a necessidade teórica 'livro ideal' dividindo área pela capacidade, vs a real alocação somada pelos cortes dos pivôs reais (ex: meia pessoa é arredondada).">
              <h3 className="text-sm font-bold border-b border-slate-700 pb-2 mb-4 border-dashed inline-block">Métrica Dupla Global</h3>
            </Tooltip>

            <div className="space-y-4">
              <div>
                <Tooltip title="Teórico Global Contínuo" text="Resultado exato se ignorarmos fracionamentos. Equação pura (Área / Cap. Ajustada).">
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-dashed border-slate-600 pb-0.5 inline-block cursor-help">Teórico Global Contínuo</span>
                </Tooltip>
                <p className="text-xl font-bold font-mono mt-1">{necessidadeTeoricaGlobal.toFixed(2)}</p>
                <span className="text-[10px] text-slate-500">Área total ÷ Capacidade Ajustada</span>
              </div>

              <div>
                <Tooltip title="Necessidade Real Ajustada" text="Soma de todos os 'arredondamentos pra cima' de cada pivô. Se um pivô exige 1.2 pessoas, considerará 2.">
                  <span className="text-[10px] uppercase tracking-widest text-blue-300 border-b border-dashed border-blue-500/50 pb-0.5 inline-block cursor-help">Necessidade Real Ajustada</span>
                </Tooltip>
                <p className="text-3xl font-black text-blue-400 mt-1">{totalRhTecnicoAjustado} <span className="text-sm font-normal text-blue-300">pessoas</span></p>
                <span className="text-[10px] text-slate-400 block mt-1">Soma de arredondamentos p/ limite do pivô</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-indigo-500" />
              <Tooltip title="Simulador de Sensibilidade" text="Insira aqui uma capacidade teórica temporária (sem alterar as premissas) apenas para sondar o impacto rápido sobre o Teórico Global Contínuo.">
                <h3 className="text-sm font-bold text-slate-800 border-b border-dashed border-slate-300 pointer-events-auto cursor-help">Simulador de Sensibilidade</h3>
              </Tooltip>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">E se nossa capacidade base forçada fosse diferente?</p>

            <div>
              <input type="number" placeholder="Capacidade alternativa (ha/p)" value={capacidadeAlternativa} onChange={e => setCapacidadeAlternativa(e.target.value ? Number(e.target.value) : '')} className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg flex items-center justify-between border border-indigo-100">
              <span className="text-[11px] font-bold text-indigo-800 uppercase">Novo Teórico Global:</span>
              <span className="text-lg font-bold font-mono text-indigo-600">
                {necessidadeTeoricaSimulada !== null ? necessidadeTeoricaSimulada.toFixed(2) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pt-4">
        <button
          onClick={() => setActiveTab('pivots')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pivots' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Diagnóstico por Pivô ({pivotAssets.length})
        </button>
        <button
          onClick={() => setActiveTab('geo')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'geo' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Pivôs Geográficos ({geoAssets.length})
        </button>
      </div>

      {/* Tabela Pivôs Operacionais */}
      {activeTab === 'pivots' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl relative z-10 hover:z-[100] transition-all duration-300">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-slate-50">
                <tr>
                  <ThBtn k="nome">
                    <Tooltip
                      title="🚜 Pivô / Cultura"
                      text="Identificação técnica do pivô geográfico e manejo atual."
                      formula="Cód. Patrimonial + Variedade"
                      interpretation="Determina as premissas de custo operacional e rendimento."
                      position="bottom"
                    >
                      <span className="border-b border-dashed border-slate-300 pointer-events-auto">Pivô / Cultura</span>
                    </Tooltip>
                  </ThBtn>
                  <ThBtn k="area_ha">
                    <Tooltip
                      title="📐 Área Geográfica"
                      text="Área líquida cultivada sob a influência direta do pivô."
                      formula="Polígono GIS (ha)"
                      interpretation="Metrificação base para densidade de pessoal e insumos."
                      position="bottom"
                    >
                      <span className="border-b border-dashed border-slate-300 pointer-events-auto">Area (ha)</span>
                    </Tooltip>
                  </ThBtn>
                  <ThBtn k="rhTecnico">
                    <Tooltip
                      title="🤖 RH Modelado"
                      text="Dimensionamento ideal teórico baseado no modelo de dias-homem da empresa."
                      formula="Área / Fator de Produtividade Humana"
                      interpretation="Referência para contratações ou desligamentos estruturais."
                      position="bottom"
                    >
                      <span className="border-b border-dashed border-slate-300 pointer-events-auto">Modelado</span>
                    </Tooltip>
                  </ThBtn>
                  <ThBtn k="rhAtual">
                    <Tooltip
                      title="👥 RH Atual"
                      text="Total de colaboradores reais vinculados administrativamente ao setor."
                      formula="Σ Folha de Pagamento Active"
                      interpretation="Comparativo direto contra o modelo teórico esperado."
                      position="bottom"
                    >
                      <span className="border-b border-dashed border-slate-300 pointer-events-auto">RH Atual</span>
                    </Tooltip>
                  </ThBtn>
                  <ThBtn k="diferenca">
                    <Tooltip
                      title="⚖️ GAP Operacional"
                      text="Variança entre a estrutura real instalada e a modelagem teórica."
                      formula="Atual / Ideal (%)"
                      interpretation="Valores acima de 100% indicam ociosidade; abaixo indicam sobrecarga."
                      position="bottom"
                    >
                      <span className="border-b border-dashed border-slate-300 pointer-events-auto">GAP RH</span>
                    </Tooltip>
                  </ThBtn>
                  <ThBtn k="diferenca_abs">
                    <Tooltip
                      title="🚩 Severidade do Desvio"
                      text="Classificação qualitativa do impacto financeiro e operacional do GAP."
                      formula="Variação % vs Quadrantes de Risco"
                      interpretation="Priorização de ações corretivas na gestão de custos."
                      position="bottom"
                    >
                      <span className="border-b border-dashed border-slate-300 pointer-events-auto">Classificação</span>
                    </Tooltip>
                  </ThBtn>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sorted.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">Nenhum pivô validado.</td></tr>
                ) : sorted.map(a => (
                  <tr key={a.id} className="hover:bg-blue-50/30 transition-colors group/row">
                    <td className="px-5 py-4">
                      {editingPivoId === a.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <span className="text-sm font-bold text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-1 rounded">
                            {parsePivoName(a.nome).original}-
                          </span>
                          <input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Nome editável..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(a);
                              if (e.key === 'Escape') setEditingPivoId(null);
                            }}
                          />
                          <button onClick={() => handleSaveEdit(a)} className="text-emerald-600 hover:text-emerald-700 p-1 bg-emerald-50 rounded">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingPivoId(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-50 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Tooltip
                            title="Resumo do Pivô"
                            text={`Pivô: ${a.nome}\nÁrea: ${a.area_ha.toFixed(2)} ha\nRH Necessário: ${a.rhTecnico}p\nRH Atual: ${a.rhAtual}p\nDesvio: ${a.diferenca}\nClassificação: ${a.severidadeDesvio}`}
                            position="right"
                          >
                            <span className="text-sm font-bold text-slate-800 border-b border-dashed border-slate-200 group-hover/row:border-blue-300 transition-colors cursor-help">
                              {a.nome}
                            </span>
                          </Tooltip>
                          <button
                            onClick={(e) => handleEditClick(a, e)}
                            className="opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-400 hover:text-blue-500 p-1 rounded-md hover:bg-blue-50"
                            title="Alterar apelido"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-mono font-medium">{a.area_ha > 0 ? a.area_ha.toFixed(2) : '—'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-blue-600 font-mono text-center">
                      <div className="flex flex-col items-center">
                        <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-700">{a.rhTecnico}</span>
                        <span className="text-[9px] text-slate-400 font-normal uppercase tracking-tighter mt-1">teo. {a.necessidadeteo.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 font-mono font-bold text-center">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{a.rhAtual}</span>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {a.diferenca === 0 ? (
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Zero
                        </div>
                      ) : a.diferenca > 0 ? (
                        <span className="text-amber-600 font-black text-sm bg-amber-50 px-2 py-0.5 rounded">+{a.diferenca}</span>
                      ) : (
                        <span className="text-rose-600 font-black text-sm bg-rose-50 px-2 py-0.5 rounded">{a.diferenca}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {a.diferenca === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ring-emerald-200">
                          Ideal
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset
                                                    ${a.severidadeDesvio === 'Leve' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                            a.severidadeDesvio === 'Moderado' ? 'bg-orange-50 text-orange-700 ring-orange-200' :
                              'bg-rose-50 text-rose-700 ring-rose-200'}
                                                `}>
                          {a.severidadeDesvio}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela Pivôs Geográficos Importados */}
      {activeTab === 'geo' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {geoAssets.length === 0 ? (
            <div className="p-12 text-center">
              <Box className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Nenhum pivô geográfico</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Área (ha)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {geoAssets.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">{a.nome}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${a.tipo_forma === 'Círculo Otimizado' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                          {a.tipo_forma}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 font-mono">{a.area_ha > 0 ? a.area_ha.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetManagementPage;
