import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LanguageHint {
  term: string;
  translation: string;
}

interface LanguageHintsProps {
  hints: LanguageHint[];
}

const LanguageHints: React.FC<LanguageHintsProps> = ({ hints }) => {
  if (!hints || hints.length === 0) {
    return null;
  }

  return (
    <Table>
      <TableCaption>Language Hints</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Term</TableHead>
          <TableHead>Translation</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hints.map((hint, index) => (
          <TableRow key={index}>
            <TableCell>{hint.term}</TableCell>
            <TableCell>{hint.translation}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default LanguageHints;
