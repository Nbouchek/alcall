import React from 'react';
import { FaUser } from 'react-icons/fa';

const OnlineUsersList = ({ users }) => (
  <div className="fixed right-4 top-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-h-[60vh] overflow-y-auto min-w-[200px]">
    <h3 className="text-lg font-bold mb-2">
      Online ({users.filter((u) => u.isOnline).length})
    </h3>
    {users.filter(u => u.isOnline).length > 0 ? (
      <ul className="space-y-2">
        {users
          .filter((u) => u.isOnline)
          .map((user) => (
            <li
              key={user.id}
              className="flex items-center p-2 hover:bg-gray-700 rounded transition"
            >
              <div className="relative mr-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span>{user.username}</span>
            </li>
          ))}
      </ul>
    ) : (
      <p>No users online</p>
    )}
  </div>
);

export default OnlineUsersList;
