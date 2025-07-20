import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaUser,
  FaSearch,
  FaTimes,
  FaPhone,
  FaVideo,
  FaSignOutAlt,
  FaCog,
  FaBars,
} from "react-icons/fa";

const Sidebar = ({
  user,
  users,
  onlineUserIds,
  onUserSelect, // Now receiving onUserSelect as a prop
  onLogout,
  initiateCall,
  initiateVideoCall,
  sendWebSocketMessage,
  callState,
  videoCallState,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [highlightedUser, setHighlightedUser] = useState(null);

  const isUserOnline = useCallback(
    (userId) => onlineUserIds.has(userId),
    [onlineUserIds]
  );

  // Handle user search
  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      if (query.length > 0) {
        const filteredUsers = users.filter(
          (u) =>
            u.username.toLowerCase().includes(query.toLowerCase()) &&
            u.id !== user.id // Exclude the current user from search results
        );
        setSearchResults(filteredUsers);
      } else {
        setSearchResults([]);
      }
    },
    [users, user]
  );

  // Render search results dynamically
  const renderSearchResults = useMemo(() => {
    if (searchQuery.length === 0) return null;

    if (searchResults.length === 0) {
      return <p className="text-gray-400 text-sm p-3">No users found.</p>;
    }

    return (
      <div className="mt-2 bg-gray-700 rounded-md shadow-lg overflow-hidden">
        {searchResults.map((result) => (
          <div
            key={result.id}
            className="flex items-center p-3 hover:bg-gray-600 cursor-pointer transition-colors"
            onClick={() => onUserSelect(result)} // Use onUserSelect prop
            onMouseEnter={() => setHighlightedUser(result.id)}
            onMouseLeave={() => setHighlightedUser(null)}
          >
            <FaUser className="text-gray-400 mr-3" />
            <span className="text-white font-medium">{result.username}</span>
            {isUserOnline(result.id) && (
              <span className="ml-auto text-green-400 text-xs">Online</span>
            )}
          </div>
        ))}
      </div>
    );
  }, [searchQuery, searchResults, isUserOnline, onUserSelect]); // Add onUserSelect to dependencies

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 z-50 p-4">
        <button
          onClick={toggleSidebar}
          className="text-white focus:outline-none"
        >
          {sidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 w-64 bg-gray-800 text-white flex flex-col transition-transform duration-200 ease-in-out z-40`}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Alcall</h2>
          <button
            onClick={toggleSidebar}
            className="md:hidden text-white focus:outline-none"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Current User Profile */}
        {user && (
          <div className="p-4 border-b border-gray-700 flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold mr-3">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{user.username}</span>
            <span className="ml-2 text-green-400 text-xs">(Online)</span>
          </div>
        )}

        {/* Search Input */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
              >
                <FaTimes />
              </button>
            )}
          </div>
          {renderSearchResults} {/* Display search results here */}
        </div>

        {/* Online Users List */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {users.length > 0 && searchQuery.length === 0 ? (
            <ul className="space-y-1 p-3">
              {users.map((u) =>
                u.id !== user.id && isUserOnline(u.id) ? (
                  <li
                    key={u.id}
                    className={`flex items-center p-2 rounded-md group hover:bg-gray-700 cursor-pointer ${
                      highlightedUser === u.id ? "bg-gray-700" : ""
                    }`}
                    onClick={() => onUserSelect(u)} // Use onUserSelect prop
                    onMouseEnter={() => setHighlightedUser(u.id)}
                    onMouseLeave={() => setHighlightedUser(null)}
                  >
                    <FaUser className="text-green-400 mr-3" />
                    <span className="flex-grow truncate">{u.username}</span>
                    {(callState === "idle" || callState === "active") &&
                      (videoCallState === "idle" ||
                        videoCallState === "active") && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateCall(u);
                            }}
                            className="ml-2 text-gray-400 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Start Audio Call"
                          >
                            <FaPhone />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateVideoCall(u);
                            }}
                            className="ml-2 text-gray-400 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Start Video Call"
                          >
                            <FaVideo />
                          </button>
                        </>
                      )}
                  </li>
                ) : null
              )}
            </ul>
          ) : (
            searchQuery.length === 0 && (
              <p className="p-3 text-gray-400 text-sm">
                No other users currently online.
              </p>
            )
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700 mt-auto">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <FaSignOutAlt className="mr-2" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
