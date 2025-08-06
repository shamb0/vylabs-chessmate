import React from 'react';
import { Badge } from '@/components/ui/badge'; // Import the new Shadcn Badge

interface CognitiveStageBadgeProps {
  stage: 'Novice' | 'Developing' | 'Expert';
}

const CognitiveStageBadge: React.FC<CognitiveStageBadgeProps> = ({ stage }) => {
  // We can add variant logic here later if we want different colors
  // e.g., variant={stage === 'Expert' ? 'destructive' : 'default'}
  return (
    <Badge variant="outline">
      {stage}
    </Badge>
  );
};

export { CognitiveStageBadge };