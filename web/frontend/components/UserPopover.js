import { useRef, useEffect } from "react";

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
    minWidth: 220,
  };

  return (
    <div
      ref={popoverRef}
      style={style}
      className="bg-white rounded-xl shadow-2xl border p-4 flex flex-col items-center animate-fade-in"
    >
      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
        <svg
          className="w-10 h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <div className="font-bold text-lg mb-1">{user.username}</div>
      <div className="text-xs text-gray-500 mb-4">ID: {user.id}</div>
      <button
        onClick={onCall}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        Huddle
      </button>
    </div>
  );
}
