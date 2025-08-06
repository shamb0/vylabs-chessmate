import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CoachingPayload } from '@/lib/schemas';
import ChatMessage from './ChatMessage';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ConversationPanelProps {
  messageHistory: CoachingPayload[];
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({ messageHistory }) => {
  return (
    <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">Conversation</h2>
      <ScrollArea className="flex-grow mb-4 pr-4">
        {messageHistory.length === 0 && (
          <p className="text-muted-foreground">Welcome to ChessMate! Make a move to begin your coaching session.</p>
        )}
        {messageHistory.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
      </ScrollArea>
      <div className="flex gap-2 mt-auto">
        <Input placeholder="Ask a follow-up question..." />
        <Button>Send</Button>
      </div>
    </div>
  );
};

export default ConversationPanel;
