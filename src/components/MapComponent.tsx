import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pivot, Poligonal } from '../types';

interface MapComponentProps {
  pivots: Pivot[];
  poligonais: Poligonal[];
  pivosGeo?: any[];
  onPivotClick?: (pivo: Pivot) => void;
  onGeoClick?: (pivo: any) => void;  // clique em pivô KML
  isCreating?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  tempMarkerPosition?: { lat: number; lng: number; radius?: number } | null;
  showHeatmap?: boolean;
  onToggleHeatmap?: (show: boolean) => void;
}

export interface MapComponentHandle {
  centerMap: () => void;
  selectPivot: (pivot: Pivot) => void;
}

const robustNormalize = (name: string) => {
  if (!name) return '';
  let n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  n = n.replace(/[^a-z0-9]/g, '');
  n = n.replace(/([^0-9])0+([1-9])/g, '$1$2').replace(/([^0-9])0+(0)/g, '$1$2');
  return n;
};

const MapComponent = forwardRef<MapComponentHandle, MapComponentProps>(({
  pivots,
  poligonais,
  pivosGeo = [],
  onPivotClick,
  onGeoClick,
  isCreating,
  onLocationSelect,
  tempMarkerPosition,
  showHeatmap: externalShowHeatmap,
  onToggleHeatmap
}, ref) => {
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const pivotLayerRef = useRef<L.LayerGroup | null>(null);
  const pivosGeoLayerRef = useRef<L.LayerGroup | null>(null);
  const tempLayerRef = useRef<L.LayerGroup | null>(null);

  const [internalShowHeatmap, setInternalShowHeatmap] = useState(false);
  const showHeatmap = externalShowHeatmap !== undefined ? externalShowHeatmap : internalShowHeatmap;

  const defaultCenter: [number, number] = [-13.314994399999993, -41.41686619325243];
  const defaultZoom = 9;

  useImperativeHandle(ref, () => ({
    centerMap: () => {
      if (mapRef.current) {
        mapRef.current.flyTo(defaultCenter, defaultZoom);
      }
    },
    selectPivot: (pivot: Pivot) => {
      if (mapRef.current && pivot.position && pivot.position.coordinates) {
        const lat = pivot.position.coordinates[1];
        const lng = pivot.position.coordinates[0];
        mapRef.current.flyTo([lat, lng], 14);
      }
    }
  }));

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPivots, setFilteredPivots] = useState<Pivot[]>([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPivots([]);
    } else {
      const lowerTerm = robustNormalize(searchTerm);
      setFilteredPivots(pivots.filter(p => robustNormalize(p.pivo_nome).includes(lowerTerm)));
    }
  }, [searchTerm, pivots]);

  useEffect(() => {
    if (!mapRef.current) {
      const southWest = L.latLng(-14.5, -42.5);
      const northEast = L.latLng(-11.0, -40.0);
      const bounds = L.latLngBounds(southWest, northEast);

      mapRef.current = L.map('map-container', {
        center: defaultCenter,
        zoom: defaultZoom,
        minZoom: 8,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        scrollWheelZoom: true
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
      }).addTo(mapRef.current);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(mapRef.current);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}').addTo(mapRef.current);

      pivotLayerRef.current = L.layerGroup().addTo(mapRef.current);
      pivosGeoLayerRef.current = L.layerGroup().addTo(mapRef.current);
      tempLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
  }, []);

  useEffect(() => {
    if (!tempLayerRef.current) return;
    tempLayerRef.current.clearLayers();
    if (tempMarkerPosition) {
      const icon = L.divIcon({
        className: 'bg-transparent',
        html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([tempMarkerPosition.lat, tempMarkerPosition.lng], { icon }).addTo(tempLayerRef.current);
      if (tempMarkerPosition.radius) {
        L.circle([tempMarkerPosition.lat, tempMarkerPosition.lng], {
          radius: tempMarkerPosition.radius,
          color: '#ef4444',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.2,
          dashArray: '5, 5'
        }).addTo(tempLayerRef.current);
      }
    }
  }, [tempMarkerPosition]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const container = map.getContainer();
    container.style.cursor = isCreating ? 'crosshair' : 'grab';
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isCreating && onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    };
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [isCreating, onLocationSelect]);

  useEffect(() => {
    if (!mapRef.current) return;
    let pivosRendered = 0;
    let geoRendered = 0;

    // Base de cálculo para o Heatmap (Media da Fazenda)
    let mediaFazenda = 0;
    if (showHeatmap && pivots.length > 0) {
      const pivosValidos = pivots.filter(pv => pv.area_ha > 0);
      const somaCustoPorHa = pivosValidos.reduce((acc, pv) => acc + (pv.custo_por_hectare || 0), 0);
      mediaFazenda = pivosValidos.length > 0 ? somaCustoPorHa / pivosValidos.length : 0;
    }

    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
    }

    if (poligonais.length > 0) {
      const geoJsonFeatures = poligonais.map(p => ({
        type: 'Feature' as const,
        properties: { name: p.nome, area_ha: p.area_hectares },
        geometry: {
          type: 'Polygon' as const,
          coordinates: p.geometry.coordinates
        }
      }));

      geoJsonLayerRef.current = L.geoJSON(geoJsonFeatures as any, {
        style: () => ({ color: '#fbbf24', weight: 2, opacity: 0.8, fillColor: '#fbbf24', fillOpacity: 0.1 }),
        onEachFeature: (feature, layer) => {
          if (feature.properties?.name) {
            layer.bindPopup(`<b>${feature.properties.name}</b><br>Área: ${feature.properties.area_ha} ha`);
          }
        }
      }).addTo(mapRef.current);
    }

    if (pivotLayerRef.current) {
      pivotLayerRef.current.clearLayers();
      const geoNamesNormalized = new Set(pivosGeo.map(g => robustNormalize(g.nome)));

      pivots.forEach(pivot => {
        // Se já existe um pivoGeo correspondente, o motor de geo cuidará da renderização real.
        if (geoNamesNormalized.has(robustNormalize(pivot.pivo_nome))) return;

        if (pivot.position?.coordinates) {
          pivosRendered++;
          const [lng, lat] = pivot.position.coordinates;
          const radius = Math.sqrt((pivot.area_ha * 10000) / Math.PI);
          const custoTotal = pivot.custo_total_calculado || 0;
          const area = Number(pivot.area_ha) || 0;
          const custoPorHectare = area > 0 ? (custoTotal / area) : 0;

          let color = '#3b82f6';
          let variacao = 0;
          let variacaoPercentual = 0;

          if (showHeatmap && mediaFazenda > 0) {
            variacao = (custoPorHectare - mediaFazenda) / mediaFazenda;
            variacaoPercentual = Number((variacao * 100).toFixed(1));

            if (area <= 0) color = '#3b82f6';
            else if (variacao <= 0) color = '#22c55e';
            else if (variacao <= 0.20) color = '#eab308';
            else color = '#ef4444';
          } else if (showHeatmap) {
            color = '#9ca3af';
          }

          const circle = L.circle([lat, lng], { radius, color, weight: 2, fillColor: color, fillOpacity: showHeatmap ? 0.35 : 0.4 }).addTo(pivotLayerRef.current!);
          const marker = L.circleMarker([lat, lng], { radius: 5, color, fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(pivotLayerRef.current!);

          const brlFmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

          let popupContent = `
            <div class="text-sm font-medium min-w-[180px] font-sans">
              <div class="font-bold border-b border-gray-200 pb-1 mb-2 text-base">${pivot.pivo_nome}</div>
              <div class="flex justify-between mb-1"><span class="text-gray-500">Área:</span> <span class="font-semibold">${area.toFixed(2)} ha</span></div>
              <div class="flex justify-between mb-1"><span class="text-gray-500">Colaboradores:</span> <span class="font-semibold">${pivot.headcount}</span></div>
              <div class="flex justify-between mb-1"><span class="text-gray-500">Custo Total:</span> <span class="font-semibold">${brlFmt(custoTotal)}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Custo / ha:</span> <span class="font-semibold">${brlFmt(custoPorHectare)}</span></div>
          `;

          if (showHeatmap && area > 0 && mediaFazenda > 0) {
            popupContent += `
              <hr style="margin-top:6px; margin-bottom:6px; border-color:#e5e7eb" />
              <div style="font-size:12px; color:#374151">
                <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                  <span style="color:#6b7280">Média Fazenda:</span>
                  <span style="font-weight:600">${brlFmt(mediaFazenda)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                  <span style="color:#6b7280">Variação:</span>
                  <span style="font-weight:600; color:${color}">${variacaoPercentual}%</span>
                </div>
                <div style="margin-top:6px; font-size:10px; color:#6b7280; line-height:1.2; background:#f9fafb; padding:4px; border-radius:4px;">
                  <b>Heatmap Financeiro</b><br/>
                  Baseado apenas no custo real por hectare relativo à média.<br/>
                  <span style="color:#22c55e">Verde:</span> <= 0% (Baixo custo)<br/>
                  <span style="color:#eab308">Amarelo:</span> > 0 e <= 20%<br/>
                  <span style="color:#ef4444">Vermelho:</span> > 20% (Alto custo)
                </div>
              </div>
            `;
          }

          popupContent += `</div>`;

          circle.bindPopup(popupContent);
          marker.bindPopup(popupContent);
          const click = () => { if (onPivotClick) onPivotClick(pivot); };
          circle.on('click', click);
          marker.on('click', click);
        }
      });
    }

    if (pivosGeoLayerRef.current) {
      pivosGeoLayerRef.current.clearLayers();
      if (Array.isArray(pivosGeo)) {
        pivosGeo.forEach(p => {
          geoRendered++;
          try {
            // Encontrar os dados agregados para este pivô geográfico comparando pelo nome
            const pivotInfo = pivots.find(pv => robustNormalize(pv.pivo_nome) === robustNormalize(p.nome));

            // ── Cor por heatmap: baseada SEMPRE em custo_por_hectare e relativa à media ──
            let geoColor = pivotInfo ? '#2563eb' : '#94a3b8'; // Azul se cadastrado, Cinza Slate se órfão
            let variacaoPercentual = 0;
            let variacao = 0;
            const isOrfan = !pivotInfo;

            if (showHeatmap && pivotInfo) {
              const custoTotal = pivotInfo.custo_total_calculado || 0;
              const area = Number(p.area_ha) || 0;
              const custoPorHectare = area > 0 ? (custoTotal / area) : 0;

              if (mediaFazenda > 0) {
                variacao = (custoPorHectare - mediaFazenda) / mediaFazenda;
                variacaoPercentual = Number((variacao * 100).toFixed(1));

                if (area <= 0) geoColor = '#2563eb';
                else if (variacao <= 0) geoColor = '#22c55e'; // Verde
                else if (variacao <= 0.20) geoColor = '#eab308'; // Amarelo
                else geoColor = '#ef4444'; // Vermelho
              }
            }
            else if (showHeatmap) {
              // Fallback: se estiver pedindo showHeatmap e o pivo geo não tiver pivotInfo correlato 
              // (sendo recém carregado sem dados operacionais). Pode pintar de cinza.
              geoColor = '#9ca3af';
            }

            const brlFmt = (v: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

            let popupContent = `
              <div style="font-family:sans-serif;min-width:180px">
                <div style="font-size:14px;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:8px">
                  ${p.nome || 'Pivô'} 
                  ${isOrfan ? '<span style="font-size:10px; color:#ef4444; background:#fee2e2; padding:2px 4px; border-radius:4px; margin-left:4px">Não Registrado</span>' : ''}
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="color:#6b7280">Tipo:</span>
                  <span style="font-weight:600">${p.tipo === 'circle' ? '○ Círculo' : '□ Polígono'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="color:#6b7280">Área:</span>
                  <span style="font-weight:600">${Number(p.area_ha || 0).toFixed(2)} ha</span>
                </div>
                ${p.raio_m ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="color:#6b7280">Raio:</span>
                  <span style="font-weight:600">${Number(p.raio_m).toFixed(0)} m</span>
                </div>` : ''}
              `;

            if (pivotInfo) {
              const area = Number(p.area_ha) || 0;
              const cTotal = pivotInfo.custo_total_calculado || 0;
              const cHa = area > 0 ? (cTotal / area) : 0;

              popupContent += `
               <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                 <span style="color:#6b7280">Colaboradores:</span>
                 <span style="font-weight:600">${pivotInfo.headcount || 0}</span>
               </div>
               <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                 <span style="color:#6b7280">Custo Total:</span>
                 <span style="font-weight:600">${brlFmt(cTotal)}</span>
               </div>
               <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                 <span style="color:#6b7280">Custo/ha:</span>
                 <span style="font-weight:600">${brlFmt(cHa)}</span>
               </div>
               `;

              if (showHeatmap && area > 0 && mediaFazenda > 0) {
                popupContent += `
                 <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                   <span style="color:#6b7280">Média Fazenda:</span>
                   <span style="font-weight:600">${brlFmt(mediaFazenda)}</span>
                 </div>
                 <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                   <span style="color:#6b7280">Variação:</span>
                   <span style="font-weight:600; color:${geoColor}">${variacaoPercentual}%</span>
                 </div>
                 <hr style="margin-top:6px; margin-bottom:6px; border-color:#e5e7eb" />
                 <div style="font-size:10px; color:#6b7280; line-height:1.2; background:#f9fafb; padding:4px; border-radius:4px;">
                   <b>Heatmap Financeiro</b><br/>
                   Baseado apenas no custo real por hectare relativo à média.<br/>
                   <span style="color:#22c55e">Verde:</span> <= 0% (Baixo custo)<br/>
                   <span style="color:#eab308">Amarelo:</span> > 0 e <= 20%<br/>
                   <span style="color:#ef4444">Vermelho:</span> > 20% (Alto custo)
                 </div>
                 `;
              }
            }

            popupContent += `
                <div style="margin-top:8px;padding-top:6px;border-top:1px solid #f3f4f6;color:#6b7280;font-size:11px text-align:center">
                  Clique na área do pivô para ver detalhes no painel
                </div>
              </div>
            `;

            if (p.tipo === 'circle' && p.centro && Array.isArray(p.centro) && p.raio_m) {
              const circle = L.circle(p.centro as [number, number], {
                radius: Number(p.raio_m),
                color: geoColor,
                weight: isOrfan ? 1 : 2,
                dashArray: isOrfan ? '5, 5' : undefined,
                fillOpacity: showHeatmap ? 0.35 : (isOrfan ? 0.05 : 0.1),
                fillColor: geoColor
              }).addTo(pivosGeoLayerRef.current!)
                .bindPopup(popupContent);
              if (onGeoClick) circle.on('click', () => onGeoClick(p));

            } else if (p.geometry && typeof p.geometry === 'object' && p.geometry.type) {
              // Suporte a GeoJSON direto (Polygon, MultiPolygon, etc)
              const geoLayer = L.geoJSON(p.geometry, {
                style: {
                  color: geoColor,
                  weight: isOrfan ? 1 : 2,
                  dashArray: isOrfan ? '5, 5' : undefined,
                  fillOpacity: showHeatmap ? 0.35 : (isOrfan ? 0.05 : 0.1),
                  fillColor: geoColor
                }
              }).addTo(pivosGeoLayerRef.current!)
                .bindPopup(popupContent);
              if (onGeoClick) geoLayer.on('click', () => onGeoClick(p));

            } else if (p.geometry && Array.isArray(p.geometry) && p.geometry.length >= 3) {
              // Fallback para array de coordenadas (Polygon simples)
              const validCoords = (p.geometry as any[]).filter(
                coord => Array.isArray(coord) && coord.length >= 2 &&
                  coord[0] !== null && coord[1] !== null &&
                  !isNaN(Number(coord[0])) && !isNaN(Number(coord[1]))
              ) as [number, number][];

              if (validCoords.length >= 3) {
                const poly = L.polygon(validCoords, {
                  color: geoColor,
                  weight: isOrfan ? 1 : 2,
                  dashArray: isOrfan ? '5, 5' : undefined,
                  fillOpacity: showHeatmap ? 0.35 : (isOrfan ? 0.05 : 0.1),
                  fillColor: geoColor
                }).addTo(pivosGeoLayerRef.current!)
                  .bindPopup(popupContent);
                if (onGeoClick) poly.on('click', () => onGeoClick(p));
              }
            }
          } catch (e) { console.error('Error rendering pivoGeo:', e); }
        });
      }

    }
  }, [pivots, poligonais, pivosGeo, onPivotClick, onGeoClick, showHeatmap]);

  return (
    <div className="relative w-full h-full">
      <div id="map-container" className="w-full h-full"></div>
    </div>
  );
});

export default MapComponent;
