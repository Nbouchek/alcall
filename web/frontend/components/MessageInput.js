import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaMicrophone, FaPaperclip, FaSmile } from 'react-icons/fa';

const MessageInput = ({ value, onChange, onSend, onTyping }) => {
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  
  const handleKeyDown = (e) => {
    // Send message on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend();
      }
    }
  };

  const handleChange = (e) => {
    onChange(e.target.value);
    if (onTyping) {
      onTyping();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  return (
    <div className="border-t border-gray-700 bg-gray-800 p-3">
      {/* Attachment and emoji buttons */}
      <div className="flex items-center mb-2 px-2">
        <button 
          type="button" 
          className="p-2 text-gray-400 hover:text-indigo-400 rounded-full hover:bg-gray-700 transition-colors"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <FaPaperclip />
          <input type="file" id="file-upload" className="hidden" />
        </button>
        <button 
          type="button" 
          className="p-2 text-gray-400 hover:text-indigo-400 rounded-full hover:bg-gray-700 transition-colors ml-1"
        >
          <FaSmile />
        </button>
      </div>
      
      <div className="flex items-end bg-gray-700 rounded-lg border border-gray-600 focus-within:border-indigo-500 transition-colors">
        {/* Text input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows="1"
            className="w-full bg-transparent border-0 text-white placeholder-gray-400 resize-none focus:ring-0 focus:outline-none p-3 max-h-40 overflow-y-auto"
          />
        </div>
        
        {/* Send/Voice button */}
        <div className="flex items-center p-2">
          {value.trim() ? (
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim()}
              className="p-2 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaPaperPlane className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              className="p-2 rounded-full text-gray-400 hover:text-indigo-400 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
            >
              <FaMicrophone className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Typing indicator */}
      {isTyping && (
        <div className="text-xs text-gray-400 mt-1 px-2">
          typing...
        </div>
      )}
    </div>
  );
};

export default MessageInput;
