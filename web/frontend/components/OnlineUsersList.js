import React, { useState, useEffect } from 'react';
import { FaUser, FaChevronDown, FaChevronUp, FaUserCircle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const OnlineUsersList = ({ users = [] }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const onlineUsers = users.filter(u => u && u.isOnline);
  
  // Auto-hide after 5 seconds if not hovered
  useEffect(() => {
    if (!isHovered) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isHovered]);

  const toggleVisibility = (e) => {
    e.stopPropagation();
    setIsVisible(!isVisible);
  };

  return (
    <motion.div 
      className="fixed right-4 top-4 bg-gray-800/90 backdrop-blur-sm text-white rounded-lg shadow-xl z-50 w-72 overflow-hidden transition-all duration-300 border border-gray-700"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="px-4 py-3 bg-gray-700/80 cursor-pointer flex justify-between items-center hover:bg-gray-700 transition-colors"
        onClick={toggleVisibility}
      >
        <div className="flex items-center">
          <div className="relative mr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <div className="absolute inset-0 rounded-full bg-green-500 opacity-75 animate-ping"></div>
          </div>
          <h3 className="font-semibold text-sm">
            Online Users <span className="text-gray-400">({onlineUsers.length})</span>
          </h3>
        </div>
        <motion.span 
          className="text-gray-400 hover:text-white transition-colors"
          animate={{ rotate: isVisible ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <FaChevronUp size={14} />
        </motion.span>
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            className="max-h-[60vh] overflow-y-auto custom-scrollbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {onlineUsers.length > 0 ? (
              <ul className="divide-y divide-gray-700/50">
                {onlineUsers.map((user) => (
                  <motion.li
                    key={user.id}
                    className="flex items-center p-3 hover:bg-gray-700/50 transition-colors duration-200 group"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative mr-3 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                        <FaUserCircle className="text-white text-xl" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-800"></div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.username}</p>
                      <p className="text-xs text-green-400">Online now</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                No users currently online
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Add some global styles for the custom scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </motion.div>
  );
};

export default OnlineUsersList;
