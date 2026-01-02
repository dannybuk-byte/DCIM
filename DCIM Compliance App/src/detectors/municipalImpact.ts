// Municipal Impact Detector
// Detects facility impact on local municipal services

import { getECHOFacilities, getNPDESPermits } from '../api/epa';

export type MunicipalSignature = 'asymmetric_extraction' | 'balanced_contribution' | 'minimal_footprint';

export interface MunicipalSignatureResult {
  signature: MunicipalSignature;
  waterConsumption: {
    gallonsPerYear: number | null;
    percentOfMunicipal: number | null;
    source: string;
  };
  wastewater: {
    npdesPermitId: string | null;
    avgMonthlyDischarge: number | null;
    complianceStatus: string;
  };
  airPermits: {
    count: number;
    generatorCapacity: number | null;
  };
  gridImpact: {
    percentOfLocalCapacity: number | null;
    transmissionConstraints: boolean;
  };
  dataSource: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  error?: string;
}

/**
 * Detect municipal impact signature
 * @param facilityAddress - Facility street address
 * @param countyFips - 5-digit county FIPS code
 * @param zip - ZIP code
 * @returns Municipal impact analysis
 */
export async function detectMunicipalSignature(
  _facilityAddress: string,
  _countyFips: string,
  zip: string
): Promise<MunicipalSignatureResult | null> {
  try {
    // Query EPA ECHO for facilities near this location
    const echoFacilities = await getECHOFacilities(zip, 1);
    
    // Find NPDES permits
    let npdesPermit = null;
    if (echoFacilities.length > 0) {
      // Try to find NPDES permit for facilities matching address
      for (const facility of echoFacilities) {
        const permit = await getNPDESPermits(facility.id);
        if (permit) {
          npdesPermit = permit;
          break;
        }
      }
    }

    // Count air permits (backup generators)
    // This would typically come from EPA Envirofacts or state air quality agencies
    const airPermits = {
      count: echoFacilities.filter(f => f.permitType.includes('Air') || f.permitType.includes('Generator')).length,
      generatorCapacity: null // Would be extracted from permit data
    };

    // Water consumption (would come from municipal utility FOIA or permits)
    // For now, return null - would be populated from actual data sources
    const waterConsumption = {
      gallonsPerYear: null,
      percentOfMunicipal: null,
      source: 'Not disclosed'
    };

    // Grid impact (would come from grid operator capacity data)
    const gridImpact = {
      percentOfLocalCapacity: null,
      transmissionConstraints: false
    };

    // Determine signature based on available data
    let signature: MunicipalSignature = 'minimal_footprint';
    
    if (npdesPermit && npdesPermit.avgMonthlyDischarge && npdesPermit.avgMonthlyDischarge > 1000000) {
      signature = 'asymmetric_extraction';
    } else if (airPermits.count > 0 || npdesPermit) {
      signature = 'balanced_contribution';
    }

    // Determine confidence
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (npdesPermit && airPermits.count > 0) {
      confidence = 'MEDIUM';
    }
    if (waterConsumption.gallonsPerYear !== null && gridImpact.percentOfLocalCapacity !== null) {
      confidence = 'HIGH';
    }

    return {
      signature,
      waterConsumption,
      wastewater: {
        npdesPermitId: npdesPermit?.permitId || null,
        avgMonthlyDischarge: npdesPermit?.avgMonthlyDischarge || null,
        complianceStatus: npdesPermit?.complianceStatus || 'Unknown'
      },
      airPermits,
      gridImpact,
      dataSource: 'EPA_ECHO',
      confidence
    };
  } catch (error) {
    return {
      signature: 'minimal_footprint',
      waterConsumption: {
        gallonsPerYear: null,
        percentOfMunicipal: null,
        source: 'Not available'
      },
      wastewater: {
        npdesPermitId: null,
        avgMonthlyDischarge: null,
        complianceStatus: 'Unknown'
      },
      airPermits: {
        count: 0,
        generatorCapacity: null
      },
      gridImpact: {
        percentOfLocalCapacity: null,
        transmissionConstraints: false
      },
      dataSource: 'EPA_ECHO',
      confidence: 'LOW',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

