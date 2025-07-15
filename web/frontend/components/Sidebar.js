import React from "react";
import { FaSignOutAlt, FaSearch, FaPhone, FaVideo } from "react-icons/fa";

export default function Sidebar({
  user,
  onLogout,
  selectedRecipient,
  setSelectedRecipient,
  allUsers,
  onlineUserIds,
  setSidebarOpen,
  sidebarOpen,
  showCallNotification,
  handleSearch,
  renderSearchResults,
  initiateCall, // Add initiateCall prop
  initiateVideoCall, // Add initiateVideoCall prop
}) {
  return (
    <div className="w-64 bg-gray-800 h-screen p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Alcall</h1>
        <button
          onClick={onLogout}
          className="text-gray-400 hover:text-white"
          title="Logout"
        >
          <FaSignOutAlt className="text-xl" />
        </button>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search users..."
          className="w-full pl-10 py-2 bg-gray-700 rounded-md text-white"
          onChange={(e) => handleSearch(e.target.value)}
        />
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
      </div>

      {/* Placeholder for call buttons, will be enabled when a user is selected */}
      {selectedRecipient && (
        <div className="flex justify-around mb-4">
          <button
            onClick={() => initiateCall(selectedRecipient)}
            className="p-2 bg-green-600 rounded-full text-white hover:bg-green-700"
            title="Audio Call"
          >
            <FaPhone />
          </button>
          <button
            onClick={() => initiateVideoCall(selectedRecipient)}
            className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700"
            title="Video Call"
          >
            <FaVideo />
          </button>
        </div>
      )}

      {renderSearchResults()}
    </div>
  );
}
