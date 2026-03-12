import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MapComponent, { MapComponentHandle } from '../components/MapComponent';
import { Pivot, Poligonal, Colaborador, ConfiguracoesLegais, Cultura } from '../types';
import StatCard from '../components/StatCard';
import { Users, DollarSign, Map as MapIcon, Plus, Layers, Search, Crosshair, Info, AlertCircle, Edit2, X, Check } from 'lucide-react';
import PivotCreationModal from '../components/PivotCreationModal';
import DrawerDetalhesPivo from '../components/DrawerDetalhesPivo';
import { calcularCustoPivo } from '../utils/custoOperacional';

const DashboardPage: React.FC = () => {
  const [pivots, setPivots] = useState<Pivot[]>([]);
  const [poligonais, setPoligonais] = useState<Poligonal[]>([]);
  const [pivosGeo, setPivosGeo] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  // Normalização agressiva para garantir matching entre pivos e pivos_geo
  const robustNormalize = (name: string) => {
    if (!name) return '';
    let n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); // Remove acentos e minúsculo
    n = n.replace(/[^a-z0-9]/g, ''); // Remove caracteres não alfanuméricos
    // Pivo01 -> pivo1, pivo005 -> pivo5 (remove zeros à esquerda em blocos numéricos)
    n = n.replace(/([^0-9])0+([1-9])/g, '$1$2').replace(/([^0-9])0+(0)/g, '$1$2');
    return n;
  };
  const [legalSettings, setLegalSettings] = useState<ConfiguracoesLegais | null>(null);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [serverCounts, setServerCounts] = useState<{ pivots: number; pivosGeo: number }>({ pivots: 0, pivosGeo: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHeatmapTooltip, setShowHeatmapTooltip] = useState(false);

  // Pivot Management State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPivot, setSelectedPivot] = useState<Pivot | null>(null);
  const [selectedGeo, setSelectedGeo] = useState<any | null>(null); // pivô KML clicado
  const [geoTab, setGeoTab] = useState<'resumo' | 'colab' | 'sim'>('resumo');
  // Simulation State
  const [simulacaoTemp, setSimulacaoTemp] = useState<Record<string, number>>({});
  const [geoSimOffset, setGeoSimOffset] = useState<number>(0);

  // Rename states
  const [editingGeoId, setEditingGeoId] = useState<string | null>(null);
  const [editGeoNameValue, setEditGeoNameValue] = useState<string>('');

  const parsePivoName = (fullName: string) => {
    const parts = (fullName || '').split('-');
    if (parts.length > 1) {
      const original = parts[0].trim();
      const editable = parts.slice(1).join('-').trim();
      return { original, editable };
    }
    return { original: fullName.trim(), editable: '' };
  };

  const handleEditGeoClick = (geo: any) => {
    const { editable } = parsePivoName(geo.nome);
    setEditingGeoId(geo.id);
    setEditGeoNameValue(editable);
  };

  const handleSaveGeoName = async (geo: any, pivotInfo?: any) => {
    const { original } = parsePivoName(geo.nome);
    const newName = editGeoNameValue.trim() ? `${original}-${editGeoNameValue}` : original;

    try {
      // Atualiza pivos_geo
      await fetch(`/api/pivos-geo/${geo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newName })
      });

      // Se esse pivo tem um cadastro na tabela de pivos, atualiza la também para nao quebrar a vinculação
      if (pivotInfo && pivotInfo.pivo_id && !pivotInfo.pivo_id.startsWith('geo-')) {
        await fetch(`/api/pivots/${pivotInfo.pivo_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: newName })
        });
      }

      // Atualiza na view atualizando o geo local
      setSelectedGeo({ ...geo, nome: newName });

      // Recarrega todos pra garantir q o Map seja redesenhado
      fetchData();

      setEditingGeoId(null);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar nome.');
    }
  };

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPivots, setFilteredPivots] = useState<Pivot[]>([]);
  const mapRef = useRef<MapComponentHandle>(null);

  const fetchData = useCallback(async () => {
    try {
      console.log('[Dashboard]: Buscando dados da API...');
      const [pivotsRes, poligonaisRes, colabRes, legalRes, pivosGeoRes, culturasRes] = await Promise.all([
        fetch('/api/pivots'),
        fetch('/api/poligonais'),
        fetch('/api/colaboradores'),
        fetch('/api/configuracoes-legais'),
        fetch('/api/pivos-geo'),
        fetch('/api/culturas')
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

      const [pivotData, poligonaisData, colaboradoresData, legalData, pgeoData, culturesData] = await Promise.all([
        safeJson(pivotsRes),
        safeJson(poligonaisRes),
        safeJson(colabRes),
        safeJson(legalRes),
        safeJson(pivosGeoRes),
        safeJson(culturasRes)
      ]);

      if (pivotData && typeof pivotData === 'object' && 'data' in pivotData) {
        setPivots(pivotData.data);
        setServerCounts(prev => ({ ...prev, pivots: pivotData.count || 0 }));
      } else if (Array.isArray(pivotData)) {
        setPivots(pivotData);
      } else {
        setPivots([]);
      }

      if (Array.isArray(poligonaisData)) setPoligonais(poligonaisData);
      else setPoligonais([]);

      if (Array.isArray(colaboradoresData)) setColaboradores(colaboradoresData);
      else setColaboradores([]);

      if (legalData) {
        setLegalSettings(legalData);
      }

      if (pgeoData && typeof pgeoData === 'object' && 'data' in pgeoData) {
        setPivosGeo(pgeoData.data);
        setServerCounts(prev => ({ ...prev, pivosGeo: pgeoData.count || 0 }));
      } else if (Array.isArray(pgeoData)) {
        setPivosGeo(pgeoData);
      }

      if (Array.isArray(culturesData)) setCulturas(culturesData);
    } catch (err: any) {
      console.error('[Dashboard]: Falha crítica no fetch:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Unificação de Dados (Master List) ─────────────────────────────────────
  // Combina pivos (cadastrados) e pivos_geo (geometrias) em um único conjunto.
  const unifiedPivots = useMemo(() => {
    // 1. Criar mapa de pivos_geo por nome robustamente normalizado
    const geoMap = new Map<string, any>();
    pivosGeo.forEach(g => {
      const key = robustNormalize(g.nome);
      if (key) geoMap.set(key, g);
    });

    // 2. Criar lista unificada partindo da tabela 'pivos' (fonte da verdade de contagem)
    const result: any[] = [];
    const matchedGeoNames = new Set<string>();

    pivots.forEach(p => {
      const nameKey = robustNormalize(p.pivo_nome);
      const matchedGeo = geoMap.get(nameKey);

      if (matchedGeo) {
        matchedGeoNames.add(robustNormalize(matchedGeo.nome));
      }

      // Herança de posição/geometria caso a tabela master (pivos) não tenha coordenadas
      let position = p.position;
      if (!position && matchedGeo) {
        if (matchedGeo.centro && Array.isArray(matchedGeo.centro)) {
          position = { type: 'Point', coordinates: [matchedGeo.centro[1], matchedGeo.centro[0]] };
        } else if (matchedGeo.geometry && matchedGeo.geometry.coordinates && matchedGeo.geometry.type === 'Point') {
          position = matchedGeo.geometry;
        }
      }

      result.push({
        ...p,
        area_ha: p.area_ha || Number(matchedGeo?.area_ha) || 0,
        position: position,
        is_imported: !!matchedGeo,
        is_cadastrado: true,
        geo_data: matchedGeo
      });
    });

    // 3. Adicionar pivos_geo Orfãos (Só geometria, sem registro na tabela master)
    // Estes aparecem no mapa mas NÃO são contados como pivos ativos nos indicadores principais.
    pivosGeo.forEach(g => {
      const nameKey = robustNormalize(g.nome);
      if (!matchedGeoNames.has(nameKey)) {
        let position = null;
        if (g.centro && Array.isArray(g.centro)) {
          position = { type: 'Point', coordinates: [g.centro[1], g.centro[0]] };
        } else if (g.geometry && g.geometry.coordinates && g.geometry.type === 'Point') {
          position = g.geometry;
        }

        result.push({
          pivo_id: `geo-${nameKey}`,
          pivo_nome: g.nome,
          area_ha: Number(g.area_ha) || 0,
          headcount: 0,
          custo_total_calculado: 0,
          position: position,
          is_imported: true,
          is_cadastrado: false, // Define como não cadastrado (órfão)
          geo_data: g
        });
      }
    });

    return result;
  }, [pivots, pivosGeo]);

  // ─── Estado inicial inteligente ────────────────────────────────────────────
  //
  // 1) Garante salário mínimo para colaboradores sem salário definido
  // 2) Distribui colaboradores sem pivô vinculado de forma automática (simulação)
  const colaboradoresNormalizados = useMemo(() => {
    const salarioRef = legalSettings?.salario_minimo || 1621;

    // Separa colaboradores com e sem pivô
    const comPivo = colaboradores.filter(c => c.pivo_nome);
    const semPivo = colaboradores.filter(c => !c.pivo_nome);

    // Distribui os sem-pivô de forma round-robin nos pivôs disponíveis
    const distribuidos = semPivo.map((c, idx) => ({
      ...c,
      pivo_nome: unifiedPivots.length > 0 ? unifiedPivots[idx % unifiedPivots.length].pivo_nome : c.pivo_nome,
      salario_base: c.salario_base || salarioRef,
    }));

    // Garante salário válido nos colaboradores com pivô
    const comPivoNorm = comPivo.map(c => ({
      ...c,
      salario_base: c.salario_base || salarioRef,
    }));

    return [...comPivoNorm, ...distribuidos];
  }, [colaboradores, unifiedPivots, legalSettings]);

  // ─── Cálculo de custo simulado (usa master list unificada) ──────────────────
  const simulatedPivots = useMemo(() => {
    const config = legalSettings || {
      salario_minimo: 1621,
      adicionais_percentual: 0,
      inss_empresa_percentual: 20,
      fgts_percentual: 8,
      rat_percentual: 2,
      terceiros_percentual: 5.8,
      provisao_ferias_percentual: 11.11,
      provisao_13_percentual: 8.33
    };
    const salarioRef = config.salario_minimo || 1621;
    const encargosPercentual =
      config.inss_empresa_percentual + config.fgts_percentual +
      config.rat_percentual + config.terceiros_percentual +
      config.provisao_ferias_percentual + config.provisao_13_percentual;

    return unifiedPivots.map(p => {
      // Usa colaboradores normalizados (com distribuição e salário preenchidos)
      const pivotColabs = colaboradoresNormalizados.filter(c => c.pivo_nome === p.pivo_nome);

      const realHeadcount = pivotColabs.length > 0 ? pivotColabs.length : (p.headcount || 0);
      const simulatedDelta = simulacaoTemp[p.pivo_id] || 0;
      const simulatedHeadcount = Math.max(0, realHeadcount + simulatedDelta);

      const avgSalary = pivotColabs.length > 0
        ? pivotColabs.reduce((sum, c) => sum + (c.salario_base || salarioRef), 0) / pivotColabs.length
        : salarioRef;

      const { custoTotal, custoPorHectare } = calcularCustoPivo({
        headcount: simulatedHeadcount,
        salarioBase: avgSalary,
        adicionaisPercentual: config.adicionais_percentual,
        encargosPercentual,
        areaHa: p.area_ha || 1
      });

      return {
        ...p,
        headcount: simulatedHeadcount,
        custo_total_calculado: custoTotal,
        custo_por_hectare: custoPorHectare
      };
    });
  }, [unifiedPivots, colaboradoresNormalizados, legalSettings, simulacaoTemp]);

  // Validação no console
  useEffect(() => {
    if (!loading) {
      console.log('--- DASHBOARD CONSISTENCY CHECK ---');
      console.log('Total pivos no banco (server count):', serverCounts.pivots);
      console.log('Total pivos_geo no banco (server count):', serverCounts.pivosGeo);
      console.log('Total pivos carregados (tabela):', pivots.length);
      console.log('Total pivos_geo carregados (tabela):', pivosGeo.length);
      console.log('Total unificados (master list):', unifiedPivots.length);
      console.log('Pivos com coordenadas no mapa:', unifiedPivots.filter(p => !!p.position).length);

      // Validação rigorosa solicitada: total no banco vs total renderizado
      // Consideramos "renderizado" o total unificado (unificação pivos + pivos_geo)
      // O banco pode ter pivos_geo sem pivos correspondentes e vice-versa.
      // A soma de registros únicos deve ser consistente.

      const totalNoBanco = Math.max(serverCounts.pivots, pivots.length, serverCounts.pivosGeo, pivosGeo.length);

      if (pivots.length !== serverCounts.pivots && serverCounts.pivots > 0) {
        console.error(`ERRO DE INTEGRIDADE: Pivos carregados (${pivots.length}) != Total no banco (${serverCounts.pivots})`);
      }
      if (pivosGeo.length !== serverCounts.pivosGeo && serverCounts.pivosGeo > 0) {
        console.error(`ERRO DE INTEGRIDADE: Pivos_geo carregados (${pivosGeo.length}) != Total no banco (${serverCounts.pivosGeo})`);
      }

      if (unifiedPivots.length < Math.max(pivots.length, pivosGeo.length)) {
        console.warn('DIVERGÊNCIA: Há menos pivôs na lista de indicadores do que nas tabelas individuais. Verifique duplicatas de nome.');
      }
    }
  }, [loading, pivots, pivosGeo, unifiedPivots, serverCounts]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPivots([]);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredPivots(simulatedPivots.filter(p => p.pivo_nome.toLowerCase().includes(lowerTerm)));
    }
  }, [searchTerm, simulatedPivots]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
  };

  const handlePivotClick = (pivot: Pivot) => {
    if (!isCreating) {
      setSelectedGeo(null);
      setSelectedPivot(pivot);
    }
  };

  const handleGeoClick = (geo: any) => {
    if (!isCreating) {
      setSelectedPivot(null);
      setSelectedGeo(geo);
    }
  };

  const handleCreateSuccess = () => {
    fetchData();
    setSelectedLocation(null);
    setIsCreating(false);
  };

  const handleUpdateSuccess = () => {
    fetchData();
  };

  const handleSelectPivot = (pivot: Pivot) => {
    if (mapRef.current) {
      mapRef.current.selectPivot(pivot);
      setSearchTerm('');
      setFilteredPivots([]);
    }
  };

  useEffect(() => {
    if (selectedPivot) {
      const updated = simulatedPivots.find(p => p.pivo_id === selectedPivot.pivo_id);
      if (updated) {
        setSelectedPivot(updated);
      } else {
        setSelectedPivot(null);
      }
    }
  }, [simulatedPivots]);

  const totalHeadcount = simulatedPivots.reduce((sum, p) => sum + (p.headcount || 0), 0);
  const totalArea = simulatedPivots.reduce((sum, p) => sum + (p.area_ha || 0), 0);
  const totalCost = simulatedPivots.reduce((sum, p) => sum + (p.custo_total_calculado || 0), 0);

  // Formata custo de forma legível: > 1M → "1.2M", > 1k → "17.6k"
  const formatCost = (val: number) => {
    if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(1).replace('.', ',')}k`;
    return `R$ ${Math.round(val).toLocaleString('pt-BR')}`;
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-500 font-medium">Sincronizando dados operacionais...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-rose-600 font-medium">Erro de conexão: {error}</div>;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          ref={mapRef}
          pivots={simulatedPivots}
          poligonais={poligonais}
          pivosGeo={pivosGeo}
          showHeatmap={showHeatmap}
          onToggleHeatmap={setShowHeatmap}
          isCreating={isCreating}
          onLocationSelect={handleLocationSelect}
          onPivotClick={handlePivotClick}
          onGeoClick={handleGeoClick}
          tempMarkerPosition={selectedLocation}
        />
      </div>

      {/* Top Left: Strategic Cards Overlay */}
      <div className="absolute top-4 left-4 z-20 flex gap-3 pointer-events-none">

        {/* Card helper */}
        {([
          { icon: <Users className="w-3.5 h-3.5 text-slate-400" />, label: 'Trabalhadores', value: totalHeadcount.toLocaleString('pt-BR'), tip: 'Total de colaboradores distribuídos nos pivôs' },
          { icon: <DollarSign className="w-3.5 h-3.5 text-slate-400" />, label: 'Custo Operacional', value: formatCost(totalCost), tip: 'Custo mensal total (salário × headcount)' },
          { icon: <MapIcon className="w-3.5 h-3.5 text-slate-400" />, label: 'Área Irrigada', value: `${Math.round(simulatedPivots.filter(p => p.is_cadastrado).reduce((sum, p) => sum + (p.area_ha || 0), 0))} ha`, tip: 'Área total dos pivôs registrados' },
          { icon: <Layers className="w-3.5 h-3.5 text-slate-400" />, label: 'Pivôs Ativos', value: String(simulatedPivots.filter(p => p.is_cadastrado).length), tip: `${simulatedPivots.filter(p => p.is_cadastrado).length} pivôs registrados na tabela master` },
        ] as const).map((card, i) => (
          <div key={i} className="pointer-events-auto group relative bg-white/90 backdrop-blur-sm shadow-md rounded-xl p-3 border border-white/20 min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              {card.icon}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="text-lg font-semibold text-slate-900">{card.value}</div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-[9999] animate-in fade-in zoom-in-95 duration-200 w-48">
              <div className="bg-slate-900/98 backdrop-blur-md text-white text-[10px] px-3 py-2 rounded-xl shadow-2xl border border-white/10 ring-1 ring-black/20 leading-relaxed text-center">
                {card.tip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900/98" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Right: Tools Overlay */}
      <div className="absolute top-4 right-4 z-20 space-y-3 flex flex-col items-end">
        {/* Search Bar */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 border border-white/20 w-72">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Localizar pivô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
            {filteredPivots.length > 0 && (
              <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 mt-1 py-1">
                {filteredPivots.map(pivot => (
                  <li
                    key={pivot.pivo_id}
                    onClick={() => handleSelectPivot(pivot)}
                    className="px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer text-slate-700 font-medium transition-colors"
                  >
                    {pivot.pivo_nome}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Simulation Summary Panel (Tabela RH) */}
        {Object.keys(simulacaoTemp).length > 0 && (
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-blue-200 w-80 overflow-hidden">
            <div className="bg-blue-600 px-4 py-2 flex justify-between items-center">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3 h-3" /> Resumo da Simulação (RH)
              </h3>
              <button
                onClick={() => setSimulacaoTemp({})}
                className="text-[10px] text-blue-100 hover:text-white underline underline-offset-2"
              >
                Limpar Tudo
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase">Pivô</th>
                    <th className="px-3 py-2 text-center font-bold text-slate-400 uppercase">Ajuste</th>
                    <th className="px-3 py-2 text-right font-bold text-slate-400 uppercase">Custo / ha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simulatedPivots.filter(p => (simulacaoTemp[p.pivo_id] || 0) !== 0).map(p => (
                    <tr key={p.pivo_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{p.pivo_nome}</td>
                      <td className={`px-3 py-2 text-center font-bold ${simulacaoTemp[p.pivo_id] > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {simulacaoTemp[p.pivo_id] > 0 ? `+${simulacaoTemp[p.pivo_id]}` : simulacaoTemp[p.pivo_id]}
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${p.custo_por_hectare > 120 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        R$ {p.custo_por_hectare.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-72">
          <button
            onClick={() => {
              setIsCreating(!isCreating);
              setSelectedLocation(null);
              setSelectedPivot(null);
            }}
            className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md ${isCreating
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
          >
            {isCreating ? 'Cancelar Criação' : <><Plus className="w-4 h-4" /> Novo Pivô</>}
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md border ${showHeatmap
              ? 'bg-blue-500 text-white border-blue-400'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
          >
            <Layers className="w-4 h-4" />
            {showHeatmap ? 'Ocultar Calor' : 'Mapa de Calor'}
          </button>

          <button
            onClick={() => mapRef.current?.centerMap()}
            className="h-10 px-4 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Crosshair className="w-4 h-4" />
            Centralizar Chapada
          </button>
        </div>
      </div>

      {/* Creation Hint Overlay */}
      {isCreating && !selectedLocation && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl text-sm font-medium flex items-center gap-3 border border-white/10">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
          Clique no mapa para definir a posição do novo pivô
        </div>
      )}

      {/* Modals and Drawers */}
      {selectedLocation && (
        <PivotCreationModal
          position={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Drawer pivô cadastrado */}
      <DrawerDetalhesPivo
        pivo={selectedPivot}
        onClose={() => setSelectedPivot(null)}
        onUpdate={handleUpdateSuccess}
        simulacaoTemp={simulacaoTemp}
        setSimulacaoTemp={setSimulacaoTemp}
        legalSettings={legalSettings}
      />

      {/* Drawer pivô geográfico (KML) */}
      {selectedGeo && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col overflow-y-auto border-l border-gray-100">
          <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pivô Geográfico</p>

              {editingGeoId === selectedGeo.id ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-slate-300">
                    {parsePivoName(selectedGeo.nome).original}-
                  </span>
                  <input
                    type="text"
                    value={editGeoNameValue}
                    onChange={(e) => setEditGeoNameValue(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm bg-slate-800 text-white border border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Nome editável..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveGeoName(selectedGeo, simulatedPivots.find(p => p.pivo_nome === selectedGeo.nome));
                      if (e.key === 'Escape') setEditingGeoId(null);
                    }}
                  />
                  <button onClick={() => handleSaveGeoName(selectedGeo, simulatedPivots.find(p => p.pivo_nome === selectedGeo.nome))} className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-500/10 rounded">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => setEditingGeoId(null)} className="text-slate-400 hover:text-slate-300 p-1 bg-slate-800 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group mt-1">
                  <h2 className="text-lg font-bold text-white truncate">{selectedGeo.nome || 'Sem nome'}</h2>
                  <button
                    onClick={() => handleEditGeoClick(selectedGeo)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-400 p-1 rounded-md"
                    title="Editar nome do pivô"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedGeo(null)} className="text-slate-400 hover:text-white transition-colors ml-4 self-start">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-gray-200 bg-gray-50/50">
            <button
              onClick={() => setGeoTab('resumo')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${geoTab === 'resumo' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Resumo
            </button>
            <button
              onClick={() => setGeoTab('colab')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${geoTab === 'colab' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Colaboradores
            </button>
            <button
              onClick={() => setGeoTab('sim')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${geoTab === 'sim' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Simulação
            </button>
          </div>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {geoTab === 'resumo' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedGeo.tipo === 'circle' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedGeo.tipo === 'circle' ? '○ Círculo Otimizado' : '□ Polígono'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 ml-auto">
                    Status: Ativo
                  </span>
                </div>
                {(() => {
                  const pivotInfo = simulatedPivots.find(p => p.pivo_nome === selectedGeo.nome);
                  const rankedPivots = [...simulatedPivots].sort((a, b) => (b.custo_por_hectare || 0) - (a.custo_por_hectare || 0));
                  const rank = pivotInfo ? rankedPivots.findIndex(p => p.pivo_nome === pivotInfo.pivo_nome) + 1 : '-';

                  // Calculate mediaFazenda for the Tooltip calculations
                  let mediaFazenda = 0;
                  const pivosValidosParaMedia = simulatedPivots.filter(pv => pv.area_ha > 0);
                  const somaCustoPorHa = pivosValidosParaMedia.reduce((acc, pv) => acc + (pv.custo_por_hectare || 0), 0);
                  if (pivosValidosParaMedia.length > 0) {
                    mediaFazenda = somaCustoPorHa / pivosValidosParaMedia.length;
                  }

                  const area = Number(selectedGeo.area_ha || 0);
                  const custoT = pivotInfo?.custo_total_calculado || 0;
                  const cHa = area > 0 ? (custoT / area) : 0;

                  let variacao = 0;
                  let colorClass = '';
                  let textColor = '';
                  let bgLabel = '';
                  if (mediaFazenda > 0) {
                    variacao = (cHa - mediaFazenda) / mediaFazenda;
                    if (area <= 0) {
                      colorClass = 'text-gray-500'; bgLabel = 'Inválido'; textColor = 'text-gray-500';
                    } else if (variacao <= 0) {
                      colorClass = 'text-green-500'; bgLabel = '🟢 Excelente'; textColor = 'text-green-700';
                    } else if (variacao <= 0.20) {
                      colorClass = 'text-yellow-500'; bgLabel = '🟡 Moderado'; textColor = 'text-yellow-700';
                    } else {
                      colorClass = 'text-red-500'; bgLabel = '🔴 Crítico'; textColor = 'text-red-700';
                    }
                  }

                  return (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Área (ha)</p>
                        <p className="text-xl font-bold text-slate-900">{area.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Headcount Atual</p>
                        <p className="text-xl font-bold text-slate-900">{pivotInfo?.headcount || 0}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custo Mensal</p>
                        <p className="text-lg font-bold text-slate-900 break-words">{formatCost(custoT)}</p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 relative">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo / ha</p>
                          <button
                            type="button"
                            onClick={() => setShowHeatmapTooltip(!showHeatmapTooltip)}
                            className="text-blue-500 hover:text-blue-700 transition relative outline-none focus:outline-none"
                            title="Ver modelo matemático de cor e cálculo"
                          >
                            <Info className="w-[14px] h-[14px]" />
                          </button>
                        </div>
                        <p className="text-lg font-bold text-slate-900 break-words">{formatCost(cHa)}</p>

                        {/* Tooltip Popover Box */}
                        {showHeatmapTooltip && (
                          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 shadow-xl rounded-xl p-4 z-50 text-left text-xs text-gray-700 font-sans">

                            <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                              <span className="font-bold text-gray-800 text-sm">Lógica do Heatmap</span>
                              <button onClick={() => setShowHeatmapTooltip(false)} className="text-gray-400 hover:text-gray-600 font-bold block p-1">✕</button>
                            </div>

                            <div className="mb-3">
                              <p className="font-semibold text-[10px] uppercase text-gray-500 mb-1">1️⃣ Fórmula base</p>
                              <p className="text-gray-800 bg-gray-50 p-1 rounded font-mono text-[10px]">Custo/ha = Custo Total ÷ Área (ha)</p>
                              {area > 0 ? (
                                <p className="text-gray-600 ml-1 mt-1 text-[11px]">
                                  {formatCost(custoT)} ÷ {area.toFixed(2)} ha<br />
                                  <b>= {formatCost(cHa)}</b>
                                </p>
                              ) : (
                                <p className="text-red-500 ml-1 mt-1 font-semibold text-[10px]">Não é possível calcular custo por hectare (Área = 0)</p>
                              )}
                            </div>

                            <div className="mb-3">
                              <p className="font-semibold text-[10px] uppercase text-gray-500 mb-1">2️⃣ Média da fazenda</p>
                              {pivosValidosParaMedia.length > 0 ? (
                                <p className="text-gray-800 font-semibold">{formatCost(mediaFazenda)} / ha</p>
                              ) : (
                                <p className="text-red-500 font-semibold text-[10px]">Não há pivôs ativos válidos suficientes</p>
                              )}
                            </div>

                            <div className="mb-3">
                              <p className="font-semibold text-[10px] uppercase text-gray-500 mb-1">3️⃣ CÁLCULO DA VARIAÇÃO PERCENTUAL</p>
                              <p className="text-gray-800 bg-gray-50 p-1 rounded font-mono text-[10px] break-all leading-tight">Var = (Custo/ha - Média) ÷ Média</p>
                              {area > 0 && mediaFazenda > 0 ? (
                                <p className="text-gray-600 ml-1 mt-1 text-[11px]">
                                  = ({formatCost(cHa).replace('R$ ', '')} - {formatCost(mediaFazenda).replace('R$ ', '')}) ÷ {formatCost(mediaFazenda).replace('R$ ', '')}<br />
                                  <b className={`${colorClass}`}>= ${(variacao > 0 ? '+' : '')}${(variacao * 100).toFixed(1)}%</b>
                                </p>
                              ) : (
                                <p className="text-gray-400 ml-1 mt-1 text-[9px] italic">Sem dados comparáveis.</p>
                              )}
                            </div>

                            <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <p className="font-semibold text-[10px] uppercase text-gray-500 mb-2">4️⃣ Regra de Classificação</p>
                              <ul className="text-[10px] space-y-1 mb-2">
                                <li><span className="text-green-500">🟢 Verde</span>: abaixo ou igual à média</li>
                                <li><span className="text-yellow-500">🟡 Amarelo</span>: até 20% acima da média</li>
                                <li><span className="text-red-500">🔴 Vermelho</span>: &gt; 20% acima da média</li>
                              </ul>
                              {area > 0 && mediaFazenda > 0 && (
                                <div className={`mt-2 p-1.5 rounded-md text-center bg-white border font-semibold ${textColor} border-current opacity-90`}>
                                  Este pivô está {(variacao * 100).toFixed(1)}% {variacao > 0 ? 'acima' : 'abaixo/na linha'} da média.<br />
                                  Classificação: {bgLabel}
                                </div>
                              )}
                            </div>

                          </div>
                        )}
                      </div>

                      <div className="col-span-2 bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ranking na Fazenda (Custo/ha)</p>
                        <p className="text-sm font-bold text-slate-900">{rank !== '-' ? `${rank}º de ${rankedPivots.length}` : 'N/A'}</p>
                      </div>

                      {/* NEW PANEL: Dimensionamento Automático por Cultura */}
                      <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dimensionamento por Cultura</h4>
                        </div>

                        {(() => {
                          const culturaId = pivotInfo?.cultura_id || selectedGeo?.cultura_id;
                          const cultura = culturas.find(c => c.id === culturaId);
                          if (!cultura) {
                            return <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded border border-slate-100 text-center">Nenhuma cultura vinculada a este pivô para calcular o dimensionamento de headcount.</p>;
                          }

                          const hcIdeal = area > 0 ? Math.ceil(area / cultura.fator_ha_por_pessoa) : 0;
                          const hcAtual = pivotInfo?.headcount || 0;
                          const delta = hcAtual - hcIdeal;

                          const salarioBase = legalSettings?.salario_minimo || 1621;
                          const impactoFin = Math.abs(delta) * salarioBase;

                          let deltaLabel = 'Equilíbrio';
                          let deltaRisco = 'Dimensionamento adequado';
                          let deltaColor = 'text-green-600';
                          let bgStatus = 'bg-green-100';

                          if (delta > 0) {
                            deltaLabel = 'Excesso';
                            deltaRisco = 'Risco de desperdício';
                            deltaColor = 'text-orange-600';
                            bgStatus = 'bg-orange-100';
                          } else if (delta < 0) {
                            deltaLabel = 'Falta';
                            deltaRisco = 'Risco operacional';
                            deltaColor = 'text-blue-600';
                            bgStatus = 'bg-blue-100';
                          }

                          return (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs text-slate-600 border-b border-white pb-2">
                                <span>Cultura Atual: <strong className="text-slate-800 ml-1">{cultura.nome}</strong></span>
                                <span>Fator: <strong className="text-slate-800 ml-1">1 pessoa / {cultura.fator_ha_por_pessoa} ha</strong></span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                <div className="bg-white p-2 rounded border border-slate-100">
                                  <p className="mb-1">Ideal</p>
                                  <p className="text-base text-slate-800 font-mono">{hcIdeal}</p>
                                </div>
                                <div className="bg-white p-2 rounded border border-slate-100">
                                  <p className="mb-1">Atual</p>
                                  <p className="text-base text-slate-800 font-mono">{hcAtual}</p>
                                </div>
                                <div className={`p-2 rounded border ${bgStatus} border-transparent`}>
                                  <p className={`mb-1 ${deltaColor}`}>Delta</p>
                                  <p className={`text-sm font-mono leading-none ${deltaColor}`}>
                                    {delta > 0 ? '+' : ''}{delta} <br /><span className="text-[8px] font-sans">{deltaLabel}</span>
                                  </p>
                                </div>
                              </div>

                              {delta !== 0 && (
                                <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-100 mt-2">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${deltaColor}`}>
                                    <AlertCircle className="w-3 h-3" /> {deltaRisco}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 font-mono">
                                    {delta > 0 ? '+' : ''}{formatCost(impactoFin)}/mês
                                  </span>
                                </div>
                              )}
                              {delta === 0 && (
                                <div className="flex items-center justify-center bg-white px-3 py-2 rounded border border-slate-100 mt-2 text-green-700">
                                  <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                    ✓ {deltaRisco}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}

                {showHeatmap && (
                  <div className="bg-slate-50 rounded-xl p-4 mt-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Legenda Mapa de Calor</p>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Eficiente (Pequeno / Baixo Custo)</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> Moderado (Médio porte)</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Crítico (Grande / Alto Custo)</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {geoTab === 'colab' && (
              <div className="space-y-4">
                {(() => {
                  const area = Number(selectedGeo.area_ha || 0);
                  const idealHeadcount = Math.max(1, Math.ceil(area / 50));
                  const pivotInfo = simulatedPivots.find(p => p.pivo_nome === selectedGeo.nome);
                  const atual = pivotInfo?.headcount || 0;
                  const delta = atual - idealHeadcount;

                  const pCols = colaboradores.filter(c => c.pivo_nome === selectedGeo.nome);
                  return (
                    <div className="space-y-4">
                      {/* Resumo Headcount vs Ideal */}
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ideal Estimado</p>
                          <p className="text-xl font-bold text-slate-900">{idealHeadcount}</p>
                        </div>
                        <div className={`flex-1 rounded-xl p-3 text-center border ${delta === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : delta > 0 ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">{delta > 0 ? 'Excesso' : delta < 0 ? 'Déficit' : 'Situação'}</p>
                          <p className="text-xl font-bold">{delta === 0 ? 'OK' : delta > 0 ? `+${delta}` : delta}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-sm cursor-not-allowed opacity-50" title="Botão ilustrativo: será atrelado à base em breve.">
                          + Adicionar Colab
                        </button>
                        <button className="flex-1 bg-white hover:bg-slate-50 text-rose-600 border border-rose-200 text-xs font-semibold py-2 rounded-lg transition-colors shadow-sm cursor-not-allowed opacity-50" title="Botão ilustrativo: será atrelado à base em breve.">
                          - Remover Colab
                        </button>
                      </div>

                      {pCols.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-600">Nenhum colaborador alocado.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                          {pCols.map(c => (
                            <div key={c.id} className="p-3 bg-white flex justify-between items-center hover:bg-slate-50 transition-colors border border-gray-100 rounded-xl">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{c.nome}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{c.funcao || 'Operador Base'}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-bold text-blue-600">{formatCost(c.salario_base || c.salario || legalSettings?.salario_minimo || 1621)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {geoTab === 'sim' && (
              <div className="space-y-4">
                {(() => {
                  const area = Number(selectedGeo.area_ha || 0);
                  const pivotInfo = simulatedPivots.find(p => p.pivo_nome === selectedGeo.nome);

                  // Base real (without current geoSimOffset which is temporal)
                  const baseOffset = pivotInfo ? (simulacaoTemp[pivotInfo.pivo_id] || 0) : 0;
                  const atualBase = pivotInfo ? (pivotInfo.headcount - baseOffset) : 0;
                  const targetHeadcount = Math.max(0, atualBase + baseOffset);

                  // Calculemos the average salary of its current collaborators or minimal wage
                  const pivoColabs = colaboradoresNormalizados.filter(c => c.pivo_nome === selectedGeo.nome);
                  const currSalarioRef = legalSettings?.salario_minimo || 1621;
                  const salarioMedio = pivoColabs.length > 0
                    ? pivoColabs.reduce((sum, c) => sum + (c.salario_base || currSalarioRef), 0) / pivoColabs.length
                    : currSalarioRef;

                  // Calcula custo exato da nova Simulação com encargos:
                  const encargosTotal =
                    (legalSettings?.inss_empresa_percentual || 20) +
                    (legalSettings?.fgts_percentual || 8) +
                    (legalSettings?.rat_percentual || 2) +
                    (legalSettings?.terceiros_percentual || 5.8) +
                    (legalSettings?.provisao_ferias_percentual || 11.11) +
                    (legalSettings?.provisao_13_percentual || 8.33);

                  const { custoTotal: newCusto, custoPorHectare: newCustoHa } = calcularCustoPivo({
                    headcount: targetHeadcount,
                    salarioBase: salarioMedio,
                    adicionaisPercentual: legalSettings?.adicionais_percentual || 0,
                    encargosPercentual: encargosTotal,
                    areaHa: area || 1
                  });

                  // We need to compare against the BASE cost without geoSimOffset
                  // Since simulatedPivots has already applied simulacaoTemp, let's decouple them for the UI diff:
                  const { custoTotal: baseCusto, custoPorHectare: baseCustoHa } = calcularCustoPivo({
                    headcount: atualBase,
                    salarioBase: salarioMedio,
                    adicionaisPercentual: legalSettings?.adicionais_percentual || 0,
                    encargosPercentual: encargosTotal,
                    areaHa: area || 1
                  });

                  const diffCusto = newCusto - baseCusto;

                  return (
                    <div className="space-y-6">
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">Ajuste Temporário (Simulação)</p>
                        <div className="flex items-center justify-center gap-6">
                          <button
                            onClick={() => {
                              if (pivotInfo) {
                                setSimulacaoTemp(prev => ({ ...prev, [pivotInfo.pivo_id]: (prev[pivotInfo.pivo_id] || 0) - 1 }));
                              }
                            }}
                            className="bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm transition-colors disabled:opacity-50"
                            disabled={targetHeadcount <= 0 || !pivotInfo}
                          >-</button>
                          <div className="text-center">
                            <span className="text-3xl font-black text-blue-600">{targetHeadcount}</span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Colaboradores</p>
                          </div>
                          <button
                            onClick={() => {
                              if (pivotInfo) {
                                setSimulacaoTemp(prev => ({ ...prev, [pivotInfo.pivo_id]: (prev[pivotInfo.pivo_id] || 0) + 1 }));
                              }
                            }}
                            className="bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm transition-colors disabled:opacity-50"
                            disabled={!pivotInfo}
                          >+</button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border ${baseOffset === 0 ? 'bg-slate-50 border-slate-200 text-slate-800' : baseOffset > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                          <p className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-70">Impacto Imediato no Custo Mensal</p>
                          <p className={`text-xl font-bold ${baseOffset > 0 ? 'text-rose-700' : baseOffset < 0 ? 'text-emerald-700' : ''}`}>
                            {formatCost(newCusto)}
                          </p>
                          {geoSimOffset !== 0 && (
                            <p className={`text-xs font-semibold mt-1 ${geoSimOffset > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {geoSimOffset > 0 ? '+' : ''}{formatCost(diffCusto)} / mês
                            </p>
                          )}
                        </div>

                        <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-800">
                          <p className="text-[10px] uppercase font-bold tracking-wider mb-1 opacity-70">Novo Custo por Hectare</p>
                          <div className="flex items-end gap-2">
                            <p className="text-xl font-bold text-blue-700">{formatCost(newCustoHa)}</p>
                            {geoSimOffset !== 0 && (
                              <p className="text-xs font-medium text-slate-500 mb-1 line-through">{formatCost(baseCustoHa)}</p>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
