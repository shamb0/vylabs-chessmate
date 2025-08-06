import React from 'react';
import { Badge } from '@/components/ui/badge';

interface LanguageHintProps {
  hints: {
    word: string;
    translation: string;
    context: string;
  }[];
}

const LanguageHint: React.FC<LanguageHintProps> = ({ hints }) => {
  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Language Hints</h3>
      {hints.map((hint, index) => (
        <div key={index} className="mb-2 p-2 border rounded-md">
          <div className="flex items-center gap-2">
            <Badge>{hint.word}</Badge>
            <span>-&gt;</span>
            <Badge variant="secondary">{hint.translation}</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">{hint.context}</p>
        </div>
      ))}
    </div>
  );
};

export default LanguageHint;
