import React from 'react';

const MessageList = ({ messages, currentUser, selectedRecipient }) => {
  if (!messages || !currentUser || !selectedRecipient) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <p className="text-gray-500">Select a user to start chatting</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <p className="text-gray-500">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages
        .filter(
          (msg) =>
            (msg.sender_id === currentUser.id && msg.recipient_id === selectedRecipient.id) ||
            (msg.sender_id === selectedRecipient.id && msg.recipient_id === currentUser.id)
        )
        .map((msg, index, arr) => {
          const isSender = msg.sender_id === currentUser.id;
          const isFirstInGroup = index === 0 || arr[index - 1]?.sender_id !== msg.sender_id;
          
          return (
            <div 
              key={msg.id || index} 
              className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isSender 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-gray-700 text-gray-100 rounded-bl-none'
                }`}
              >
                {isFirstInGroup && !isSender && (
                  <div className="text-xs font-semibold text-gray-300 mb-1">
                    {selectedRecipient.username}
                  </div>
                )}
                <div className="break-words">{msg.content}</div>
                <div className={`text-xs mt-1 text-right ${
                  isSender ? 'text-indigo-200' : 'text-gray-400'
                }`}>
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {isSender && (
                    <span className="ml-1">
                      {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default MessageList;
