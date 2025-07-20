import React from 'react';
import { FaPhone, FaVideo, FaEllipsisV, FaSearch, FaArrowLeft } from 'react-icons/fa';
import { useRouter } from 'next/router';

const ChatHeader = ({ 
  recipient, 
  isOnline, 
  onCall, 
  onVideoCall, 
  onBack,
  showBackButton = false
}) => {
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center space-x-3">
        {showBackButton && (
          <button 
            onClick={onBack || (() => router.back())}
            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
        )}
        
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
            {recipient?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
          )}
        </div>
        
        <div>
          <h2 className="font-semibold text-white">{recipient?.username || 'Chat'}</h2>
          <p className="text-xs text-gray-400">
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => onCall?.(recipient)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Audio call"
        >
          <FaPhone className="h-5 w-5" />
        </button>
        
        <button 
          onClick={() => onVideoCall?.(recipient)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Video call"
        >
          <FaVideo className="h-5 w-5" />
        </button>
        
        <button 
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Search conversation"
        >
          <FaSearch className="h-5 w-5" />
        </button>
        
        <div className="relative">
          <button 
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
            aria-label="More options"
          >
            <FaEllipsisV className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
