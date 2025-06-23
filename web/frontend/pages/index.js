import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import axios from "axios";

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
  const [selectedReceiver, setSelectedReceiver] = useState(2); // Default to user 2
  const [users] = useState([
    { id: 1, username: "admin" },
    { id: 2, username: "user2" },
    { id: 3, username: "user3" },
    { id: 4, username: "Linda" },
    { id: 5, username: "Hana" },
    { id: 6, username: "Adam" },
    { id: 7, username: "Ahmed" },
  ]);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const chatEndRef = useRef(null);

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
                  <button
                    key={u.id}
                    onClick={() => setSelectedReceiver(u.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors duration-150 ${
                      selectedReceiver === u.id
                        ? "bg-blue-100 text-blue-800 font-semibold"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    @{u.username}
                  </button>
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
                <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                  <p>Test Accounts:</p>
                  <p>• admin / password123</p>
                  <p>• user2 / password123</p>
                  <p>• user3 / password123</p>
                </div>
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-600">
                  Connected to: Auth: {AUTH_API_BASE_URL} | Messages:{" "}
                  {MESSAGE_API_BASE_URL}
                </div>
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
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
