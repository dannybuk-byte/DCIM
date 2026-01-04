# OSINT Data Integration

This document describes the OSINT (Open Source Intelligence) data integration system implemented in the DCIM Compliance App.

## Overview

The application now integrates with real OSINT data sources to replace mock data generation. Data is fetched from multiple public APIs, cached in IndexedDB, and displayed with data source attribution.

## Architecture

### DataFetcher Service (`src/services/DataFetcher.ts`)

The `DataFetcher` service provides a unified interface for fetching data from multiple OSINT sources:

- **PeeringDB**: Interconnection data, network facilities, carrier-neutral status
- **SEC EDGAR**: Company filings and regulatory data
- **EPA ECHO**: Environmental compliance records
- **OSHA**: Safety violation data
- **Good Jobs First**: Subsidy and incentive tracking
- **Cloudflare Radar**: Edge location data
- **CRT.SH**: Certificate transparency logs for domain discovery

### Data Caching

All API responses are cached in IndexedDB with configurable TTL:
- SEC EDGAR: 7 days
- EPA ECHO: 30 days
- OSHA: 30 days
- PeeringDB: 1 day
- Default: 1 day

Cache supports:
- Offline fallback (uses expired cache if API unavailable)
- Automatic expiration cleanup
- Data provenance tracking

### Data Source Tracking

Each data field tracks its source with the `DataSourceType` enum:
- **Verified Sources**: PeeringDB, SEC_EDGAR, EPA_ECHO, OSHA, CRT_SH (green badges)
- **Estimated/Synthetic**: Estimated, Synthetic (yellow badges)
- **Other Sources**: GoodJobsFirst, StateAuditor, FOIA (gray badges)

## Implementation Details

### Facility Details Service (`src/services/getFacilityDetails.ts`)

The `getFacilityDetails` function:
1. Fetches OSINT data from all sources via `DataFetcher`
2. Extracts real data when available (e.g., PeeringDB network carriers)
3. Falls back to synthetic data when OSINT unavailable
4. Tracks data source for each field in a `Map<string, DataSourceType>`

### UI Integration

The `StateReport` component displays data sources using:
- **DataSourceBadge**: Color-coded badges showing source type
- **DetailRowWithSource**: Enhanced detail rows with source attribution

Data sources are displayed:
- Next to field labels in expanded facility rows
- With visual indicators (green = verified, yellow = estimated)
- In the Public Records tab with full provenance

## API Endpoints

### PeeringDB
- URL: `https://peeringdb.com/api/net`
- Returns: Network facility data, interconnection details
- Use: Network carriers, cross-connects, carrier-neutral status

### EPA ECHO
- URL: `https://echodata.epa.gov/echo/echo_rest_services.get_facilities`
- Returns: Environmental compliance records
- Use: EPA facility IDs, compliance history

### CRT.SH
- URL: `https://crt.sh/?q={domain}&output=json`
- Returns: Certificate transparency logs
- Use: Domain discovery, facility identification

### SEC EDGAR
- URL: `https://www.sec.gov/cgi-bin/browse-edgar`
- Note: Requires proper headers and CIK lookup for full integration
- Use: Company filings, regulatory compliance

## Future Enhancements

1. **State Auditor APIs**: Direct integration with state compliance databases
2. **FOIA Repositories**: Automated access to public records
3. **Submarine Cable Map**: Network infrastructure mapping
4. **BGP Toolkit**: Routing and network analysis
5. **Real-time Updates**: Webhook-based cache invalidation
6. **Batch Fetching**: Optimize API calls for multiple facilities

## Usage

The OSINT integration is automatic when viewing facility details. When a user expands a facility row:

1. System checks cache for existing data
2. If cache miss or expired, fetches from APIs
3. Displays data with source badges
4. Falls back to synthetic data if APIs unavailable

All data fetching respects rate limits and includes error handling for network failures.

