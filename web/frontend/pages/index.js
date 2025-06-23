import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import axios from "axios";
import AudioCall from "../components/AudioCall";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 flex flex-col">
      <Head>
        <title>UnifiedChat MVP</title>
        <meta name="description" content="UnifiedChat MVP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 h-screen max-h-screen overflow-hidden">
        {/* Sidebar */}
        {isLoggedIn && (
          <aside className="hidden sm:flex flex-col w-64 bg-white border-r shadow-lg z-10">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-blue-600 tracking-tight">
                UnifiedChat
              </h2>
              <p className="text-xs text-gray-500 mt-1">Slack-style MVP</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Users
              </h3>
              {users
                .filter((u) => u.id !== user?.id)
                .map((u) => (
                  <div key={u.id} className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setSelectedReceiver(u.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors duration-150 ${
                        selectedReceiver === u.id
                          ? "bg-blue-100 text-blue-800 font-semibold"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>@{u.username}</span>
                        <div className="flex items-center gap-1">
                          {/* Call indicator - you can add logic here to show when user is in call */}
                          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        </div>
                      </div>
                    </button>
                    {/* Call button for each user */}
                    <button
                      onClick={() => {
                        setSelectedReceiver(u.id);
                        // Trigger call for this specific user
                        setTimeout(() => {
                          const callButton = document.querySelector(
                            '.audio-call-container button[title="Start audio call"]'
                          );
                          if (callButton) {
                            callButton.click();
                          }
                        }, 100);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition"
                      title={`Call ${u.username}`}
                    >
                      <svg
                        className="w-3 h-3"
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
                    </button>
                  </div>
                ))}
            </div>
            <div className="p-4 border-t text-xs text-gray-400">
              <span>Logged in as </span>
              <span className="font-semibold text-blue-700">
                {user?.username}
              </span>
            </div>
          </aside>
        )}
        {/* Main Chat Area */}
        <section className="flex-1 flex flex-col h-full max-h-screen bg-white shadow-md rounded-lg overflow-hidden relative">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b bg-blue-50 shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-700">
                {isLoggedIn ? getUserName(selectedReceiver) : "UnifiedChat MVP"}
              </span>
              {isLoggedIn && (
                <span className="text-xs text-gray-400">(Direct Message)</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Prominent Call Button */}
              {isLoggedIn && (
                <button
                  onClick={() => {
                    if (audioServiceStatus === "available") {
                      // Trigger call from AudioCall component
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
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium ${
                    audioServiceStatus === "available"
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-gray-400 text-gray-600 cursor-not-allowed"
                  }`}
                  title={
                    audioServiceStatus === "available"
                      ? "Start audio call"
                      : "Audio service unavailable"
                  }
                  disabled={audioServiceStatus !== "available"}
                >
                  <svg
                    className="w-4 h-4"
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
                  {audioServiceStatus === "checking" ? "..." : "Call"}
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

              {isLoggedIn && (
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    setIsLoggedIn(false);
                    setUser(null);
                    setMessages([]);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded transition"
                >
                  Logout
                </button>
              )}
            </div>
          </header>
          {/* Login Form */}
          {!isLoggedIn && (
            <div className="flex flex-1 items-center justify-center p-4">
              <form
                onSubmit={login}
                className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-6"
              >
                <h2 className="text-2xl font-bold text-center text-blue-700 mb-2">
                  Login
                </h2>
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
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
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 transition"
                >
                  Login
                </button>
              </form>
            </div>
          )}
          {/* Chat Area */}
          {isLoggedIn && (
            <div className="flex-1 flex flex-col h-full max-h-full">
              <div
                className="flex-1 overflow-y-auto px-2 py-4 sm:px-6 bg-gradient-to-b from-blue-50 to-white"
                style={{ minHeight: 0 }}
              >
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-center mt-8">
                    No messages yet. Start a conversation!
                  </p>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex mb-3 ${
                        isOwnMessage(msg) ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-md p-3 rounded-2xl shadow-md ${
                          isOwnMessage(msg)
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-gray-200 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        <div className="text-xs opacity-70 mb-1 flex items-center gap-2">
                          <span className="font-semibold">
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
              {/* Message Input Bar */}
              <div className="w-full bg-white border-t p-3 flex items-center gap-2 sticky bottom-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Send
                </button>
                {/* Quick call button */}
                <button
                  onClick={() => {
                    // This will trigger the call from the AudioCall component
                    const callButton = document.querySelector(
                      ".audio-call-container button"
                    );
                    if (callButton) callButton.click();
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition"
                  title="Quick call"
                >
                  <svg
                    className="w-4 h-4"
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
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
