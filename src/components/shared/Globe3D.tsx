import { memo } from 'react';
import { Facility } from '../../types';
import { PhotorealisticGisView } from './PhotorealisticGisView';

interface Globe3DProps {
  facilities: Facility[];
  width?: number;
  height?: number;
}

export const Globe3D = memo(({ facilities, width = 800, height = 400 }: Globe3DProps) => {
  // Photorealistic 3D: pitched satellite view (GIS-style).
  return <PhotorealisticGisView mode="3D" facilities={facilities} width={width} height={height} />;
});

Globe3D.displayName = 'Globe3D';

