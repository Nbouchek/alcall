import { useState, useEffect } from "react";
import Head from "next/head";
import axios from "axios";

// Use environment variable for API base URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://unifiedchat-auth.onrender.com";

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
  ]);

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const login = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, loginForm);
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setIsLoggedIn(true);
    } catch (error) {
      alert("Login failed: " + (error.response?.data?.error || error.message));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/messages`, {
        sender_id: user.id,
        receiver_id: selectedReceiver,
        content: newMessage,
      });

      setMessages((prev) => [...prev, response.data]);
      setNewMessage("");
    } catch (error) {
      alert(
        "Failed to send message: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/messages/${user.id}`);
      setMessages(response.data);
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
  }, [isLoggedIn, user]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getUserName = (userId) => {
    const foundUser = users.find((u) => u.id === userId);
    return foundUser ? foundUser.username : `User ${userId}`;
  };

  const isOwnMessage = (message) => {
    return message.sender_id === user?.id;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>UnifiedChat MVP</title>
        <meta name="description" content="UnifiedChat MVP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">UnifiedChat MVP</h1>

        {!isLoggedIn ? (
          <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Login</h2>
            <form onSubmit={login}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
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
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
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
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Login
              </button>
            </form>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-2">Test Accounts:</p>
              <p className="text-xs text-gray-500">• admin / password123</p>
              <p className="text-xs text-gray-500">• user2 / password123</p>
              <p className="text-xs text-gray-500">• user3 / password123</p>
            </div>
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <p className="text-xs text-blue-600">
                Connected to: {API_BASE_URL}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md">
            <div className="p-4 border-b bg-blue-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Chat</h2>
                  <p className="text-sm text-gray-600">
                    Logged in as:{" "}
                    <span className="font-medium">{user?.username}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    setIsLoggedIn(false);
                    setUser(null);
                    setMessages([]);
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="flex">
              {/* User List */}
              <div className="w-1/4 border-r p-4">
                <h3 className="font-semibold mb-3">Send to:</h3>
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedReceiver(u.id)}
                      className={`w-full text-left p-2 rounded mb-2 ${
                        selectedReceiver === u.id
                          ? "bg-blue-100 text-blue-800"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {u.username}
                    </button>
                  ))}
              </div>

              {/* Chat Area */}
              <div className="flex-1">
                <div className="h-96 overflow-y-auto p-4">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center mt-8">
                      No messages yet. Start a conversation!
                    </p>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`mb-3 flex ${
                          isOwnMessage(msg) ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs p-3 rounded-lg ${
                            isOwnMessage(msg)
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          <div className="text-xs opacity-75 mb-1">
                            {getUserName(msg.sender_id)} •{" "}
                            {formatTime(msg.created_at)}
                          </div>
                          <div>{msg.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">
                      To: {getUserName(selectedReceiver)}
                    </span>
                  </div>
                  <div className="flex mt-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 p-2 border rounded-l"
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
