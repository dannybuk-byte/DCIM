import { memo } from 'react';
import { Facility } from '../../types';
import { PhotorealisticGisView } from './PhotorealisticGisView';

interface Map2DProps {
  facilities: Facility[];
  width?: number;
  height?: number;
}

export const Map2D = memo(({ facilities, width = 800, height = 400 }: Map2DProps) => {
  return <PhotorealisticGisView mode="2D" facilities={facilities} width={width} height={height} />;
});

Map2D.displayName = 'Map2D';

