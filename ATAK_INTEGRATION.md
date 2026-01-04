# ATAK (Android Team Awareness Kit) Integration

## Overview

ATAK-style geospatial visualization has been integrated into the DCIM Compliance Dashboard, providing military-grade tactical awareness features for infrastructure monitoring.

## Features Implemented

### 1. ATAK Data Format Support (`src/utils/atakFormats.ts`)

- **KML Parser**: Parses KML files to extract points, routes, and areas
- **GPX Parser**: Parses GPX files for waypoints and tracks
- **GeoJSON Converter**: Converts ATAK data structures to GeoJSON for map rendering
- **Data Structures**: 
  - `ATAKPoint` - Individual markers with status (friendly/hostile/neutral/unknown)
  - `ATAKRoute` - Line routes with styling (solid/dashed/dotted)
  - `ATAKArea` - Polygon areas with fill and stroke colors

### 2. ATAK Overlay Component (`src/components/shared/ATAKOverlay.tsx`)

- **Visual Overlays**:
  - Grid overlay (military-style coordinate grid)
  - Compass rose (navigation reference)
  - Status-based point markers
  - Route lines with customizable styles
  - Area polygons with fill and outlines

- **Control Panel**:
  - Toggle grid, compass, and labels
  - Import KML/GPX files
  - Export ATAK data as GeoJSON
  - Real-time stats (points, routes, areas count)

### 3. Map Integration (`src/components/shared/PhotorealisticGisView.tsx`)

- **ATAK Button**: Toggle ATAK overlay on/off
- **Auto-Conversion**: Facilities automatically converted to ATAK points:
  - Compliant → Friendly (Green)
  - Non-Compliant → Hostile (Red)
  - At Risk → Neutral (Yellow)
  - Unknown → Unknown (Gray)

- **Map Layers**:
  - `atak-points` - Status-colored markers
  - `atak-routes` - Route lines with styles
  - `atak-areas` - Filled polygons with outlines

## Usage

### Enabling ATAK Mode

1. Click the **"ATAK"** button in the map controls (top-right)
2. Facilities are automatically converted to ATAK points
3. Green markers = Compliant facilities
4. Red markers = Non-compliant facilities
5. Yellow markers = At-risk facilities

### ATAK Controls

1. Click the **Target icon** button (appears when ATAK is enabled)
2. Control panel opens with:
   - **Grid Overlay**: Toggle coordinate grid
   - **Compass Rose**: Toggle navigation compass
   - **Labels**: Toggle point labels
   - **Import KML/GPX**: Load external geospatial data
   - **Export**: Download current ATAK data as GeoJSON

### Importing Data

1. Open ATAK Control Panel
2. Click **"KML"** or **"GPX"** button
3. Select file from your computer
4. Data is automatically parsed and added to the map

### Status Color Coding

- **Green (#00ff00)**: Friendly/Compliant facilities
- **Red (#ff0000)**: Hostile/Non-compliant facilities
- **Yellow (#ffff00)**: Neutral/At-risk facilities
- **Gray (#808080)**: Unknown status

## Technical Details

### Data Flow

```
Facilities → ATAK Points → GeoJSON → MapLibre Layers → Map Rendering
```

1. Facilities are filtered and converted to `ATAKPoint[]`
2. Points are combined with routes/areas into GeoJSON
3. GeoJSON is added as MapLibre source
4. MapLibre layers render points, routes, and areas

### File Structure

```
src/
├── utils/
│   └── atakFormats.ts          # KML/GPX parsing, GeoJSON conversion
└── components/
    └── shared/
        ├── ATAKOverlay.tsx      # Overlay UI and control panel
        └── PhotorealisticGisView.tsx  # Map integration
```

### MapLibre Layers

- **atak-points**: Circle markers with status-based colors
- **atak-routes**: LineString features with customizable dash patterns
- **atak-areas**: Polygon features with fill and stroke
- **atak-areas-outline**: Outline layer for area boundaries

## Example Use Cases

1. **Compliance Monitoring**: View all facilities as tactical markers
2. **Route Planning**: Import GPX tracks for site visits
3. **Area Analysis**: Draw polygons around regions of interest
4. **Status Tracking**: Color-coded markers show compliance at a glance
5. **Data Exchange**: Export/import with other ATAK-compatible systems

## Future Enhancements

- [ ] Real-time position tracking
- [ ] Team member locations
- [ ] Chat/messaging integration
- [ ] Mission planning tools
- [ ] Advanced symbology (MIL-STD-2525)
- [ ] 3D terrain integration
- [ ] Weather overlay integration
- [ ] Time-based playback

## Integration with Existing Features

- **NLP Search**: ATAK points update when search filters change
- **Filters**: ATAK respects operator, status, and date filters
- **Connectography**: ATAK overlays work with all map modes (2D, 3D, Topology)
- **Error Boundaries**: ATAK components are protected by error boundaries

## Performance

- ATAK conversion is memoized for performance
- Map layers update incrementally (no full map rebuild)
- Large datasets (>10k points) are automatically optimized
- Resource limiters prevent overwhelming the browser

---

**Note**: This is a web-based implementation inspired by ATAK, not the native Android ATAK application. It provides similar tactical awareness visualization capabilities in a browser environment.





