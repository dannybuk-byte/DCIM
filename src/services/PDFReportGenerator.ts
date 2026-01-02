/**
 * PDF Report Generator for DCIM Command Center
 * 
 * Generates professional compliance reports using jsPDF
 * - Executive Summary
 * - Facility Analysis
 * - Subsidy Gap Tracking
 * - Pattern Lab Findings
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Facility, ComplianceStats } from '../types';
import type { PatternLabOutput, PatternFinding } from '../analyzers/patternLab/types';
import { formatCurrency } from '../utils/formatting';

// PDF Theme Colors
const COLORS = {
  primary: [0, 210, 211] as [number, number, number],     // Cyan
  danger: [255, 71, 87] as [number, number, number],      // Red
  warning: [255, 165, 2] as [number, number, number],     // Yellow/Orange
  success: [46, 213, 115] as [number, number, number],    // Green
  dark: [10, 14, 23] as [number, number, number],         // Dark bg
  text: [232, 238, 246] as [number, number, number],      // Light text
  textMuted: [90, 109, 138] as [number, number, number],  // Muted text
};

// Report configuration
export interface ReportConfig {
  title?: string;
  subtitle?: string;
  includeExecutiveSummary?: boolean;
  includeFacilityList?: boolean;
  includePatternLab?: boolean;
  includeTopViolators?: boolean;
  includeStateBreakdown?: boolean;
  maxFacilities?: number;
  maxFindings?: number;
}

const DEFAULT_CONFIG: ReportConfig = {
  title: 'DCIM Compliance Report',
  subtitle: 'Global Infrastructure Command Center',
  includeExecutiveSummary: true,
  includeFacilityList: true,
  includePatternLab: true,
  includeTopViolators: true,
  includeStateBreakdown: true,
  maxFacilities: 50,
  maxFindings: 20,
};

/**
 * Generate a comprehensive PDF report
 */
