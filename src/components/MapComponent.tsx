import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pivot, Poligonal } from '../types';

interface MapComponentProps {
  pivots: Pivot[];
  poligonais: Poligonal[];
  onPivotClick?: (pivo: Pivot) => void;
  isCreating?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  tempMarkerPosition?: { lat: number; lng: number; radius?: number } | null;
  showHeatmap?: boolean; // External control
  onToggleHeatmap?: (show: boolean) => void; // Callback for external control
}

export interface MapComponentHandle {
  centerMap: () => void;
  selectPivot: (pivot: Pivot) => void;
}

const MapComponent = forwardRef<MapComponentHandle, MapComponentProps>(({ 
  pivots, 
  poligonais, 
  onPivotClick, 
  isCreating, 
  onLocationSelect, 
  tempMarkerPosition,
  showHeatmap: externalShowHeatmap,
  onToggleHeatmap
}, ref) => {
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const pivotLayerRef = useRef<L.LayerGroup | null>(null);
  const tempLayerRef = useRef<L.LayerGroup | null>(null);
  
  const [internalShowHeatmap, setInternalShowHeatmap] = useState(false);
  
  // Use external prop if provided, otherwise internal state
  const showHeatmap = externalShowHeatmap !== undefined ? externalShowHeatmap : internalShowHeatmap;

  const handleHeatmapToggle = (checked: boolean) => {
    if (onToggleHeatmap) {
      onToggleHeatmap(checked);
    } else {
      setInternalShowHeatmap(checked);
    }
  };

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
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredPivots(pivots.filter(p => p.pivo_nome.toLowerCase().includes(lowerTerm)));
    }
  }, [searchTerm, pivots]);

  const handleCenterMap = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(defaultCenter, defaultZoom);
    }
  };

  const handleSelectPivot = (pivot: Pivot) => {
    if (mapRef.current && pivot.position && pivot.position.coordinates) {
      const lat = pivot.position.coordinates[1];
      const lng = pivot.position.coordinates[0];
      mapRef.current.flyTo([lat, lng], 14);
      setSearchTerm(''); // Clear search
      setFilteredPivots([]);
      if (onPivotClick) onPivotClick(pivot);
    }
  };

  useEffect(() => {
    if (!mapRef.current) {
      // Define bounds to lock the view (SouthWest, NorthEast)
      const southWest = L.latLng(-14.5, -42.5);
      const northEast = L.latLng(-11.0, -40.0);
      const bounds = L.latLngBounds(southWest, northEast);

      mapRef.current = L.map('map-container', { 
        center: defaultCenter, 
        zoom: defaultZoom,
        minZoom: 8,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0, // Sticky bounds
        scrollWheelZoom: true
      });
      
      // Satellite View (Esri World Imagery)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(mapRef.current);

      // Add Labels (Cities, Boundaries)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(mapRef.current);

      // Add Roads (Transportation)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}').addTo(mapRef.current);

      // Initialize Layer Groups
      pivotLayerRef.current = L.layerGroup().addTo(mapRef.current);
      tempLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
  }, []); // Mount only

  // Handle temporary marker/circle
  useEffect(() => {
    if (!tempLayerRef.current) return;
    
    tempLayerRef.current.clearLayers();

    if (tempMarkerPosition) {
      // Marker
      const icon = L.divIcon({
        className: 'bg-transparent',
        html: '<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([tempMarkerPosition.lat, tempMarkerPosition.lng], { icon }).addTo(tempLayerRef.current);

      // Circle (if radius provided)
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

  // Handle click events and cursor updates
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

    return () => {
      map.off('click', handleClick);
    };
  }, [isCreating, onLocationSelect]);

  // Render Polygons and Pivots
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
    }

    if (poligonais.length > 0) {
      const geoJsonFeatures = poligonais.map(p => ({
        type: 'Feature' as const,
        properties: { name: p.nome, area_ha: p.area_hectares },
        geometry: {
          type: 'Polygon' as const,
          coordinates: p.geometry.coordinates // GeoJSON Polygon expects an array of rings (outer ring first)
        }
      }));

      // @ts-ignore - Leaflet types might complain about exact GeoJSON structure match
      geoJsonLayerRef.current = L.geoJSON(geoJsonFeatures, {
        style: (feature) => {
          return {
            color: '#fbbf24', // Amber/Yellow for better visibility on satellite
            weight: 2,
            opacity: 0.8,
            fillColor: '#fbbf24',
            fillOpacity: 0.1
          };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.name) {
            layer.bindPopup(`<b>${feature.properties.name}</b><br>Área: ${feature.properties.area_ha} ha`);
          }
        }
      }).addTo(mapRef.current);
    }

    // Render Pivots (Markers/Circles)
    if (pivotLayerRef.current) {
      pivotLayerRef.current.clearLayers();
      
      pivots.forEach(pivot => {
        if (pivot.position && pivot.position.coordinates) {
          const lat = pivot.position.coordinates[1];
          const lng = pivot.position.coordinates[0];
          
          const radius = Math.sqrt((pivot.area_ha * 10000) / Math.PI);

          const custoPorHectare = pivot.custo_por_hectare || 0;
          let circleColor = '#3b82f6';
          let markerColor = '#1d4ed8';

          if (showHeatmap) {
            if (custoPorHectare < 50) {
              circleColor = '#22c55e'; // green
              markerColor = '#16a34a';
            } else if (custoPorHectare < 120) {
              circleColor = '#eab308'; // yellow
              markerColor = '#ca8a04';
            } else {
              circleColor = '#ef4444'; // red
              markerColor = '#dc2626';
            }
          }

          const circle = L.circle([lat, lng], {
            radius: radius,
            color: circleColor,
            weight: 2,
            fillColor: circleColor,
            fillOpacity: 0.4
          }).addTo(pivotLayerRef.current!);

          const marker = L.circleMarker([lat, lng], {
            radius: 5,
            color: markerColor,
            fillColor: '#fff',
            fillOpacity: 1,
            weight: 2
          }).addTo(pivotLayerRef.current!);

          const popupContent = `
            <div class="text-sm font-medium min-w-[180px]">
              <div class="font-bold border-b border-gray-200 pb-1 mb-2 text-base">${pivot.pivo_nome}</div>
              <div class="flex justify-between mb-1"><span class="text-gray-500">Área:</span> <span class="font-semibold">${pivot.area_ha.toFixed(2)} ha</span></div>
              <div class="flex justify-between mb-1"><span class="text-gray-500">Headcount:</span> <span class="font-semibold">${pivot.headcount}</span></div>
              <div class="flex justify-between mb-1"><span class="text-gray-500">Custo Total:</span> <span class="font-semibold">R$ ${pivot.custo_total_calculado?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div class="flex justify-between"><span class="text-gray-500">Custo / ha:</span> <span class="font-semibold">R$ ${pivot.custo_por_hectare?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
          `;
          
          circle.bindPopup(popupContent);
          marker.bindPopup(popupContent);

          const clickHandler = () => {
            if (onPivotClick) {
              onPivotClick(pivot);
            }
          };

          circle.on('click', clickHandler);
          marker.on('click', clickHandler);
        }
      });
    }

  }, [pivots, poligonais, onPivotClick, showHeatmap]);

  return (
    <div className="relative w-full h-full">
      <div id="map-container" className="w-full h-full"></div>
    </div>
  );
});

export default MapComponent;

