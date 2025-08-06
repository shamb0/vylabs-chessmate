import React from 'react';
import { CognitiveStageBadge } from '@/components/CognitiveStageBadge';
import CulturalContext from '@/components/CulturalContext';
import LanguageHints from '@/components/LanguageHints';
import { CoachingPayload } from '@/lib/schemas';

interface CoachingPanelProps {
  coachingData: CoachingPayload | null;
}

const CoachingPanel: React.FC<CoachingPanelProps> = ({ coachingData }) => {
  if (!coachingData) {
    return (
      <div className="coaching-panel">
        <h2>Coaching Co-Pilot</h2>
        <p>Welcome to ChessMate! Make your first move to begin.</p>
      </div>
    );
  }

  const { message, cognitiveStage, culturalContext, languageHints } = coachingData;

  return (
    <div className="coaching-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <h2>Coaching Co-Pilot</h2>
        <CognitiveStageBadge stage={cognitiveStage} />
      </div>
      <div className="coaching-message">
        <p>{message}</p>
      </div>
      {culturalContext && <CulturalContext context={culturalContext} />}
      {languageHints && <LanguageHints hints={languageHints} />}
    </div>
  );
};

export default CoachingPanel;