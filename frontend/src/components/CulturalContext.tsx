import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CulturalContextProps {
  context: {
    title: string;
    content: string;
  };
}

const CulturalContext: React.FC<CulturalContextProps> = ({ context }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{context.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{context.content}</p>
      </CardContent>
    </Card>
  );
};

export default CulturalContext;
