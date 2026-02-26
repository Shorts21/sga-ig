import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import { Pivot, Poligonal } from '../types';

interface MapProps {
  pivots: Pivot[];
  poligonais: Poligonal[];
  onPivotClick: (pivot: Pivot) => void;
}

export default function Map({ pivots, poligonais, onPivotClick }: MapProps) {
  // Coordenadas para a Chapada Diamantina
  const chapadaDiamantinaCenter: [number, number] = [-12.97, -41.38];
  const purpleOptions = { color: 'purple' };

  return (
    <MapContainer 
      center={chapadaDiamantinaCenter}
      zoom={9}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pivots.map((pivot) => (
        <Marker key={pivot.pivo_id} position={pivot.position} eventHandlers={{
          click: () => {
            onPivotClick(pivot);
          }
        }}>
          <Popup>
            {pivot.pivo_nome}<br />
            Headcount: {pivot.headcount}
          </Popup>
        </Marker>
      ))}
      {poligonais.map((poligonal, index) => {
        const invertedCoordinates = poligonal.geometry.coordinates[0].map(coord => [coord[1], coord[0]] as [number, number]);
        return (
          <Polygon key={index} pathOptions={purpleOptions} positions={invertedCoordinates} />
        )
      })}
    </MapContainer>
  );
}
