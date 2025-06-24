import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import axios from "axios";
import AudioCall from "../components/AudioCall";
import UserPopover from "../components/UserPopover";
import {
  FaPhone,
  FaPaperPlane,
  FaUser,
  FaSignOutAlt,
  FaRocket,
  FaStar,
  FaBell,
  FaMicrophone,
  FaBars,
  FaTimes,
  FaSearch,
  FaUsers,
} from "react-icons/fa";

const AUTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  "https://unifiedchat-auth.onrender.com";
const MESSAGE_API_BASE_URL =
  process.env.NEXT_PUBLIC_MESSAGE_API_URL ||
  "https://unifiedchat-message-service.onrender.com";

export default function Home() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState(4); // Default to Linda
  const [audioServiceStatus, setAudioServiceStatus] = useState("checking");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users] = useState([
    { id: 1, username: "admin" },
    { id: 4, username: "Linda" },
    { id: 5, username: "Hana" },
    { id: 6, username: "Adam" },
    { id: 7, username: "Ahmed" },
    { id: 8, username: "Hamid" },
    { id: 9, username: "Mueen" },
    { id: 10, username: "Nacer" },
  ]);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const chatEndRef = useRef(null);
  const [popoverUser, setPopoverUser] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);

  // Check audio service status
  const checkAudioService = async () => {
    const AUDIO_SERVICE_URL =
      process.env.NEXT_PUBLIC_AUDIO_API_URL ||
      "https://unifiedchat-audio-service.onrender.com";
    try {
      const response = await fetch(`${AUDIO_SERVICE_URL}/health`);
      if (response.ok) {
        setAudioServiceStatus("available");
      } else {
        setAudioServiceStatus("unavailable");
      }
    } catch (error) {
      console.log("Audio service not available:", error);
      setAudioServiceStatus("unavailable");
    }
  };

  useEffect(() => {
    checkAudioService();
  }, []);

  const login = async (e) => {
    e.preventDefault();
    console.log("Login button clicked", loginForm);
    try {
      console.log("Sending login request to:", `${AUTH_API_BASE_URL}/login`);
      const response = await axios.post(
        `${AUTH_API_BASE_URL}/login`,
        loginForm
      );
      console.log("Login response:", response);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed: " + (error.response?.data?.error || error.message));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(`${MESSAGE_API_BASE_URL}/messages`, {
        sender_id: user.id,
        receiver_id: selectedReceiver,
        content: newMessage,
      });

      setMessages((prev) => [...prev, response.data]);
      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      alert(
        "Failed to send message: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(
        `${MESSAGE_API_BASE_URL}/messages/${user.id}`
      );
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, user, selectedReceiver]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserName = (userId) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? foundUser.username : `User ${userId}`;
  };

  const isOwnMessage = (message) => {
    return message.sender_id === user?.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-pink-100 flex flex-col">
      <Head>
        <title>UnifiedChat MVP</title>
        <meta name="description" content="UnifiedChat MVP" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 h-screen max-h-screen overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Enhanced Mobile-First Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-white to-gray-50 border-r shadow-2xl transform transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <FaRocket className="text-yellow-300 animate-bounce" />
                UnifiedChat
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="sm:hidden text-white hover:text-yellow-300 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-blue-100 mt-1 flex items-center gap-1">
              <FaStar
                className="text-yellow-300 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              Slack-style MVP
            </p>
          </div>

          {/* User Info Section */}
          <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <FaUser className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">
                  {user?.username}
                </div>
                <div className="text-xs text-gray-500">Online</div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  setIsLoggedIn(false);
                  setUser(null);
                  setMessages([]);
                }}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <FaSignOutAlt className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                <FaUsers className="text-blue-500" />
                Direct Messages
              </h3>
              {users
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <div key={u.id} className="mb-2">
                    <button
                      onClick={() => {
                        setSelectedReceiver(u.id);
                        setSidebarOpen(false); // Close sidebar on mobile
                      }}
                      className={`group w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 ${
                        selectedReceiver === u.id
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg"
                          : "hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 text-gray-700 border border-transparent hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                selectedReceiver === u.id
                                  ? "bg-white/20"
                                  : "bg-gradient-to-br from-gray-200 to-gray-300"
                              }`}
                            >
                              <FaUser
                                className={`w-5 h-5 ${
                                  selectedReceiver === u.id
                                    ? "text-white"
                                    : "text-gray-600"
                                }`}
                              />
                            </div>
                            <div
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                selectedReceiver === u.id
                                  ? "bg-yellow-300"
                                  : "bg-green-400"
                              } animate-pulse`}
                            ></div>
                          </div>
                          <div className="text-left">
                            <div className="font-medium">@{u.username}</div>
                            <div
                              className={`text-xs ${
                                selectedReceiver === u.id
                                  ? "text-white/80"
                                  : "text-gray-500"
                              }`}
                            >
                              Available for chat
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setPopoverUser(u);
                              setPopoverAnchor(rect);
                            }}
                            className={`p-2 rounded-lg transition-all duration-300 ${
                              selectedReceiver === u.id
                                ? "bg-white/20 text-white hover:bg-white/30"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <FaPhone className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </aside>

        {/* Enhanced Main Chat Area */}
        <section className="flex-1 flex flex-col h-full max-h-screen bg-white shadow-2xl rounded-lg overflow-hidden relative">
          {/* Enhanced Header with Mobile Menu */}
          <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="sm:hidden text-white hover:text-yellow-300 transition-colors"
              >
                <FaBars className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <FaUser className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-lg font-bold text-white">
                    {isLoggedIn
                      ? getUserName(selectedReceiver)
                      : "UnifiedChat MVP"}
                  </span>
                  {isLoggedIn && (
                    <div className="text-xs text-blue-100">Direct Message</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Enhanced Call Button */}
              {isLoggedIn && (
                <button
                  onClick={() => {
                    if (audioServiceStatus === "available") {
                      const callButton = document.querySelector(
                        '.audio-call-container button[title="Start audio call"]'
                      );
                      if (callButton) {
                        callButton.click();
                      } else {
                        alert(
                          "Audio call feature is loading... Please wait a moment and try again."
                        );
                      }
                    } else {
                      alert(
                        "Audio service is not available. Please check if the audio service is deployed."
                      );
                    }
                  }}
                  className={`group relative px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 flex items-center gap-2 font-bold shadow-lg ${
                    audioServiceStatus === "available"
                      ? "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white"
                      : "bg-gradient-to-r from-gray-400 to-gray-500 text-gray-600 cursor-not-allowed"
                  }`}
                  title={
                    audioServiceStatus === "available"
                      ? "Start audio call"
                      : "Audio service unavailable"
                  }
                  disabled={audioServiceStatus !== "available"}
                >
                  {/* Glowing effect */}
                  {audioServiceStatus === "available" && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  )}
                  <FaPhone className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 animate-pulse group-hover:animate-bounce" />
                  <span className="relative z-10 hidden sm:inline">
                    {audioServiceStatus === "checking" ? "..." : "Start Huddle"}
                  </span>
                </button>
              )}

              {/* Audio Call Component (hidden but functional) */}
              {isLoggedIn && (
                <div className="hidden">
                  <AudioCall
                    user={user}
                    selectedReceiver={selectedReceiver}
                    onCallEnd={() => {}}
                    getUserName={getUserName}
                  />
                </div>
              )}
            </div>
          </header>

          {/* Enhanced Login Form */}
          {!isLoggedIn && (
            <div className="flex flex-1 items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50">
              <form
                onSubmit={login}
                className="relative w-full max-w-md bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-8 space-y-6 border-0"
              >
                {/* Glowing ring effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25"></div>

                <div className="relative text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                    <FaRocket className="text-blue-500 animate-bounce" />
                    Welcome Back!
                  </h2>
                  <p className="text-gray-600">Sign in to start chatting</p>
                </div>

                <div className="relative space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      value={loginForm.username}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="group relative w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-xl font-bold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                >
                  {/* Glowing effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <FaUser className="w-4 h-4 animate-pulse group-hover:animate-bounce" />
                    Sign In
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* Enhanced Chat Area */}
          {isLoggedIn && (
            <div className="flex-1 flex flex-col h-full max-h-full">
              <div
                className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-blue-50 via-white to-purple-50"
                style={{ minHeight: 0 }}
              >
                {messages.length === 0 ? (
                  <div className="text-center mt-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <FaRocket className="w-8 h-8 text-white animate-bounce" />
                    </div>
                    <p className="text-gray-500 text-lg font-semibold">
                      No messages yet. Start a conversation! 🚀
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex mb-4 ${
                        isOwnMessage(msg) ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md p-4 rounded-2xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                          isOwnMessage(msg)
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-none"
                            : "bg-gradient-to-r from-gray-100 to-white text-gray-800 rounded-bl-none border border-gray-200"
                        }`}
                      >
                        <div className="text-xs opacity-80 mb-2 flex items-center gap-2">
                          <span className="font-bold">
                            {getUserName(msg.sender_id)}
                          </span>
                          <span className="">{formatTime(msg.created_at)}</span>
                        </div>
                        <div className="break-words whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Enhanced Message Input Bar */}
              <div className="w-full bg-gradient-to-r from-white to-gray-50 border-t p-4 flex items-center gap-3 sticky bottom-0 shadow-lg">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                />

                {/* Enhanced Send Button */}
                <button
                  onClick={sendMessage}
                  className="group relative bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-3 rounded-xl font-bold shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  {/* Glowing effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <FaPaperPlane className="w-4 h-4 relative z-10 animate-pulse group-hover:animate-bounce" />
                  <span className="relative z-10 hidden sm:inline">Send</span>
                </button>

                {/* Enhanced Quick Call Button */}
                <button
                  onClick={() => {
                    const callButton = document.querySelector(
                      ".audio-call-container button"
                    );
                    if (callButton) callButton.click();
                  }}
                  className="group relative bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white p-3 rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg"
                  title="Quick call"
                >
                  {/* Glowing effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <FaPhone className="w-4 h-4 relative z-10 animate-pulse group-hover:animate-bounce" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Render the popover */}
      {popoverUser && popoverAnchor && (
        <UserPopover
          user={popoverUser}
          anchorRect={popoverAnchor}
          onClose={() => setPopoverUser(null)}
          onCall={() => {
            setSelectedReceiver(popoverUser.id);
            setPopoverUser(null);
            setTimeout(() => {
              const callButton = document.querySelector(
                '.audio-call-container button[title="Start audio call"]'
              );
              if (callButton) callButton.click();
            }, 100);
          }}
        />
      )}
    </div>
  );
}
