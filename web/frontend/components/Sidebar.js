import React, { useState, useCallback } from "react";
import {
  FaSignOutAlt,
  FaSearch,
  FaPhone,
  FaVideo,
  FaUser,
} from "react-icons/fa";

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
  initiateCall, // Add initiateCall prop
  initiateVideoCall, // Add initiateVideoCall prop
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      if (query.length > 0 && allUsers.length > 0) {
        const filteredUsers = allUsers.filter((u) =>
          u.username.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredUsers);
      } else {
        setSearchResults([]);
      }
    },
    [allUsers, setSearchQuery, setSearchResults]
  );

  const selectChatUser = useCallback(
    (userToSelect) => {
      setSelectedRecipient(userToSelect);
      setSearchQuery(""); // Clear search query
      setSearchResults([]); // Clear search results
      setSidebarOpen(false); // Close sidebar on mobile after selecting user
    },
    [setSelectedRecipient, setSearchQuery, setSearchResults, setSidebarOpen]
  );

  const renderSearchResults = useCallback(() => {
    if (searchQuery.length === 0) return null;
    if (searchResults.length === 0) {
      return <div className="p-4 text-gray-400">No users found.</div>;
    }
    return (
      <div className="mt-2 bg-gray-700 rounded-md shadow-lg">
        {searchResults.map((result) => (
          <div
            key={result.id}
            className="flex items-center p-3 hover:bg-gray-600 cursor-pointer"
            onClick={() => selectChatUser(result)}
          >
            <FaUser className="text-gray-400 mr-3" />
            <span className="text-white">{result.username}</span>
            {onlineUserIds.has(result.id) && (
              <span className="ml-auto text-green-400 text-xs">Online</span>
            )}
          </div>
        ))}
      </div>
    );
  }, [searchQuery, searchResults, onlineUserIds, selectChatUser]);

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
