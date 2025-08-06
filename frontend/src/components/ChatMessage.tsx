import React from 'react';
import { CoachingPayload } from '@/lib/schemas';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: CoachingPayload;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const getAvatarForStage = (stage: 'Novice' | 'Developing' | 'Expert') => {
    switch (stage) {
      case 'Novice':
        return { initial: 'N', color: 'bg-blue-500' };
      case 'Developing':
        return { initial: 'D', color: 'bg-green-500' };
      case 'Expert':
        return { initial: 'E', color: 'bg-purple-500' };
      default:
        return { initial: 'C', color: 'bg-gray-500' };
    }
  };

  const { initial, color } = getAvatarForStage(message.cognitiveStage);

  return (
    <div className="flex items-start gap-4 mb-4">
      <Avatar>
        <AvatarFallback className={`${color} text-white`}>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex-grow">
        <p className="font-bold">{message.cognitiveStage} Coach</p>
        <p>{message.message}</p>
      </div>
    </div>
  );
};

export default ChatMessage;