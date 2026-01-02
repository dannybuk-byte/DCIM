import { memo } from 'react';
import { Facility } from '../../types';
import { PhotorealisticGisView } from './PhotorealisticGisView';

interface TopologyViewProps {
  facilities: Facility[];
  width?: number;
  height?: number;
}

interface Node {
  id: number;
  x: number;
  y: number;
  facility: Facility;
  connections: number[];
}

export const TopologyView = memo(({ facilities, width = 800, height = 400 }: TopologyViewProps) => {
  // GIS-style topology: operator->facility spoke lines over photorealistic basemap.
  return <PhotorealisticGisView mode="Topology" facilities={facilities} width={width} height={height} />;
});

TopologyView.displayName = 'TopologyView';

