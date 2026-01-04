import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface NetworkPathPoint {
  lat: number;
  lon: number;
  name: string;
  asn: string;
  hop: number;
  location: string;
}

interface NetworkTraceMapProps {
  center: [number, number];
  path: NetworkPathPoint[];
  address: string;
  zoom?: number;
}

// Component to animate the view to fit all markers
function FitBoundsToMarkers({ path }: { path: NetworkPathPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (path.length > 0) {
      const bounds = L.latLngBounds(path.map(p => [p.lat, p.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [path, map]);

  return null;
}

// Animated polyline component
function AnimatedPath({ path }: { path: NetworkPathPoint[] }) {
  const positions: [number, number][] = path.map(p => [p.lat, p.lon]);
  
  return (
    <>
      {/* Main path line */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#00d2d3',
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 10',
          lineCap: 'round',
          lineJoin: 'round'
        }}
      />
      {/* Animated overlay */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#fff',
          weight: 1,
          opacity: 0.9,
          dashArray: '5, 15',
          lineCap: 'round',
          lineJoin: 'round',
          className: 'animate-dash'
        }}
      />
    </>
  );
}

export default function NetworkTraceMap({ center, path, address, zoom = 5 }: NetworkTraceMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Custom icon colors for different hop types
  const getMarkerIcon = (hop: number, isStart: boolean, isEnd: boolean) => {
    let color = '#00d2d3'; // Default cyan
    if (isStart) color = '#2ed573'; // Green for start
    if (isEnd) color = '#ff4757'; // Red for end

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: ${color};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">
          ${hop}
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-gray-700">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        ref={mapRef}
      >
        {/* OpenStreetMap Base Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Satellite Layer Option (Esri) */}
        {/* Uncomment to use satellite view similar to Google Earth */}
        {/* <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        /> */}

        {/* Network Path */}
        {path.length > 1 && <AnimatedPath path={path} />}

        {/* Markers for each hop */}
        {path.map((point, index) => (
          <Marker
            key={index}
            position={[point.lat, point.lon]}
            icon={getMarkerIcon(point.hop, index === 0, index === path.length - 1)}
          >
            <Popup>
              <div className="text-sm" style={{ color: '#1a1a1a' }}>
                <div className="font-bold mb-1">Hop {point.hop}: {point.name}</div>
                <div className="text-xs text-gray-600 mb-1">
                  <strong>ASN:</strong> {point.asn}
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  <strong>Location:</strong> {point.location}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Auto-fit bounds to show all markers */}
        <FitBoundsToMarkers path={path} />
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/95 border border-gray-700 rounded-lg p-3 text-xs z-[1000]">
        <div className="font-semibold text-white mb-2">Network Path Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
            <span className="text-gray-300">Origin ({address.split(',')[0]})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-cyan-400 border-2 border-white"></div>
            <span className="text-gray-300">Transit Hops</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
            <span className="text-gray-300">Destination</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-0 border-t-2 border-dashed border-cyan-400"></div>
            <span className="text-gray-300">Network Path</span>
          </div>
        </div>
      </div>

      {/* Map Controls Info */}
      <div className="absolute top-4 right-4 bg-gray-900/95 border border-gray-700 rounded-lg p-2 text-xs z-[1000] text-gray-300">
        <div className="flex items-center gap-2">
          <span>🖱️ Click markers for details</span>
          <span>|</span>
          <span>🔍 Scroll to zoom</span>
        </div>
      </div>
    </div>
  );
}

