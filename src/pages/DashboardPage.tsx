import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MapComponent, { MapComponentHandle } from '../components/MapComponent';
import { Pivot, Poligonal, Colaborador, ConfiguracoesLegais } from '../types';
import StatCard from '../components/StatCard';
import { Users, DollarSign, Map as MapIcon, Plus, Layers, Search, Crosshair } from 'lucide-react';
import PivotCreationModal from '../components/PivotCreationModal';
import DrawerDetalhesPivo from '../components/DrawerDetalhesPivo';
import { calcularCustoPivo } from '../utils/custoOperacional';

const DashboardPage: React.FC = () => {
  const [pivots, setPivots] = useState<Pivot[]>([]);
  const [poligonais, setPoligonais] = useState<Poligonal[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [legalSettings, setLegalSettings] = useState<ConfiguracoesLegais | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Pivot Management State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPivot, setSelectedPivot] = useState<Pivot | null>(null);

  // Simulation State
  const [simulacaoTemp, setSimulacaoTemp] = useState<Record<string, number>>({});

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPivots, setFilteredPivots] = useState<Pivot[]>([]);
  const mapRef = useRef<MapComponentHandle>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pivotsRes, poligonaisRes, colabRes, legalRes] = await Promise.all([
        fetch('/api/pivots'),
        fetch('/api/poligonais'),
        fetch('/api/colaboradores'),
        fetch('/api/configuracoes-legais')
      ]);
      const pivotData = pivotsRes.headers.get('content-type')?.includes('application/json') ? await pivotsRes.json() : null;
      const poligonaisData = poligonaisRes.headers.get('content-type')?.includes('application/json') ? await poligonaisRes.json() : null;

      if (Array.isArray(pivotData)) setPivots(pivotData);
      else setPivots([]);

      if (Array.isArray(poligonaisData)) setPoligonais(poligonaisData);
      else setPoligonais([]);

      if (colabRes.ok) setColaboradores(await colabRes.json());
      if (legalRes.ok) setLegalSettings(await legalRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate simulated pivots
  const simulatedPivots = useMemo(() => {
    const config = legalSettings || {
      salario_minimo: 1412,
      adicionais_percentual: 0,
      inss_empresa_percentual: 20,
      fgts_percentual: 8,
      rat_percentual: 2,
      terceiros_percentual: 5.8,
      provisao_ferias_percentual: 11.11,
      provisao_13_percentual: 8.33
    };
    const encargosPercentual = config.inss_empresa_percentual + config.fgts_percentual + config.rat_percentual + config.terceiros_percentual + config.provisao_ferias_percentual + config.provisao_13_percentual;

    return pivots.map(p => {
      const pivotColabs = colaboradores.filter(c => c.pivo_id === p.pivo_id);
      const baseHeadcount = p.headcount || pivotColabs.length || 0;
      const simulatedHeadcount = baseHeadcount + (simulacaoTemp[p.pivo_id] || 0);

      const avgSalary = pivotColabs.length > 0 
        ? pivotColabs.reduce((sum, c) => sum + (c.salario_base || c.salario || config.salario_minimo), 0) / pivotColabs.length
        : config.salario_minimo;

      const { custoTotal, custoPorHectare } = calcularCustoPivo({
        headcount: Math.max(0, simulatedHeadcount),
        salarioBase: avgSalary,
        adicionaisPercentual: config.adicionais_percentual,
        encargosPercentual: encargosPercentual,
        areaHa: p.area_ha
      });

      return {
        ...p,
        headcount: Math.max(0, simulatedHeadcount),
        custo_total_calculado: custoTotal,
        custo_por_hectare: custoPorHectare
      };
    });
  }, [pivots, colaboradores, legalSettings, simulacaoTemp]);

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
      setSelectedPivot(pivot);
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

  const totalHeadcount = simulatedPivots.reduce((sum, p) => sum + p.headcount, 0);
  const totalCost = simulatedPivots.reduce((sum, p) => sum + (p.custo_total_calculado || 0), 0);
  const totalArea = simulatedPivots.reduce((sum, p) => sum + p.area_ha, 0);

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
          showHeatmap={showHeatmap} 
          onToggleHeatmap={setShowHeatmap}
          isCreating={isCreating}
          onLocationSelect={handleLocationSelect}
          onPivotClick={handlePivotClick}
          tempMarkerPosition={selectedLocation}
        />
      </div>

      {/* Top Left: Strategic Cards Overlay */}
      <div className="absolute top-4 left-4 z-20 flex gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm shadow-md rounded-xl p-3 border border-white/20 min-w-[140px]">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trabalhadores</span>
          </div>
          <div className="text-lg font-semibold text-slate-900">{totalHeadcount.toLocaleString('pt-BR')}</div>
        </div>

        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm shadow-md rounded-xl p-3 border border-white/20 min-w-[140px]">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Operacional</span>
          </div>
          <div className="text-lg font-semibold text-slate-900">R$ {Math.round(totalCost / 1000)}k</div>
        </div>

        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm shadow-md rounded-xl p-3 border border-white/20 min-w-[140px]">
          <div className="flex items-center gap-2 mb-1">
            <MapIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Área Irrigada</span>
          </div>
          <div className="text-lg font-semibold text-slate-900">{Math.round(totalArea)} ha</div>
        </div>

        <div className="pointer-events-auto bg-white/90 backdrop-blur-sm shadow-md rounded-xl p-3 border border-white/20 min-w-[140px]">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pivôs Ativos</span>
          </div>
          <div className="text-lg font-semibold text-slate-900">{pivots.length}</div>
        </div>
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

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-72">
          <button
            onClick={() => {
              setIsCreating(!isCreating);
              setSelectedLocation(null);
              setSelectedPivot(null);
            }}
            className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md ${
              isCreating 
              ? 'bg-rose-500 text-white hover:bg-rose-600' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isCreating ? 'Cancelar Criação' : <><Plus className="w-4 h-4" /> Novo Pivô</>}
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`h-10 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md border ${
              showHeatmap 
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

      <DrawerDetalhesPivo
        pivo={selectedPivot}
        onClose={() => setSelectedPivot(null)}
        onUpdate={handleUpdateSuccess}
      />
    </div>
  );
};

export default DashboardPage;
