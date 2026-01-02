// Labor Rhythm Detector
// Detects characteristic employment patterns around facility opening

import { getQCEWData, QCEWDataPoint } from '../api/bls';

export type LaborSignature = 'construction_cliff' | 'gradual_decline' | 'sustained_employment';
export type RhythmType = 'minimal_permanent' | 'moderate_operations' | 'substantial_operations';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LaborSignatureResult {
  signature: LaborSignature;
  peakEmployment: number;
  steadyStateEmployment: number;
  dropPercentage: number;
  peakQuarter: string;
  transitionQuarter: string;
  rhythmType: RhythmType;
  confidence: ConfidenceLevel;
  dataSource: string;
  rawData: QCEWDataPoint[];
  error?: string;
}

/**
 * Detect labor signature pattern from BLS QCEW data
 * @param countyFips - 5-digit county FIPS code
 * @param facilityOpenDate - Date facility became operational
 * @param naicsCode - NAICS code (default: 518210 for Data Processing)
 * @returns Labor signature analysis
 */
export async function detectLaborSignature(
  countyFips: string,
  facilityOpenDate: string,
  naicsCode: string = '518210'
): Promise<LaborSignatureResult | null> {
  if (countyFips.length !== 5) {
    return {
      signature: 'sustained_employment',
      peakEmployment: 0,
      steadyStateEmployment: 0,
      dropPercentage: 0,
      peakQuarter: '',
      transitionQuarter: '',
      rhythmType: 'minimal_permanent',
      confidence: 'LOW',
      dataSource: 'BLS_QCEW',
      rawData: [],
      error: 'Invalid county FIPS code'
    };
  }

  const stateFips = countyFips.substring(0, 2);
  const countyCode = countyFips.substring(2, 5);

  const openDate = new Date(facilityOpenDate);
  const openYear = openDate.getFullYear();
  const openQuarter = Math.floor(openDate.getMonth() / 3) + 1;

  // Fetch 5 years of data around opening (2 years before, 3 years after)
  const startYear = openYear - 2;
  const endYear = openYear + 3;

  try {
    const data = await getQCEWData(stateFips, countyCode, naicsCode, startYear, endYear);

    if (data.length === 0) {
      return {
        signature: 'sustained_employment',
        peakEmployment: 0,
        steadyStateEmployment: 0,
        dropPercentage: 0,
        peakQuarter: '',
        transitionQuarter: '',
        rhythmType: 'minimal_permanent',
        confidence: 'LOW',
        dataSource: 'BLS_QCEW',
        rawData: [],
        error: 'No QCEW data available for this location and NAICS code'
      };
    }

    // Find peak employment before opening
    const beforeOpening = data.filter(d => {
      const dataYear = d.year;
      const dataQuarter = d.quarter;
      return dataYear < openYear || (dataYear === openYear && dataQuarter < openQuarter);
    });

    const afterOpening = data.filter(d => {
      const dataYear = d.year;
      const dataQuarter = d.quarter;
      return dataYear > openYear || (dataYear === openYear && dataQuarter >= openQuarter);
    });

    if (beforeOpening.length === 0 || afterOpening.length === 0) {
      return {
        signature: 'sustained_employment',
        peakEmployment: 0,
        steadyStateEmployment: 0,
        dropPercentage: 0,
        peakQuarter: '',
        transitionQuarter: '',
        rhythmType: 'minimal_permanent',
        confidence: 'LOW',
        dataSource: 'BLS_QCEW',
        rawData: data,
        error: 'Insufficient data around opening date'
      };
    }

    // Find peak before opening
    const peakPoint = beforeOpening.reduce((max, point) =>
      point.employment > max.employment ? point : max
    );

    // Calculate steady state (average of last 4 quarters after opening, or all if less)
    const steadyStateQuarters = afterOpening.slice(-4);
    const steadyStateEmployment = Math.round(
      steadyStateQuarters.reduce((sum, p) => sum + p.employment, 0) / steadyStateQuarters.length
    );

    const dropPercentage = peakPoint.employment > 0
      ? ((peakPoint.employment - steadyStateEmployment) / peakPoint.employment) * 100
      : 0;

    // Determine signature type
    let signature: LaborSignature;
    if (dropPercentage > 80) {
      signature = 'construction_cliff';
    } else if (dropPercentage > 30) {
      signature = 'gradual_decline';
    } else {
      signature = 'sustained_employment';
    }

    // Determine rhythm type
    let rhythmType: RhythmType;
    if (steadyStateEmployment < 50) {
      rhythmType = 'minimal_permanent';
    } else if (steadyStateEmployment < 200) {
      rhythmType = 'moderate_operations';
    } else {
      rhythmType = 'substantial_operations';
    }

    // Determine confidence
    let confidence: ConfidenceLevel = 'MEDIUM';
    if (data.length >= 16 && beforeOpening.length >= 8 && afterOpening.length >= 8) {
      confidence = 'HIGH';
    } else if (data.length < 8) {
      confidence = 'LOW';
    }

    const peakQuarter = `${peakPoint.year}-Q${peakPoint.quarter}`;
    const transitionQuarter = `${openYear}-Q${openQuarter}`;

    return {
      signature,
      peakEmployment: peakPoint.employment,
      steadyStateEmployment,
      dropPercentage: Math.round(dropPercentage * 10) / 10,
      peakQuarter,
      transitionQuarter,
      rhythmType,
      confidence,
      dataSource: 'BLS_QCEW',
      rawData: data
    };
  } catch (error) {
    return {
      signature: 'sustained_employment',
      peakEmployment: 0,
      steadyStateEmployment: 0,
      dropPercentage: 0,
      peakQuarter: '',
      transitionQuarter: '',
      rhythmType: 'minimal_permanent',
      confidence: 'LOW',
      dataSource: 'BLS_QCEW',
      rawData: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