export async function generateComplianceReport(
  facilities: Facility[],
  stats: ComplianceStats,
  patternLabOutput?: PatternLabOutput,
  config: ReportConfig = {}
): Promise<Blob> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let yPos = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Helper: Add page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
      return true;
    }
    return false;
  };

  // =========================================================================
  // HEADER / TITLE PAGE
  // =========================================================================
  
  // Background header bar
  doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Title
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(cfg.title || 'DCIM Compliance Report', margin, 25);

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
  doc.text(cfg.subtitle || 'Global Infrastructure Command Center', margin, 35);

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 45);

  yPos = 60;

  // =========================================================================
  // EXECUTIVE SUMMARY
  // =========================================================================
  
  if (cfg.includeExecutiveSummary) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, yPos);
    yPos += 10;

    // Key metrics boxes
    const boxWidth = (contentWidth - 10) / 4;
    const boxHeight = 25;
    const metrics = [
      { label: 'Total Facilities', value: stats.totalFacilities.toString(), color: COLORS.primary },
      { label: 'Non-Compliant', value: stats.nonCompliant.toString(), color: COLORS.danger },
      { label: 'At Risk', value: stats.atRisk.toString(), color: COLORS.warning },
      { label: 'Subsidy Gap', value: formatCurrency(stats.totalSubsidyGap), color: COLORS.danger },
    ];

    metrics.forEach((m, i) => {
      const x = margin + i * (boxWidth + 3.33);
      
      // Box background
      doc.setFillColor(m.color[0], m.color[1], m.color[2]);
      doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, 'F');
      
      // Value
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(m.value, x + boxWidth / 2, yPos + 10, { align: 'center' });
      
      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(m.label, x + boxWidth / 2, yPos + 18, { align: 'center' });
    });

    yPos += boxHeight + 15;

    // Compliance breakdown paragraph
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const complianceRate = ((stats.compliant / stats.totalFacilities) * 100).toFixed(1);
    const nonComplianceRate = ((stats.nonCompliant / stats.totalFacilities) * 100).toFixed(1);
    const avgGap = stats.nonCompliant > 0 
      ? formatCurrency(stats.totalSubsidyGap / stats.nonCompliant)
      : '$0';

    const summaryText = `This report analyzes ${stats.totalFacilities.toLocaleString()} data center facilities across the monitoring network. ` +
      `Current compliance rate stands at ${complianceRate}%, with ${stats.nonCompliant} facilities (${nonComplianceRate}%) flagged as non-compliant. ` +
      `The total documented subsidy gap is ${formatCurrency(stats.totalSubsidyGap)}, averaging ${avgGap} per non-compliant facility. ` +
      `${stats.atRisk} facilities are currently under review and classified as "At Risk."`;

    const lines = doc.splitTextToSize(summaryText, contentWidth);
    doc.text(lines, margin, yPos);
    yPos += lines.length * 5 + 10;
  }

  // =========================================================================
  // TOP VIOLATORS
  // =========================================================================
  
  if (cfg.includeTopViolators) {
    checkPageBreak(60);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Non-Compliant Facilities', margin, yPos);
    yPos += 8;

    const topFacilities = facilities
      .filter(f => f.complianceStatus === 'Non-Compliant')
      .sort((a, b) => b.subsidyGap - a.subsidyGap)
      .slice(0, 10);

    if (topFacilities.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Facility', 'Operator', 'State', 'Subsidy Gap', 'Issues']],
        body: topFacilities.map(f => [
          f.name,
          f.operator,
          f.state,
          formatCurrency(f.subsidyGap),
          f.issues.length.toString(),
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: COLORS.danger,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 20 },
        },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('No non-compliant facilities found.', margin, yPos);
      yPos += 10;
    }
  }

  // =========================================================================
  // STATE BREAKDOWN
  // =========================================================================
  
  if (cfg.includeStateBreakdown) {
    checkPageBreak(80);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance by State', margin, yPos);
    yPos += 8;

    // Aggregate by state
    const stateData = new Map<string, { total: number; nonCompliant: number; gap: number }>();
    facilities.forEach(f => {
      const current = stateData.get(f.state) || { total: 0, nonCompliant: 0, gap: 0 };
      current.total++;
      if (f.complianceStatus === 'Non-Compliant') {
        current.nonCompliant++;
        current.gap += f.subsidyGap;
      }
      stateData.set(f.state, current);
    });

    const stateRows = Array.from(stateData.entries())
      .sort((a, b) => b[1].gap - a[1].gap)
      .slice(0, 15)
      .map(([state, data]) => [
        state,
        data.total.toString(),
        data.nonCompliant.toString(),
        `${((data.nonCompliant / data.total) * 100).toFixed(1)}%`,
        formatCurrency(data.gap),
      ]);

    if (stateRows.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['State', 'Total', 'Non-Compliant', 'Rate', 'Subsidy Gap']],
        body: stateRows,
        theme: 'striped',
        headStyles: {
          fillColor: COLORS.primary,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // =========================================================================
  // PATTERN LAB FINDINGS
  // =========================================================================
  
  if (cfg.includePatternLab && patternLabOutput && patternLabOutput.findings.length > 0) {
    checkPageBreak(80);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Pattern Lab Findings', margin, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${patternLabOutput.summary.totalFindings} patterns detected • ` +
      `${patternLabOutput.summary.critical} critical • ` +
      `${patternLabOutput.summary.high} high priority`, margin, yPos);
    yPos += 8;

    const findings = patternLabOutput.findings.slice(0, cfg.maxFindings || 20);

    findings.forEach((finding, index) => {
      if (checkPageBreak(30)) {
        // Re-add section header on new page
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Pattern Lab Findings (continued)', margin, yPos);
        yPos += 8;
      }

      // Severity indicator
      const severityColor = finding.severity === 'critical' ? COLORS.danger :
                           finding.severity === 'high' ? COLORS.warning :
                           finding.severity === 'medium' ? COLORS.primary : COLORS.success;

      doc.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.rect(margin, yPos - 3, 3, 12, 'F');

      // Finding title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${finding.title}`, margin + 5, yPos);
      
      // Severity badge
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      doc.text(finding.severity.toUpperCase(), margin + 5, yPos + 4);
      
      // Score
      doc.setTextColor(100, 100, 100);
      doc.text(`Score: ${(finding.score * 100).toFixed(0)}%`, margin + 30, yPos + 4);

      yPos += 8;

      // Description
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const descLines = doc.splitTextToSize(finding.description, contentWidth - 10);
      doc.text(descLines, margin + 5, yPos);
      yPos += descLines.length * 3.5 + 5;
    });
  }

  // =========================================================================
  // FULL FACILITY LIST
  // =========================================================================
  
  if (cfg.includeFacilityList) {
    doc.addPage();
    yPos = 20;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Complete Facility List', margin, yPos);
    yPos += 8;

    const facilitiesToShow = facilities.slice(0, cfg.maxFacilities || 50);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Name', 'Operator', 'Location', 'Status', 'Gap']],
      body: facilitiesToShow.map((f, i) => [
        (i + 1).toString(),
        f.name.length > 30 ? f.name.substring(0, 27) + '...' : f.name,
        f.operator,
        `${f.city}, ${f.state}`,
        f.complianceStatus,
        formatCurrency(f.subsidyGap),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 45 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        // Color-code status column
        if (data.column.index === 4 && data.section === 'body') {
          const status = data.cell.text[0];
          if (status === 'Non-Compliant') {
            data.cell.styles.textColor = COLORS.danger;
          } else if (status === 'At Risk') {
            data.cell.styles.textColor = COLORS.warning;
          } else if (status === 'Compliant') {
            data.cell.styles.textColor = COLORS.success;
          }
        }
      },
    });
  }

  // =========================================================================
  // FOOTER ON ALL PAGES
  // =========================================================================
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `DCIM Compliance Report • Page ${i} of ${pageCount} • Generated ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Return as blob
  return doc.output('blob');
}

/**
 * Download the generated PDF
 */
export async function downloadComplianceReport(
  facilities: Facility[],
  stats: ComplianceStats,
  patternLabOutput?: PatternLabOutput,
  config?: ReportConfig,
  filename?: string
): Promise<void> {
  const blob = await generateComplianceReport(facilities, stats, patternLabOutput, config);
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `dcim-compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a quick summary PDF (single page)
 */
export async function generateQuickSummary(
  facilities: Facility[],
  stats: ComplianceStats
): Promise<Blob> {
  return generateComplianceReport(facilities, stats, undefined, {
    title: 'DCIM Quick Summary',
    includeExecutiveSummary: true,
    includeFacilityList: false,
    includePatternLab: false,
    includeTopViolators: true,
    includeStateBreakdown: false,
  });
}

