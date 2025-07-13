import React from 'react';
import { FaUser, FaPhone, FaVideo, FaPaperPlane } from 'react-icons/fa';

export default function ChatInterface({
  selectedRecipient,
  isUserOnline,
  messages,
  newMessage,
  setNewMessage,
  handleSendMessage,
  user,
  initiateCall,
  initiateVideoCall,
  handleLogout,
  handleSearch,
  renderSearchResults
}) {
  if (!selectedRecipient) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to Alcall</h2>
          <p className="text-gray-400 mb-6">Select a user to start chatting</p>
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Quick Tips</h3>
            <ul className="text-gray-400 text-left space-y-2">
              <li className="flex items-start">
                <FaUser className="text-indigo-500 mt-1 mr-2" />
                <span>Click on a user to start chatting</span>
              </li>
              <li className="flex items-start">
                <FaPhone className="text-green-500 mt-1 mr-2" />
                <span>Make audio calls with the phone button</span>
              </li>
              <li className="flex items-start">
                <FaVideo className="text-blue-500 mt-1 mr-2" />
                <span>Start video calls with the video button</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
              <FaUser className="text-xl text-white" />
            </div>
            {isUserOnline(selectedRecipient.username) && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
            )}
          </div>
          <div className="ml-3">
            <div className="font-bold text-lg">{selectedRecipient.username}</div>
            <div className="text-sm text-gray-400">
              {isUserOnline(selectedRecipient.username) ? 'Online now' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => initiateCall(selectedRecipient)}
            className="p-2 bg-green-600 rounded-full text-white hover:bg-green-700"
          >
            <FaPhone />
          </button>
          <button
            onClick={() => initiateVideoCall(selectedRecipient)}
            className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700"
          >
            <FaVideo />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages
          .filter(
            (msg) =>
              (msg.sender === user?.username && msg.recipient === selectedRecipient?.username) ||
              (msg.sender === selectedRecipient?.username && msg.recipient === user?.username)
          )
          .map((msg, index, arr) => {
            const isSender = msg.sender === user?.username;
            const isFirstInGroup = index === 0 || arr[index - 1].sender !== msg.sender;
            return (
              <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-xs ${isSender ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 bg-gray-700 rounded-l-md text-white focus:outline-none"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            className="bg-indigo-600 text-white p-2 rounded-r-md hover:bg-indigo-700"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}
