import { useRef, useEffect } from "react";
import { FaUserAstronaut, FaPhone, FaStar, FaRocket } from "react-icons/fa";

export default function UserPopover({ user, onClose, onCall, anchorRect }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!user || !anchorRect) return null;

  const style = {
    position: "absolute",
    top: anchorRect.bottom + 8,
    left: anchorRect.left,
    zIndex: 100,
    minWidth: 280,
  };

  return (
    <div
      ref={popoverRef}
      style={style}
      className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl shadow-2xl border-0 p-6 flex flex-col items-center animate-fade-in backdrop-blur-sm"
    >
      {/* Glowing ring effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

      {/* Animated avatar with gradient background */}
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg animate-pulse">
          <FaUserAstronaut className="w-10 h-10 text-white animate-bounce" />
        </div>
        {/* Glowing ring around avatar */}
        <div className="absolute -inset-2 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-30 animate-ping"></div>
      </div>

      {/* User info with fun labels */}
      <div className="text-center mb-4">
        <div className="font-bold text-white text-xl mb-1 flex items-center justify-center gap-2">
          {user.username}
          <FaStar
            className="text-yellow-300 animate-spin"
            style={{ animationDuration: "3s" }}
          />
        </div>
        <div className="text-white/80 text-sm mb-2">ID: {user.id}</div>

        {/* Fun status labels */}
        <div className="flex gap-2 justify-center mb-3">
          <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold border border-white/30">
            🚀 Active User
          </span>
          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            ⭐ Premium
          </span>
        </div>
      </div>

      {/* Enhanced call button with animations */}
      <button
        onClick={onCall}
        className="group relative flex items-center gap-3 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl active:scale-95"
      >
        {/* Glowing effect behind button */}
        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>

        <FaPhone className="w-5 h-5 animate-pulse group-hover:animate-bounce" />
        <span className="relative z-10">Start Huddle</span>

        {/* Animated rocket icon */}
        <FaRocket
          className="w-4 h-4 animate-bounce ml-1"
          style={{ animationDelay: "0.5s" }}
        />
      </button>

      {/* Decorative elements */}
      <div className="absolute top-2 right-2">
        <div className="w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
      </div>
      <div className="absolute bottom-2 left-2">
        <div className="w-2 h-2 bg-pink-300 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}
