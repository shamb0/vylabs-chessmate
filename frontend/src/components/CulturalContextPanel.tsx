import React from 'react';
import { CoachingPayload } from '@/lib/schemas';
import CulturalInsightCard from './CulturalInsightCard';
import LanguageHint from './LanguageHint';

interface CulturalContextPanelProps {
  coachingData: CoachingPayload | null;
}

const CulturalContextPanel: React.FC<CulturalContextPanelProps> = ({ coachingData }) => {
  return (
    <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">Cultural Context</h2>
      <div className="flex-grow">
        {!coachingData?.culturalContext && !coachingData?.languageHints && (
          <p className="text-muted-foreground">Cultural and language insights will appear here as you play.</p>
        )}
        {coachingData?.culturalContext && <CulturalInsightCard context={coachingData.culturalContext} />}
      </div>
      <div className="mt-auto">
        {coachingData?.languageHints && <LanguageHint hints={coachingData.languageHints} />}
      </div>
    </div>
  );
};

export default CulturalContextPanel;
