import { Facility } from '../types';

interface DynamicActionButtonsProps {
  facilities: Facility[];
  onGenerateReport: () => void;
  onOpenChat: () => void;
  isReportOpen: boolean;
  isChatOpen: boolean;
}

export function DynamicActionButtons(_props: DynamicActionButtonsProps) {
  // Don't show floating buttons - they're in the header now
  return null;
}
