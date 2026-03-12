import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AggregatedPivotData, aggregateData } from '../services/aggregationService';
import { Settings2, Info, DollarSign, TrendingUp, AlertCircle, RefreshCw, BarChart2, BookOpen, ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { ConfiguracoesLegais } from '../types';

const Tooltip: React.FC<{
    text: string;
    title?: string;
    formula?: string;
    interpretation?: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom'
}> = ({ text, title, formula, interpretation, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<any>(null);

    const updatePosition = () => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipWidth = 260; // Max-width defined in spec
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 12;

        // Try positioning below first
        let top = triggerRect.bottom + 8;
        let left = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);

        // Vertical Auto-Flip: If below exceeds viewport, show above
        // We use an estimated height of 150px if not yet rendered, or measure it
        const tooltipHeight = tooltipRef.current.offsetHeight || 150;
        if (top + tooltipHeight > viewportHeight - margin) {
            top = triggerRect.top - tooltipHeight - 8;
        }

        // Horizontal Constraint (Viewport bounded)
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
            // Intensive position monitoring for sticky/scroll scenarios
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
        <div
            ref={triggerRef}
            className="inline-flex items-center cursor-help"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            {children}
            {isVisible && createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                        width: '260px',
                        zIndex: 9999999
                    }}
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

const DEFAULT_RECEITAS_MIN_MAX = {
    'Batata': { min: 50000, max: 120000 },
    'Tomate': { min: 150000, max: 300000 },
    'Cebola': { min: 60000, max: 150000 },
    'Alho': { min: 100000, max: 200000 },
    'Mirtilo': { min: 100000, max: 250000 },
    'Repolho': { min: 60000, max: 120000 },
    'Outros': { min: 40000, max: 100000 },
};

const DIAS_HOMEM = {
    'Batata': 20,
    'Tomate': 200,
    'Cebola': 60,
    'Alho': 150,
    'Mirtilo': 100,
    'Repolho': 80,
    'Outros': 50,
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val).replace('R$', 'R$ ').replace(/\s+/g, ' ');
};

const StrategicSimulationPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'simulador' | 'metodologia'>('simulador');
    const [modoDebug, setModoDebug] = useState(false);

    const [aggregatedData, setAggregatedData] = useState<AggregatedPivotData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [legalSettings, setLegalSettings] = useState<ConfiguracoesLegais | null>(null);

    // 🎛️ Variáveis de Estado do Simulador
    const [cenarioAtivo, setCenarioAtivo] = useState<'manual' | 'conservador' | 'realista' | 'agressivo'>('realista');

    // 1️⃣ POTENCIAL DE RECEITA
    const [expandedReceita, setExpandedReceita] = useState(false);
    const [receitaMinMax, setReceitaMinMax] = useState(DEFAULT_RECEITAS_MIN_MAX);
    const [otimismoMercado, setOtimismoMercado] = useState(50); // 0 = Min, 100 = Max
    const [projecaoReceita, setProjecaoReceita] = useState<number | null>(null);
    const [isEditingReceita, setIsEditingReceita] = useState(false);
    const [receitaInputValue, setReceitaInputValue] = useState("");

    // 2️⃣ COMPLEXIDADE (ICO)
    const [expandedIco, setExpandedIco] = useState(false);
    const [icoGlobal, setIcoGlobal] = useState(1.0);
    const [pesoIcoCultura, setPesoIcoCultura] = useState(40);
    const [pesoIcoDistancia, setPesoIcoDistancia] = useState(40);
    const [pesoIcoRelevo, setPesoIcoRelevo] = useState(20);

    // 3️⃣ CUSTO OPERACIONAL
    const [custoOperacionalPerc, setCustoOperacionalPerc] = useState(60);

    // 4️⃣ EFICIÊNCIA DA EQUIPE
    const [expandedEficiencia, setExpandedEficiencia] = useState(false);
    const [eficienciaBase, setEficienciaBase] = useState(100);
    const [afastamentosLegais, setAfastamentosLegais] = useState(2);
    const [duracaoAfastamento, setDuracaoAfastamento] = useState(15);

    // 5️⃣ ABSENTEÍSMO
    const [expandedAbsenteismo, setExpandedAbsenteismo] = useState(false);
    const [absenteismo, setAbsenteismo] = useState(5);
    const [politicaSubst, setPoliticaSubst] = useState<'integral' | 'parcial' | 'nenhuma'>('integral');

    // 6️⃣ CAPACIDADE (Dias-Homem / Fator Mecanização)
    const [expandedCapacidade, setExpandedCapacidade] = useState(false);
    const [fatorMecanizacao, setFatorMecanizacao] = useState(0); // 0% = manual base, 100% = totalmente mecanizado (reduz dias homem)
    const [horasUteisDia, setHorasUteisDia] = useState(8);

    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [data, legalRes] = await Promise.all([
                    aggregateData(),
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

                setAggregatedData(data);
                const l = await safeJson(legalRes);
                if (l) setLegalSettings(l);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const config = legalSettings || {
        salario_minimo: 1621,
        inss_empresa_percentual: 20,
        fgts_percentual: 8,
        rat_percentual: 2,
        terceiros_percentual: 5.8,
        provisao_ferias_percentual: 11.11,
        provisao_13_percentual: 8.33
    };

    const salarioBase = config.salario_minimo || 1621;
    const somaEncargosPerc = 0.5524;
    const custoAnualPessoa = salarioBase * (1 + somaEncargosPerc) * 12; // ~ R$ 30.197

    // Recalcular Eficiência Real
    const perdaAfastamentoRelativa = (afastamentosLegais * (duracaoAfastamento / 30)) / 12; // simplificação
    const eficienciaRealAjustada = Math.max(0, eficienciaBase - absenteismo - afastamentosLegais);

    // 🚀 Botões de Cenário
    const aplicarCenario = (tipo: 'conservador' | 'realista' | 'agressivo') => {
        setCenarioAtivo(tipo);
        if (tipo === 'conservador') {
            setOtimismoMercado(20);
            setCustoOperacionalPerc(65);
            setIcoGlobal(1.1);
            setEficienciaBase(90);
            setAbsenteismo(8);
            setPoliticaSubst('integral');
            setFatorMecanizacao(0);
        } else if (tipo === 'realista') {
            setOtimismoMercado(50);
            setCustoOperacionalPerc(60);
            setIcoGlobal(1.0);
            setEficienciaBase(100);
            setAbsenteismo(5);
            setPoliticaSubst('integral');
            setFatorMecanizacao(20);
        } else if (tipo === 'agressivo') {
            setOtimismoMercado(80);
            setCustoOperacionalPerc(55);
            setIcoGlobal(0.9);
            setEficienciaBase(100);
            setAbsenteismo(2);
            setPoliticaSubst('parcial');
            setFatorMecanizacao(40);
        }
    };

    const restaurarBenchmark = () => {
        aplicarCenario('realista');
        setReceitaMinMax(DEFAULT_RECEITAS_MIN_MAX);
        setProjecaoReceita(null);
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    };

    // 🧠 Motor de Simulação
    const simulationResults = useMemo(() => {
        // Passo 1: Calcular a receita somada natural do cenário para achar o fator de escala
        const receitaNaturalSoma = aggregatedData.reduce((acc, p) => {
            const isCulturaDefinida = !!(p.cultura_nome && p.cultura_nome.trim() !== '');
            const culturaKeyOriginal = isCulturaDefinida ? p.cultura_nome!.trim() : 'Cultura não definida';
            const culturaChave = isCulturaDefinida && receitaMinMax[culturaKeyOriginal] ? culturaKeyOriginal : 'Outros';
            const bounds = receitaMinMax[culturaChave] || DEFAULT_RECEITAS_MIN_MAX['Outros'];
            const amplitude = bounds.max - bounds.min;
            const recHectare = bounds.min + (amplitude * (otimismoMercado / 100));
            return acc + (p.area_ha * recHectare);
        }, 0);

        const fatorEscala = (projecaoReceita !== null && projecaoReceita > 0 && receitaNaturalSoma > 0)
            ? (projecaoReceita / receitaNaturalSoma)
            : 1;

        return aggregatedData.map(p => {
            const isCulturaDefinida = !!(p.cultura_nome && p.cultura_nome.trim() !== '');
            const culturaKeyOriginal = isCulturaDefinida ? p.cultura_nome!.trim() : 'Cultura não definida';
            const culturaChave = isCulturaDefinida && receitaMinMax[culturaKeyOriginal] ? culturaKeyOriginal : 'Outros';

            // 1️⃣ Receita (Interpolação com Ajuste de Projeção Global)
            const bounds = receitaMinMax[culturaChave] || DEFAULT_RECEITAS_MIN_MAX['Outros'];
            const amplitude = bounds.max - bounds.min;
            let recHectare = bounds.min + (amplitude * (otimismoMercado / 100));

            // Aplica a sobreposição de projeção manual se houver
            recHectare = recHectare * fatorEscala;
            let receitaTotal = p.area_ha * recHectare;

            // 2️⃣ Custo Insumos
            const custoOpAgricola = receitaTotal * (custoOperacionalPerc / 100);

            // 3️⃣ Capacidade & ICO & Eficiência
            // Menos horas úteis diárias = mais dias necessários
            const multiHoras = 8 / horasUteisDia;

            // Fator mecanização reduz dias homem (ex: 50% reduz pela metade)
            const fatMecMulti = (100 - fatorMecanizacao) / 100;

            const diasHomemPadrao = DIAS_HOMEM[culturaChave as keyof typeof DIAS_HOMEM] || DIAS_HOMEM['Outros'];
            const diasNecessarios = p.area_ha * diasHomemPadrao * icoGlobal * multiHoras * fatMecMulti;

            const necessidadeRaw = diasNecessarios / (264 * (eficienciaRealAjustada / 100));
            const necessidade = Math.ceil(necessidadeRaw); // Arredonda pra cima

            // 4️⃣ Absenteísmo & Substituição
            let custoAbsenteismoAdicional = 0;
            if (politicaSubst === 'integral') {
                custoAbsenteismoAdicional = (absenteismo / 100) * necessidade * custoAnualPessoa;
            } else if (politicaSubst === 'parcial') {
                custoAbsenteismoAdicional = (absenteismo / 100) * necessidade * custoAnualPessoa * 0.5;
            } else {
                // Se não substitui ninguem, perde receita pela inatividade
                receitaTotal = receitaTotal * (1 - (absenteismo / 100));
            }

            // Custos de RH 
            const custoTotalSugeridoRH = (necessidade * custoAnualPessoa) + custoAbsenteismoAdicional;
            const atualParams = p.total_colaboradores || 0;
            const custoTotalRealRH = atualParams * custoAnualPessoa;

            const custoFinalSugerido = custoTotalSugeridoRH + custoOpAgricola;

            const margemOperacional = receitaTotal - custoFinalSugerido;
            const indiceCusto = receitaTotal > 0 ? (custoFinalSugerido / receitaTotal) * 100 : 0;
            const margemPercentual = receitaTotal > 0 ? (margemOperacional / receitaTotal) * 100 : 0;

            const gapPessoas = necessidade - atualParams; // positivo = faltam, negativo = excesso
            const gapFinanceiro = gapPessoas * custoAnualPessoa;

            return {
                ...p,
                culturaKey: culturaKeyOriginal,
                culturaChave,
                isCulturaDefinida,
                recHectare,
                receitaTotal,
                custoOpAgricola,
                necessidade,
                custoTotalSugeridoRH,
                custoTotalRealRH,
                custoFinalSugerido,
                margemOperacional,
                margemPercentual,
                indiceCusto,
                atual: atualParams,
                gapPessoas,
                gapFinanceiro,
                custoAbsenteismoAdicional,
                necessidadeRaw
            };
        });
    }, [aggregatedData, receitaMinMax, otimismoMercado, custoOperacionalPerc, eficienciaRealAjustada, custoAnualPessoa, icoGlobal, fatorMecanizacao, horasUteisDia, absenteismo, politicaSubst, projecaoReceita]);

    const totalReceita = simulationResults.reduce((s, p) => s + p.receitaTotal, 0);
    const totalCustoSugerido = simulationResults.reduce((s, p) => s + p.custoFinalSugerido, 0);
    const totalMargem = simulationResults.reduce((s, p) => s + p.margemOperacional, 0);
    const mediaIndiceCusto = totalReceita > 0 ? (totalCustoSugerido / totalReceita) * 100 : 0;

    if (loading) return <div className="flex justify-center items-center h-screen text-slate-500 font-medium">Processando laboratório formual...</div>;
    if (error) return <div className="flex justify-center items-center h-screen text-rose-600 font-medium">Erro: {error}</div>;

    const LabelIcon = ({ expanded, setExpanded }: { expanded: boolean, setExpanded: (v: boolean) => void }) => (
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 ml-1 transition-transform">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                        <BarChart2 className="text-indigo-600" /> Laboratório de Cenários
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Simulação paramétrica profunda com controles deslizantes inteligentes.</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setModoDebug(!modoDebug)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-md transition-all border ${modoDebug ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <Bug className="w-4 h-4" /> Debug Técnico
                    </button>
                    <div className="flex p-1 bg-slate-100 rounded-md">
                        <button
                            onClick={() => setActiveTab('simulador')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'simulador' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            <Settings2 className="w-4 h-4" /> Simulador Dinâmico
                        </button>
                        <button
                            onClick={() => setActiveTab('metodologia')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'metodologia' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" /> Base Técnica
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'simulador' && (
                <div className="space-y-6 animate-in fade-in duration-300">

                    {/* BOTÕES DE CENÁRIO */}
                    <div className="flex items-center gap-4 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
                        <div className="text-sm font-semibold text-indigo-900 mr-4 flex flex-col">
                            <span>Presets de Mercado</span>
                            <span className="text-[10px] font-normal text-indigo-600">Altera as variáveis abaixo</span>
                        </div>
                        <button
                            onClick={() => aplicarCenario('conservador')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${cenarioAtivo === 'conservador' ? 'bg-rose-600 text-white border-rose-700 shadow-md' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'}`}
                        >
                            📉 CONSERVADOR
                        </button>
                        <button
                            onClick={() => aplicarCenario('realista')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${cenarioAtivo === 'realista' ? 'bg-slate-800 text-white border-slate-900 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                        >
                            📊 REALISTA (Padrão)
                        </button>
                        <button
                            onClick={() => aplicarCenario('agressivo')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${cenarioAtivo === 'agressivo' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
                        >
                            🚀 AGRESSIVO
                        </button>
                        <button onClick={restaurarBenchmark} className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Restaurar Sliders
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                        {/* PAINEL DE CONTROLES INTELIGENTES */}
                        <div className="lg:col-span-1 border border-gray-200 rounded-xl bg-white shadow-sm p-5 space-y-6 h-fit relative z-10 hover:z-20">

                            {/* 1. POTENCIAL DE RECEITA */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                        Otimismo Mercado <LabelIcon expanded={expandedReceita} setExpanded={setExpandedReceita} />
                                    </span>
                                    <span className="font-mono text-emerald-700 font-bold">{otimismoMercado}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={otimismoMercado} onChange={(e) => { setOtimismoMercado(Number(e.target.value)); setCenarioAtivo('manual') }} className="w-full accent-emerald-500 h-1" />

                                {modoDebug && (
                                    <div className="text-[9px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded mt-1">
                                        Fórmula: Receita = MIN + ((MAX - MIN) * (Otimismo / 100))
                                    </div>
                                )}

                                {expandedReceita && (
                                    <div className="pt-3 pb-1 border-t border-slate-100 mt-2 space-y-2 animate-in slide-in-from-top-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tabela de Ranges (R$/ha)</div>
                                        {Object.entries(receitaMinMax).filter(([k]) => k !== 'Outros').map(([cult, bounds]: [string, any]) => (
                                            <div key={cult} className="flex justify-between items-center text-[10px] gap-2">
                                                <span className="w-12 block">{cult.substring(0, 6)}.</span>
                                                <input type="number" value={bounds.min} onChange={(e) => setReceitaMinMax({ ...receitaMinMax, [cult]: { ...bounds, min: Number(e.target.value) } })} className="w-16 border rounded px-1 py-0.5 text-right font-mono text-slate-500" />
                                                <span className="text-slate-300">-</span>
                                                <input type="number" value={bounds.max} onChange={(e) => setReceitaMinMax({ ...receitaMinMax, [cult]: { ...bounds, max: Number(e.target.value) } })} className="w-16 border rounded px-1 py-0.5 text-right font-mono text-slate-500" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* 2. CUSTO OPERACIONAL */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">Custo Insumos</span>
                                    <span className="font-mono text-rose-700 font-bold">{custoOperacionalPerc}%</span>
                                </div>
                                <input type="range" min="40" max="90" value={custoOperacionalPerc} onChange={(e) => { setCustoOperacionalPerc(Number(e.target.value)); setCenarioAtivo('manual') }} className="w-full accent-rose-500 h-1" />

                                {modoDebug && (
                                    <div className="text-[9px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded mt-1">
                                        Fórmula: CustoInsumos = Receita Total × (Insumos% / 100)
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* 3. COMPLEXIDADE (ICO) */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                        Complexidade (ICO) <LabelIcon expanded={expandedIco} setExpanded={setExpandedIco} />
                                    </span>
                                    <span className="font-mono text-indigo-700 font-bold">{icoGlobal.toFixed(2)}x</span>
                                </div>
                                <input type="range" min="0.5" max="2.0" step="0.05" value={icoGlobal} onChange={(e) => { setIcoGlobal(Number(e.target.value)); setCenarioAtivo('manual') }} className="w-full accent-indigo-500 h-1" />

                                {modoDebug && (
                                    <div className="text-[9px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded mt-1">
                                        Fórmula: NecessidadeRaw = NecessidadeBase × ICO
                                    </div>
                                )}

                                {expandedIco && (
                                    <div className="pt-3 pb-1 border-t border-slate-100 mt-2 space-y-3 animate-in slide-in-from-top-2">
                                        <div className="text-[9px] text-slate-400 block mb-2 leading-tight">ICO Final = (Cultura×{pesoIcoCultura}%) + (Distância×{pesoIcoDistancia}%) + (Relevo×{pesoIcoRelevo}%)</div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px]"><span>Peso Cultura</span><span className="font-mono">{pesoIcoCultura}%</span></div>
                                            <input type="range" min="0" max="100" value={pesoIcoCultura} onChange={(e) => setPesoIcoCultura(Number(e.target.value))} className="w-full h-0.5 accent-slate-300" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px]"><span>Peso Distância</span><span className="font-mono">{pesoIcoDistancia}%</span></div>
                                            <input type="range" min="0" max="100" value={pesoIcoDistancia} onChange={(e) => setPesoIcoDistancia(Number(e.target.value))} className="w-full h-0.5 accent-slate-300" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px]"><span>Peso Relevo</span><span className="font-mono">{pesoIcoRelevo}%</span></div>
                                            <input type="range" min="0" max="100" value={pesoIcoRelevo} onChange={(e) => setPesoIcoRelevo(Number(e.target.value))} className="w-full h-0.5 accent-slate-300" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* 4. EFICIÊNCIA DA EQUIPE */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                        Eficiência Equipe <LabelIcon expanded={expandedEficiencia} setExpanded={setExpandedEficiencia} />
                                    </span>
                                    <span className="font-mono text-amber-700 font-bold">{eficienciaBase}%</span>
                                </div>
                                <input type="range" min="50" max="100" value={eficienciaBase} onChange={(e) => { setEficienciaBase(Number(e.target.value)); setCenarioAtivo('manual') }} className="w-full accent-amber-500 h-1" />

                                {modoDebug && (
                                    <div className="text-[9px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded mt-1">
                                        Fórmula: Efi.Real = Efi.Base - Absenteísmo - Afastam.Legais
                                        <br />Atual: {eficienciaRealAjustada}%
                                    </div>
                                )}

                                {expandedEficiencia && (
                                    <div className="pt-3 pb-1 border-t border-slate-100 mt-2 space-y-3 animate-in slide-in-from-top-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px]"><span>Afastamentos Legais</span><span className="font-mono">{afastamentosLegais}%</span></div>
                                            <input type="range" min="0" max="15" value={afastamentosLegais} onChange={(e) => setAfastamentosLegais(Number(e.target.value))} className="w-full h-0.5 accent-amber-300" />
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span>Duração média (dias)</span>
                                            <input type="number" value={duracaoAfastamento} onChange={(e) => setDuracaoAfastamento(Number(e.target.value))} className="w-12 border rounded px-1 py-0.5 text-right font-mono text-slate-500" />
                                        </div>
                                        <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-900 border border-amber-100">
                                            Eficiência Real Calculada = <strong>{eficienciaRealAjustada}%</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* 5. ABSENTEÍSMO */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                        Absenteísmo <LabelIcon expanded={expandedAbsenteismo} setExpanded={setExpandedAbsenteismo} />
                                    </span>
                                    <span className="font-mono text-rose-500 font-bold">{absenteismo}%</span>
                                </div>
                                <input type="range" min="0" max="25" value={absenteismo} onChange={(e) => { setAbsenteismo(Number(e.target.value)); setCenarioAtivo('manual') }} className="w-full accent-rose-400 h-1" />

                                {modoDebug && (
                                    <div className="text-[9px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded mt-1">
                                        Fórmula: Custo = Absenteísmo% × Headcount × SalárioAnual (se Subs.Integral)
                                    </div>
                                )}

                                {expandedAbsenteismo && (
                                    <div className="pt-3 pb-1 border-t border-slate-100 mt-2 space-y-2 animate-in slide-in-from-top-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Política de Substituição</div>
                                        <div className="flex flex-col gap-1 text-[10px] text-slate-600">
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                <input type="radio" value="integral" checked={politicaSubst === 'integral'} onChange={() => setPoliticaSubst('integral')} />
                                                Substituição Integral (1:1)
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                <input type="radio" value="parcial" checked={politicaSubst === 'parcial'} onChange={() => setPoliticaSubst('parcial')} />
                                                Substituição Parcial (1:0.5)
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                <input type="radio" value="nenhuma" checked={politicaSubst === 'nenhuma'} onChange={() => setPoliticaSubst('nenhuma')} />
                                                Nenhum (impacta receita)
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* 6. CAPACIDADE & MECANIZAÇÃO */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                        Mecanização <LabelIcon expanded={expandedCapacidade} setExpanded={setExpandedCapacidade} />
                                    </span>
                                    <span className="font-mono text-blue-600 font-bold">{fatorMecanizacao}%</span>
                                </div>
                                <input type="range" min="0" max="80" value={fatorMecanizacao} onChange={(e) => { setFatorMecanizacao(Number(e.target.value)); setCenarioAtivo('manual') }} className="w-full accent-blue-500 h-1" />

                                {modoDebug && (
                                    <div className="text-[9px] font-mono text-slate-400 bg-slate-50 p-1.5 rounded mt-1">
                                        Fórmula: MultiplicadorDiasHomem = (100 - Mecanização%) / 100
                                    </div>
                                )}

                                {expandedCapacidade && (
                                    <div className="pt-3 pb-1 border-t border-slate-100 mt-2 space-y-3 animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span>Horas úteis reais/dia</span>
                                            <input type="number" min="4" max="12" value={horasUteisDia} onChange={(e) => setHorasUteisDia(Number(e.target.value))} className="w-12 border rounded px-1 py-0.5 text-right font-mono text-slate-500" />
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-3">Base Dias-Homem/ha</div>
                                        <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-slate-500">
                                            {Object.entries(DIAS_HOMEM).filter(([k]) => k !== 'Outros').map(([c, v]) => (
                                                <div key={c}>{c.substring(0, 3)}: {v}d/h</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* VISTÃO E TABELA */}
                        <div className="lg:col-span-3 space-y-6">

                            {/* Indicadores Consolidados (Ordem Corrigida) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* 1. Receita Total */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between relative z-10 hover:z-20">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Receita Total</span>
                                            {projecaoReceita !== null && (
                                                <div
                                                    className="w-2 h-2 rounded-full bg-emerald-500 cursor-pointer shadow-sm hover:scale-110 transition-transform"
                                                    title="Projeção Manual Ativa. Clique para limpar."
                                                    onClick={(e) => { e.stopPropagation(); setProjecaoReceita(null); }}
                                                />
                                            )}
                                        </div>
                                        <TrendingUp className="w-4 h-4 text-emerald-500/50" />
                                    </div>
                                    {isEditingReceita ? (
                                        <div className="flex items-center gap-1 min-h-[32px]">
                                            <span className="text-lg font-bold text-slate-400">R$</span>
                                            <input
                                                autoFocus
                                                type="number"
                                                className="w-full text-xl lg:text-2xl font-bold text-emerald-700 bg-transparent border-b-2 border-emerald-500 focus:outline-none focus:ring-0 px-0 py-0 m-0"
                                                value={receitaInputValue}
                                                onChange={(e) => setReceitaInputValue(e.target.value)}
                                                onBlur={() => {
                                                    const val = Number(receitaInputValue);
                                                    if (val > 0) {
                                                        setProjecaoReceita(val);
                                                    } else {
                                                        setProjecaoReceita(null);
                                                    }
                                                    setIsEditingReceita(false);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    } else if (e.key === 'Escape') {
                                                        setIsEditingReceita(false);
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className={`text-2xl font-bold text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors border-b border-dashed ${projecaoReceita ? 'border-emerald-300 text-emerald-800' : 'border-transparent hover:border-emerald-300'} w-fit`}
                                            onClick={() => {
                                                setReceitaInputValue(projecaoReceita ? projecaoReceita.toString() : totalReceita.toFixed(2));
                                                setIsEditingReceita(true);
                                                setCenarioAtivo('manual');
                                            }}
                                            title="Clique para ajustar a projeção manual"
                                        >
                                            {formatCurrency(totalReceita)}
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Projeção Anual</p>
                                </div>

                                {/* 2. Resultado Líquido */}
                                <div className="bg-white rounded-xl shadow-sm p-4 ring-2 ring-emerald-500 ring-offset-2 flex flex-col justify-between relative z-10 hover:z-20">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Resultado Líquido</span>
                                        <BarChart2 className={`w-4 h-4 ${totalMargem < 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                                    </div>
                                    <div className={`text-2xl font-black tracking-tight ${totalMargem < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {formatCurrency(totalMargem)}
                                    </div>
                                    <p className={`text-[10px] mt-1 uppercase font-bold ${totalMargem < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Lucro/Prejuízo Anual</p>
                                </div>

                                {/* 3. Custo Total Projetado */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between relative z-10 hover:z-20">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custo Projetado</span>
                                        <DollarSign className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalCustoSugerido)}</div>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Estimativa Anual</p>
                                </div>

                                {/* 4. Eficiência (Custo/Rec) */}
                                <div className="bg-slate-50 rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between relative z-10 hover:z-20">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Eficiência</span>
                                        <span className="text-[10px] font-bold text-slate-400">(Custo/Rec)</span>
                                    </div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        {mediaIndiceCusto.toFixed(1)}%
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Média Global do Ciclo</p>
                                </div>
                            </div>

                            {/* Tabela de Pivôs Detalhada */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-xl relative z-10 hover:z-[100] transition-all duration-300">
                                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 overflow-y-visible">
                                    <table className="min-w-full divide-y divide-gray-200 overflow-visible">
                                        <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-20">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase relative">
                                                    <Tooltip
                                                        title="🚜 Pivô / Cultura"
                                                        text="Identifica o pivô físico e a variedade plantada que rege o ciclo de receita."
                                                        formula="Ativo [ID] + Cultura [Manejo]"
                                                        interpretation="Ponto focal da análise de rentabilidade por talhão."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center gap-1">Pivô / Cultura <Info className="w-3 h-3 text-slate-400" /></div>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase relative">
                                                    <Tooltip
                                                        title="📐 Área Geográfica"
                                                        text="Extensão total produtiva do pivô em hectares."
                                                        formula="Σ Talhões Georreferenciados"
                                                        interpretation="Base para o cálculo de produtividade e headcount."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center justify-end gap-1">Área (ha) <Info className="w-3 h-3 text-slate-400" /></div>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase relative">
                                                    <Tooltip
                                                        title="👥 RH Atual"
                                                        text="Quantidade total de colaboradores alocados neste ativo hoje."
                                                        formula="Contagem de CPF ativos no Setor"
                                                        interpretation="Reflete a estrutura instalada real em campo."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center justify-end gap-1">RH Atual <Info className="w-3 h-3 text-slate-400" /></div>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50/50 relative">
                                                    <Tooltip
                                                        title="🤖 RH Modelado"
                                                        text="Dimensionamento ideal baseado em premissas de dias-homem, complexidade e mecanização."
                                                        formula="Área / Fator Cultural"
                                                        interpretation="Ponto de equilíbrio sugerido para máxima eficiência operacional."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center justify-end gap-1 text-indigo-700">Modelado <Info className="w-3 h-3 text-indigo-400" /></div>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase border-r border-slate-100 relative">
                                                    <Tooltip
                                                        title="⚖️ GAP de Mão de Obra"
                                                        text="Diferença absoluta entre o quadro real e o dimensionamento teórico modelado."
                                                        formula="RH Atual - RH Modelado"
                                                        interpretation="Negativo indica falta (risco); Positivo indica excesso (ociosidade)."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center justify-end gap-1">GAP RH <Info className="w-3 h-3 text-slate-400" /></div>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase relative">
                                                    <Tooltip
                                                        title="💰 Custo Indireto Est."
                                                        text="Projeção de gastos com insumos, defensivos e operacionalização por hectare."
                                                        formula="Área * Custo Insumos/ha"
                                                        interpretation="Estimativa de desembolso necessário para o ciclo produtivo."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center justify-end gap-1">Custo Ind. <Info className="w-3 h-3 text-slate-400" /></div>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-emerald-700 uppercase relative">
                                                    <Tooltip
                                                        title="📈 Receita Estimada"
                                                        text="Venda bruta projetada baseada no rendimento esperado e otimismo do mercado."
                                                        formula="Área * Preço * Rendimento"
                                                        interpretation="Potencial de faturamento bruto para o período simulado."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center justify-end gap-1 text-emerald-700">Receita Est. <Info className="w-3 h-3 text-emerald-500/50" /></div>
                                                    </Tooltip>
                                                </th>
                                                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-900 uppercase pr-8 relative">
                                                    <Tooltip
                                                        title="📊 Margem Bruta Est."
                                                        text="Resultado financeiro líquido após a subtração de todos os custos diretos."
                                                        formula="Receita - (Custo RH + Custo Ind.)"
                                                        interpretation="Indicador final de rentabilidade e viabilidade do pivô."
                                                        position="bottom"
                                                    >
                                                        <div className="flex items-center justify-end gap-1 text-slate-900">Margem <Info className="w-3 h-3 text-slate-400" /></div>
                                                    </Tooltip>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {simulationResults.map(p => {
                                                const isExpanded = expandedRows.includes(p.pivo_nome);
                                                return (
                                                    <React.Fragment key={p.pivo_nome}>
                                                        <tr
                                                            className={`transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                                                            onClick={() => toggleRow(p.pivo_nome)}
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                                                    {p.pivo_nome}
                                                                </div>
                                                                {!p.isCulturaDefinida ? (
                                                                    <div className="text-[10px] text-amber-600 font-medium bg-amber-50 border border-amber-200 inline-flex items-center gap-1 px-1.5 rounded mt-1">
                                                                        <AlertCircle className="w-3 h-3" /> Cultura não ligada
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 inline-block px-1.5 rounded mt-1">
                                                                        {p.culturaKey}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">{p.area_ha.toFixed(1)}</td>

                                                            {/* RH Atual */}
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="text-xs font-medium text-slate-700">{p.atual} {p.atual === 1 ? 'pessoa' : 'pessoas'}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatCurrency(p.custoTotalRealRH)}</div>
                                                            </td>

                                                            {/* RH Modelado */}
                                                            <td className="px-4 py-3 text-right bg-indigo-50/30">
                                                                <div className="text-xs font-bold text-indigo-900">{p.necessidade} {p.necessidade === 1 ? 'pessoa' : 'pessoas'}</div>
                                                                <div className="text-[10px] text-rose-600/80 font-mono font-medium mt-0.5">{formatCurrency(p.custoTotalSugeridoRH)}</div>
                                                            </td>

                                                            {/* GAP RH */}
                                                            <td className="px-4 py-3 text-right border-r border-slate-100">
                                                                {p.gapPessoas === 0 ? (
                                                                    <>
                                                                        <div className="text-xs font-bold text-emerald-600">Alinhado</div>
                                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">-</div>
                                                                    </>
                                                                ) : p.gapPessoas > 0 ? (
                                                                    <>
                                                                        <div className="text-xs font-bold text-sky-600">Falha {p.gapPessoas}</div>
                                                                        <div className="text-[10px] text-sky-500 font-mono mt-0.5">+ {formatCurrency(Math.abs(p.gapFinanceiro))}</div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="text-xs font-bold text-rose-500">Sobra {Math.abs(p.gapPessoas)}</div>
                                                                        <div className="text-[10px] text-emerald-600 font-mono mt-0.5">- {formatCurrency(Math.abs(p.gapFinanceiro))}</div>
                                                                    </>
                                                                )}
                                                            </td>

                                                            {/* Custo Insumos */}
                                                            <td className="px-4 py-3 text-right text-xs font-mono text-rose-600/70">
                                                                {formatCurrency(p.custoOpAgricola)}
                                                            </td>

                                                            {/* Receita */}
                                                            <td className="px-4 py-3 text-right text-xs font-mono font-bold text-emerald-600">
                                                                {formatCurrency(p.receitaTotal)}
                                                            </td>

                                                            {/* Margem */}
                                                            <td className="px-4 py-3 text-right text-xs font-mono font-bold pr-8">
                                                                <span className={p.margemOperacional < 0 ? 'text-rose-600' : 'text-slate-900'}>
                                                                    {formatCurrency(p.margemOperacional)}
                                                                </span>
                                                            </td>
                                                        </tr>

                                                        {modoDebug && isExpanded && (
                                                            <tr className="bg-slate-900 text-slate-300 font-mono text-[10px]">
                                                                <td colSpan={8} className="p-4">
                                                                    <div className="grid grid-cols-3 gap-4">
                                                                        <div>
                                                                            <strong className="text-white block mb-1">Passo 1: Esforço Agronômico</strong>
                                                                            Área: {p.area_ha.toFixed(1)} ha<br />
                                                                            Cultura ({p.culturaChave}): {DIAS_HOMEM[p.culturaChave as keyof typeof DIAS_HOMEM] || 50} d/ha<br />
                                                                            ICO multiplicador: {icoGlobal.toFixed(2)}x<br />
                                                                            HorasUteis mult: (8/{horasUteisDia}) = {(8 / horasUteisDia).toFixed(2)}x<br />
                                                                            Mecanização multi: {(100 - fatorMecanizacao) / 100}x<br />
                                                                            = Dias Absolutos: {(p.area_ha * (DIAS_HOMEM[p.culturaChave as keyof typeof DIAS_HOMEM] || 50) * icoGlobal * (8 / horasUteisDia) * ((100 - fatorMecanizacao) / 100)).toFixed(1)}
                                                                        </div>
                                                                        <div>
                                                                            <strong className="text-white block mb-1">Passo 2: Conversão Humana</strong>
                                                                            Dias úteis anuais alvo: 264 d/a<br />
                                                                            Eficiência Base Equipe: {eficienciaBase}%<br />
                                                                            Desconto Absenteísmo Real: -{absenteismo}%<br />
                                                                            Desconto Afast Legais: -{afastamentosLegais}%<br />
                                                                            Métrica final divisória: 264 × ({eficienciaRealAjustada}/100) = {(264 * (eficienciaRealAjustada / 100)).toFixed(1)} d/a<br />
                                                                            <strong className="text-amber-400">Pessoas Raw: {p.necessidadeRaw.toFixed(3)}</strong>
                                                                        </div>
                                                                        <div>
                                                                            <strong className="text-white block mb-1">Passo 3: Custos Envolvidos</strong>
                                                                            Teto Receita: R$ {receitaMinMax[p.culturaChave]?.max || '?'}<br />
                                                                            Piso Receita: R$ {receitaMinMax[p.culturaChave]?.min || '?'}<br />
                                                                            Interpolador: {otimismoMercado}%<br />
                                                                            Custo Insumos: {custoOperacionalPerc}% da Rec.Total<br />
                                                                            Custo por Extra/Absenteísmo: {formatCurrency(p.custoAbsenteismoAdicional)}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}

                                                        {/* Accordion Expandido */}
                                                        {isExpanded && !modoDebug && (
                                                            <tr className="bg-slate-50/80 border-b border-t border-slate-200">
                                                                <td colSpan={8} className="p-0">
                                                                    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-200">

                                                                        <div className="space-y-2">
                                                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">Métricas de Área</h4>
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-slate-600">Receita por hectare:</span>
                                                                                <span className="font-mono font-medium">{formatCurrency(p.recHectare)}/ha</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-slate-600">Custo Ref. por hectare:</span>
                                                                                <span className="font-mono font-medium text-rose-600">{formatCurrency(p.custoFinalSugerido / p.area_ha)}/ha</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-slate-200">
                                                                                <span className="text-slate-800 font-bold">Margem Percentual:</span>
                                                                                <span className="font-mono font-bold">{p.margemPercentual.toFixed(1)}%</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1">Desempenho Laboral</h4>
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-slate-600">Receita Gerada/Pessoa:</span>
                                                                                <span className="font-mono font-medium text-emerald-600">{formatCurrency(p.receitaTotal / (p.necessidade || 1))}</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-xs">
                                                                                <span className="text-slate-600">Custo Laboral/Pessoa:</span>
                                                                                <span className="font-mono font-medium text-rose-600">{formatCurrency(custoAnualPessoa)}</span>
                                                                            </div>
                                                                            <div className="flex justify-between text-xs mt-1 pt-1 border-t border-slate-200">
                                                                                <span className="text-slate-800 font-bold">ROI do Trabalhador:</span>
                                                                                <span className="font-mono font-bold">{((p.receitaTotal / (p.necessidade || 1)) / custoAnualPessoa).toFixed(1)}x</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                                            <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-1 mb-2 flex items-center gap-1">
                                                                                <Settings2 className="w-3 h-3" /> Teste de Estresse (± 1 Pessoa)
                                                                            </h4>
                                                                            <div className="flex justify-between items-center text-xs">
                                                                                <span className="text-rose-600 font-medium">+1 contratação:</span>
                                                                                <div className="text-right">
                                                                                    <div className="font-mono text-rose-700">Custo +{formatCurrency(custoAnualPessoa)}</div>
                                                                                    <div className="text-[9px] text-slate-400">Nova Margem: {formatCurrency(p.margemOperacional - custoAnualPessoa)}</div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-100">
                                                                                <span className="text-emerald-600 font-medium">-1 demissão:</span>
                                                                                <div className="text-right">
                                                                                    <div className="font-mono text-emerald-700">Gera +{formatCurrency(custoAnualPessoa)}</div>
                                                                                    <div className="text-[9px] text-slate-400">Nova Margem: {formatCurrency(p.margemOperacional + custoAnualPessoa)}</div>
                                                                                </div>
                                                                            </div>
                                                                            {p.custoAbsenteismoAdicional > 0 && (
                                                                                <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] text-amber-700 leading-tight">
                                                                                    ⚠️ Custa <strong>{formatCurrency(p.custoAbsenteismoAdicional)}</strong> extras ao ano manter a política atual de substituição por absenteísmo para esta equipe de {p.necessidade}.
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                            <tr>
                                                <td className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Totais da Simulação</td>
                                                <td className="px-5 py-3"></td>
                                                <td className="px-5 py-3 text-right text-xs font-mono text-slate-700 font-bold">{simulationResults.reduce((s, p) => s + p.atual, 0)} p</td>
                                                <td className="px-5 py-3 text-right text-xs font-mono text-indigo-800 font-bold">{simulationResults.reduce((s, p) => s + p.necessidade, 0)} p</td>
                                                <td colSpan={2}></td>
                                                <td className="px-5 py-3 text-right text-xs font-mono font-bold text-emerald-700">{formatCurrency(totalReceita)}</td>
                                                <td className="px-5 py-3 text-right text-xs font-mono font-bold text-slate-900 pr-8">{formatCurrency(totalMargem)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA METODOLOGIA (BASE TÉCNICA) */}
            {activeTab === 'metodologia' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <BaseTecnicaCompleta />
                </div>
            )}
        </div>
    );
};

// ─── COMPONENTES AUXILIARES ────────────────────────────────────────────────
const TagBadge: React.FC<{ text: string; cor: string; key?: string | number }> = ({ text, cor }) => (
    <span style={{ 
        background: `${cor}18`, 
        color: cor, 
        border: `1px solid ${cor}30`, 
        borderRadius: '4px', 
        padding: '2px 8px', 
        fontSize: '10px', 
        fontWeight: 700 
    }}>
        {text}
    </span>
);

// ─── COMPONENTE BASE TÉCNICA COMPLETA ──────────────────────────────────────
const BaseTecnicaCompleta: React.FC = () => {
    const [secAtiva, setSecAtiva] = useState("receita");
    const [search, setSearch] = useState("");
    const [abertos, setAbertos] = useState<Record<string, boolean>>({});

    const C = {
        bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
        text: "#0f172a", sub: "#64748b", muted: "#94a3b8",
        green: "#16a34a", blue: "#2563eb", amber: "#d97706",
        red: "#dc2626", purple: "#7c3aed", orange: "#ea580c",
    };

    const baseSecoes = [
        {
            id: "receita", icon: "📈", cor: C.green, titulo: "Motor de Receita",
            items: [
                {
                    label: "Receita Estimada por Pivô",
                    formula: "Área (ha) × Preço (R$/saca) × Rendimento (sc/ha)",
                    desc: "Venda bruta projetada interpolada pelo slider de Otimismo de Mercado entre MIN e MAX histórico.",
                    ex: "82,2 ha × R$70.000/ha = R$5.750.500 (GR 14, otimismo 50%)",
                    tags: ["Área Georreferenciada", "Preço Interpolado", "Rendimento"]
                },
                {
                    label: "Interpolação de Mercado (Otimismo)",
                    formula: "Receita = MIN + ((MAX − MIN) × (Otimismo / 100))",
                    desc: "Slider executa interpolação linear. 0% = mercado colapsado (MIN). 100% = escassez máxima (MAX).",
                    ex: "MIN R$40k/ha, MAX R$100k/ha, Otimismo 50% → R$70k/ha",
                    tags: ["Slider Otimismo", "MIN histórico", "MAX histórico"]
                },
                {
                    label: "Receita Total Global",
                    formula: "Σ Receita Estimada de todos os pivôs ativos",
                    desc: "Soma de todas as receitas individuais. Exibida como Projeção Anual no Laboratório de Cenários.",
                    ex: "372 pivôs × média R$4,3M = ~R$1,595 bilhão",
                    tags: ["Soma Global", "Projeção Anual"]
                },
            ]
        },
        {
            id: "rh", icon: "👷", cor: C.blue, titulo: "Dimensionamento RH",
            items: [
                {
                    label: "Necessidade Bruta de RH (Raw)",
                    formula: "NecessidadeRaw = (Área × ICO) / FatorCultural",
                    desc: "Ponto de equilíbrio teórico de pessoas antes de qualquer desconto. ICO multiplica o esforço bruto.",
                    ex: "82,2 ha × ICO 1,0 / FatorCultural 50 d/ha → base para conversão",
                    tags: ["ICO", "Fator Cultural", "Dias-Homem"]
                },
                {
                    label: "Dias Absolutos de Trabalho",
                    formula: "DiasAbsolutos = Área × FatorCultural × ICO × HorasUteis(8/8) × Mecanização",
                    desc: "Volume total de dias-homem necessários para operar o pivô no ciclo anual.",
                    ex: "82,2 × 50 × 1,0 × 1,0 × 1 = 4.107,5 dias absolutos",
                    tags: ["Dias-Homem", "Ciclo Anual", "Mecanização"]
                },
                {
                    label: "Conversão para Pessoas (RH Modelado)",
                    formula: "Pessoas = DiasAbsolutos / (DiasUteis × Eficiência × (1−Absenteísmo%) × (1−Afastamento%))",
                    desc: "Converte dias em número real de pessoas com todos os descontos de eficiência e ausências.",
                    ex: "4.107,5 / (264 × 0,95 × 0,98) ≈ 16,73 → arredonda para 17 pessoas",
                    tags: ["Eficiência Equipe", "Absenteísmo", "Afastamentos Legais"]
                },
            ]
        },
        {
            id: "custo", icon: "💰", cor: C.amber, titulo: "Estrutura de Custos",
            items: [
                {
                    label: "Custo por Pessoa (com Encargos)",
                    formula: "Custo = Salário × (1 + INSS% + FGTS% + RAT% + Terceiros% + Férias% + 13°% + Adicionais%)",
                    desc: "Custo real mensal com todos os encargos. Percentuais configuráveis na aba Configurações Legais.",
                    ex: "R$1.621 × (1 + 0,20 + 0,08 + 0,02 + 0,058 + 0,1111 + 0,0833) ≈ R$2.508,89/pessoa",
                    tags: ["INSS Empresa", "FGTS", "RAT", "Férias", "13°"]
                },
                {
                    label: "Custo de Insumos por Pivô",
                    formula: "CustoInsumos = ReceitaEstimada × (Insumos% / 100)",
                    desc: "Custo variável calculado como percentual da receita. Controlado pelo slider Custo Insumos.",
                    ex: "R$5.750.500 × 60% = R$3.450.300 (GR 14 com slider em 60%)",
                    tags: ["Insumos%", "Custo Variável", "Slider Insumos"]
                },
                {
                    label: "Custo Projetado Global",
                    formula: "CustoTotal = Σ CustoInsumos (todos os pivôs) + FolhaPagamento",
                    desc: "Soma dos custos de insumos de todos os pivôs acrescido da folha de pagamento projetada.",
                    ex: "~R$989M insumos + R$120M folha ≈ R$1,109 bilhão",
                    tags: ["Custo Total", "Estimativa Anual"]
                },
            ]
        },
        {
            id: "resultado", icon: "📊", cor: C.purple, titulo: "Resultado & Eficiência",
            items: [
                {
                    label: "Resultado Líquido (Lucro/Prejuízo)",
                    formula: "ResultadoLíquido = ReceitaTotal − CustoProjetadoTotal",
                    desc: "Lucro ou prejuízo anual projetado. Verde = lucro. Vermelho = prejuízo.",
                    ex: "R$1,595B − R$1,109B = R$485.526.950,81 (lucro)",
                    tags: ["Receita Total", "Custo Projetado", "Lucro Anual"]
                },
                {
                    label: "Eficiência Global (Custo/Receita)",
                    formula: "Eficiência% = (CustoProjetado / ReceitaTotal) × 100",
                    desc: "Percentual da receita consumido pelos custos. Quanto menor, mais eficiente a operação.",
                    ex: "R$1,109B / R$1,595B × 100 = 69,6%",
                    tags: ["Eficiência Operacional", "Custo/Receita"]
                },
                {
                    label: "ROI do Trabalhador",
                    formula: "ROI = ReceitaGerada/Pessoa ÷ CustoLaboral/Pessoa",
                    desc: "Quantas vezes cada trabalhador paga seu próprio custo em receita gerada.",
                    ex: "R$338.264,71 / R$30.197,28 = 11,2x (GR 14)",
                    tags: ["ROI", "Eficiência Laboral", "Produtividade"]
                },
            ]
        },
        {
            id: "absenteismo", icon: "🩹", cor: C.red, titulo: "Absenteísmo & Políticas",
            items: [
                {
                    label: "Política: Substituição Integral",
                    formula: "CustoExtra = FolhaMensal × (Absenteísmo% / 100)",
                    desc: "Toda falta é coberta por contratação. Custo do absenteísmo entra direto no orçamento salarial.",
                    ex: "R$2.508.891 × 5% = +R$125.444/mês adicionais à folha",
                    tags: ["Substituição", "Custo Adicional", "Budget"]
                },
                {
                    label: "Política: Absorção (Sem Reposição)",
                    formula: "DescontoReceita = ReceitaPivô × (Absenteísmo% / 100)",
                    desc: "Sem reposição, área operacional decai e produtividade atrofia — desconto na receita do pivô.",
                    ex: "R$5.750.500 × 5% = −R$287.525 de receita perdida",
                    tags: ["Absorção", "Perda de Receita", "Produtividade"]
                },
                {
                    label: "Impacto Financeiro por Falta",
                    formula: "Impacto = (SalárioDia + Encargos) + PerdaProdutivida",
                    desc: "Custo direto e indireto de uma ausência não planejada.",
                    ex: "Falta de 1 operador → R$450 de impacto diário",
                    tags: ["Custo Direto", "Perda Operacional"]
                }
            ]
        },
        {
            id: "ico", icon: "⚙️", cor: C.orange, titulo: "ICO — Complexidade",
            items: [
                {
                    label: "O que é o ICO",
                    formula: "ICO = multiplicador entre 0,5x e 2,0x",
                    desc: "Índice de Complexidade Operacional. Age como super-multiplicador no esforço bruto da cultura.",
                    ex: "ICO 1,5x transforma necessidade de 17 pessoas em 25,5 → 26 pessoas",
                    tags: ["Multiplicador", "Esforço Bruto", "Cultura / Clima"]
                },
                {
                    label: "ICO na Capacidade Ajustada",
                    formula: "CapAjustada = CapBase + ICO + (Eficiência / 100)",
                    desc: "Na tela Diagnóstico Estrutural, ICO compõe a Capacidade Ajustada global.",
                    ex: "40 ha/p + ICO 1 + (90/100) = 44,44 ha/p ajustada",
                    tags: ["Capacidade Ajustada", "Diagnóstico Estrutural"]
                },
                {
                    label: "Índice de Eficiência Estrutural (IEE)",
                    formula: "IEE = (RH Atual / RH Modelado Global) × 100",
                    desc: "Compara RH real instalado com dimensionamento ideal. 100% = perfeito.",
                    ex: "997 / 1.503 × 100 ≈ 66,3% (Real vs Recomendado)",
                    tags: ["IEE", "Real vs Recomendado", "Diagnóstico Estrutural"]
                },
            ]
        },
    ];

    const toggle = (key: string) => setAbertos(prev => ({ ...prev, [key]: !prev[key] }));

    const secFiltrada = search.trim()
        ? baseSecoes.map(s => ({
            ...s, items: s.items.filter(it =>
                it.label.toLowerCase().includes(search.toLowerCase()) ||
                it.formula.toLowerCase().includes(search.toLowerCase()) ||
                it.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
            )
        })).filter(s => s.items.length > 0)
        : [baseSecoes.find(s => s.id === secAtiva)!];

    return (
        <div style={{ background: C.bg, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            {/* HEADER INTERNO */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '20px 28px' }}>
                <div style={{ fontSize: '11px', color: C.sub, fontWeight: 700, letterSpacing: '2px', marginBottom: '4px' }}>
                    AGRICONTROL · ESTUDOS INTEGRADOS
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: C.text, margin: 0 }}>
                    📊 Central de Inteligência Técnica
                </h2>
                <p style={{ fontSize: '12px', color: C.sub, marginTop: '4px' }}>
                    Mercado · RH & Produtividade · Base Técnica — Memória de Cálculo v3
                </p>
            </div>

            <div style={{ padding: '24px' }}>
                {/* BUSCA */}
                <div style={{ marginBottom: '24px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar fórmula, métrica ou tag..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            maxWidth: '360px',
                            padding: '12px 16px',
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: '10px',
                            fontSize: '14px',
                            color: C.text,
                            outline: 'none',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                        }}
                    />
                </div>

                {/* TABS DE SEÇÃO (Apenas quando não está buscando) */}
                {!search && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', borderBottom: `1px solid ${C.border}`, paddingBottom: '1px' }}>
                        {baseSecoes.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSecAtiva(s.id)}
                                style={{
                                    padding: '10px 16px',
                                    border: 'none',
                                    borderBottom: secAtiva === s.id ? `3px solid ${s.cor}` : '3px solid transparent',
                                    background: 'transparent',
                                    color: secAtiva === s.id ? s.cor : C.sub,
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>{s.icon}</span> {s.titulo}
                            </button>
                        ))}
                    </div>
                )}

                {/* CONTEÚDO FILTRADO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {secFiltrada.map(sec => (
                        <div key={sec.id}>
                            {search && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 12px', padding: '4px 0' }}>
                                    <span style={{ fontSize: '18px' }}>{sec.icon}</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.text, margin: 0 }}>{sec.titulo}</h3>
                                    <div style={{ flex: 1, height: '1px', background: C.border, marginLeft: '8px' }} />
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {sec.items.map((item, idx) => {
                                    const key = `${sec.id}-${idx}`;
                                    const isOpen = abertos[key];
                                    return (
                                        <div 
                                            key={key} 
                                            style={{ 
                                                background: C.card, 
                                                border: `1px solid ${isOpen ? sec.cor : C.border}`, 
                                                borderRadius: '12px', 
                                                overflow: 'hidden',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div 
                                                onClick={() => toggle(key)}
                                                style={{ 
                                                    padding: '16px 20px', 
                                                    cursor: 'pointer', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sec.cor }} />
                                                    <span style={{ fontWeight: 700, fontSize: '14px', color: C.text }}>{item.label}</span>
                                                </div>
                                                <span style={{ color: C.muted, fontSize: '16px' }}>{isOpen ? '▲' : '▼'}</span>
                                            </div>
                                            
                                            {isOpen && (
                                                <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.border}50` }}>
                                                    <div style={{ marginTop: '16px' }}>
                                                        <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FÓRMULA</div>
                                                        <div style={{ 
                                                            background: `${C.bg}`, 
                                                            borderLeft: `4px solid ${sec.cor}`, 
                                                            padding: '12px 16px', 
                                                            borderRadius: '4px',
                                                            fontFamily: 'monospace',
                                                            fontSize: '13px',
                                                            color: sec.cor,
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {item.formula}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginTop: '16px' }}>
                                                        <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESCRIÇÃO</div>
                                                        <p style={{ fontSize: '13px', color: C.text, lineHeight: '1.6', margin: 0 }}>{item.desc}</p>
                                                    </div>

                                                    <div style={{ marginTop: '16px', background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px' }}>
                                                        <div style={{ fontSize: '10px', color: C.amber, fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EXEMPLO</div>
                                                        <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{item.ex}</div>
                                                    </div>

                                                    <div style={{ marginTop: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {item.tags.map(t => <TagBadge key={t} text={t} cor={sec.cor} />)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* RODAPÉ */}
                <div style={{ marginTop: '32px', padding: '16px 0', borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: C.sub, fontWeight: 500 }}>
                        AgriControl · Base Técnica v3 · 18 fórmulas documentadas · Clique em qualquer item para expandir
                    </span>
                </div>
            </div>
        </div>
    );
};

export default StrategicSimulationPage;
