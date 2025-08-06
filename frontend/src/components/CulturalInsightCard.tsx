import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CulturalInsightCardProps {
  context: {
    title: string;
    description: string;
    source: string;
  };
}

const CulturalInsightCard: React.FC<CulturalInsightCardProps> = ({ context }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{context.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-2">{context.description}</p>
        <p className="text-sm text-gray-500">Source: {context.source}</p>
      </CardContent>
    </Card>
  );
};

export default CulturalInsightCard;
