import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FaPaperPlane,
  FaUsers,
  FaSignInAlt,
  FaSignOutAlt,
  FaCog,
  FaTrash,
} from "react-icons/fa";

const JanusTextRoom = forwardRef(({ user, onLeaveRoom }, ref) => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomStatus, setRoomStatus] = useState("");
  const [janusConnected, setJanusConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [roomId, setRoomId] = useState("1234");
  const [username, setUsername] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);

  // Check if we're in demo mode (Render deployment)
  const IS_DEMO_MODE =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("onrender.com") ||
      window.location.hostname.includes("render.com")) &&
    !(process.env.NEXT_PUBLIC_FORCE_NORMAL_MODE === "true" || true);

  // Janus-specific refs
  const janusRef = useRef(null);
  const pluginHandleRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Janus configuration
  const JANUS_URL = process.env.NEXT_PUBLIC_JANUS_URL || "ws://localhost:8188";
  const JANUS_HTTP_URL =
    process.env.NEXT_PUBLIC_JANUS_HTTP_URL || "http://localhost:8088";

  // TextRoom plugin name
  const TEXTROOM_PLUGIN = "janus.plugin.textroom";

  // Demo data for demo mode
  const demoRooms = [
    { room: "1234", description: "Demo General Chat", participants: 3 },
    { room: "5678", description: "Demo Tech Talk", participants: 7 },
    { room: "9999", description: "Demo Random", participants: 2 },
  ];

  const demoMessages = [
    {
      username: "Alice",
      text: "Hello everyone!",
      timestamp: Date.now() - 300000,
    },
    {
      username: "Bob",
      text: "Hey Alice! How's it going?",
      timestamp: Date.now() - 240000,
    },
    {
      username: "Charlie",
      text: "Good morning!",
      timestamp: Date.now() - 180000,
    },
  ];

  const demoParticipants = ["Alice", "Bob", "Charlie", user?.name || "You"];

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    joinRoom: (roomId, username) => {
      console.log("JanusTextRoom: joinRoom called:", roomId, username);
      joinRoom(roomId, username);
    },
    leaveRoom: () => {
      console.log("JanusTextRoom: leaveRoom called");
      leaveRoom();
    },
    sendMessage: (message) => {
      console.log("JanusTextRoom: sendMessage called:", message);
      sendMessage(message);
    },
    getRoomStatus: () => {
      return {
        isInRoom: IS_DEMO_MODE ? true : isInRoom,
        roomStatus,
        janusConnected: IS_DEMO_MODE ? true : janusConnected,
        roomId,
        participants: IS_DEMO_MODE ? demoParticipants : participants,
        messageCount: messages.length,
      };
    },
  }));

  // Initialize Janus connection
  useEffect(() => {
    if (IS_DEMO_MODE) {
      console.log("JanusTextRoom: Running in demo mode");
      setJanusConnected(true);
      setRoomStatus("Demo mode - Text room simulated");
      setAvailableRooms(demoRooms);
      setUsername(user?.name || "DemoUser");
      return;
    }

    const initializeJanus = () => {
      if (typeof window !== "undefined" && window.Janus) {
        console.log("JanusTextRoom: Initializing Janus...");

        window.Janus.init({
          debug: "all",
          callback: () => {
            console.log("JanusTextRoom: Janus initialized");
            connectToJanus();
          },
        });
      } else {
        console.log("JanusTextRoom: Janus library not loaded");
        setTimeout(initializeJanus, 1000);
      }
    };

    initializeJanus();

    return () => {
      cleanup();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connectToJanus = () => {
    if (janusRef.current) {
      console.log("JanusTextRoom: Already connected to Janus");
      return;
    }

    janusRef.current = new window.Janus({
      server: JANUS_URL,
      success: () => {
        console.log("JanusTextRoom: Connected to Janus");
        setJanusConnected(true);
        setRoomStatus("Connected to Janus server");
        attachTextRoomPlugin();
      },
      error: (error) => {
        console.error("JanusTextRoom: Failed to connect to Janus:", error);
        setConnectionError("Failed to connect to Janus server");
        setJanusConnected(false);
      },
      destroyed: () => {
        console.log("JanusTextRoom: Janus connection destroyed");
        setJanusConnected(false);
      },
    });
  };

  const attachTextRoomPlugin = () => {
    janusRef.current.attach({
      plugin: TEXTROOM_PLUGIN,
      success: (pluginHandle) => {
        console.log("JanusTextRoom: TextRoom plugin attached");
        pluginHandleRef.current = pluginHandle;
        listRooms();
      },
      error: (error) => {
        console.error("JanusTextRoom: Failed to attach plugin:", error);
        setConnectionError("Failed to attach to textroom plugin");
      },
      onmessage: handlePluginMessage,
      ondataopen: () => {
        console.log("JanusTextRoom: Data channel opened");
        setRoomStatus("Data channel ready");
      },
      ondata: (data) => {
        console.log("JanusTextRoom: Data received:", data);
        try {
          const message = JSON.parse(data);
          handleDataChannelMessage(message);
        } catch (error) {
          console.error("JanusTextRoom: Failed to parse data:", error);
        }
      },
      oncleanup: () => {
        console.log("JanusTextRoom: Plugin cleanup");
      },
    });
  };

  const listRooms = () => {
    if (IS_DEMO_MODE) {
      setAvailableRooms(demoRooms);
      return;
    }

    if (!pluginHandleRef.current) {
      console.error("JanusTextRoom: Plugin not attached");
      return;
    }

    const listRequest = { textroom: "list" };
    pluginHandleRef.current.send({
      message: listRequest,
      success: (result) => {
        console.log("JanusTextRoom: Room list received:", result);
        if (result && result.list) {
          setAvailableRooms(result.list);
        }
      },
      error: (error) => {
        console.error("JanusTextRoom: Failed to list rooms:", error);
      },
    });
  };

  const joinRoom = (roomId, username) => {
    if (IS_DEMO_MODE) {
      console.log("JanusTextRoom: Joining demo room:", roomId);
      setRoomId(roomId);
      setUsername(username);
      setIsInRoom(true);
      setMessages(demoMessages);
      setParticipants(demoParticipants);
      setRoomStatus(`Demo room: ${roomId}`);
      return;
    }

    if (!pluginHandleRef.current) {
      console.error("JanusTextRoom: Plugin not attached");
      return;
    }

    setRoomStatus("Joining room...");

    const joinRequest = {
      textroom: "join",
      room: roomId,
      username: username,
      display: username,
    };

    pluginHandleRef.current.send({
      message: joinRequest,
      success: (result) => {
        console.log("JanusTextRoom: Join request successful:", result);
        setRoomId(roomId);
        setUsername(username);
        setRoomStatus(`Joined room: ${roomId}`);
      },
      error: (error) => {
        console.error("JanusTextRoom: Failed to join room:", error);
        setRoomStatus("Failed to join room");
      },
    });
  };

  const leaveRoom = () => {
    console.log("JanusTextRoom: Leaving room");

    if (!IS_DEMO_MODE && pluginHandleRef.current) {
      const leaveRequest = { textroom: "leave" };
      pluginHandleRef.current.send({
        message: leaveRequest,
        success: (result) => {
          console.log("JanusTextRoom: Leave request successful:", result);
        },
        error: (error) => {
          console.error("JanusTextRoom: Failed to leave room:", error);
        },
      });
    }

    // Reset state
    setIsInRoom(false);
    setMessages([]);
    setParticipants([]);
    setRoomId("");
    setUsername("");
    setRoomStatus("Left room");

    if (onLeaveRoom) {
      onLeaveRoom();
    }
  };

  const sendMessage = (messageText) => {
    if (!messageText.trim()) return;

    if (IS_DEMO_MODE) {
      console.log("JanusTextRoom: Sending demo message:", messageText);
      const newMessage = {
        username: username,
        text: messageText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setCurrentMessage("");
      return;
    }

    if (!pluginHandleRef.current) {
      console.error("JanusTextRoom: Plugin not attached");
      return;
    }

    const messageRequest = {
      textroom: "message",
      room: roomId,
      text: messageText,
    };

    pluginHandleRef.current.send({
      message: messageRequest,
      success: (result) => {
        console.log("JanusTextRoom: Message sent:", result);
        setCurrentMessage("");
      },
      error: (error) => {
        console.error("JanusTextRoom: Failed to send message:", error);
      },
    });
  };

  const handlePluginMessage = (msg, jsep) => {
    console.log("JanusTextRoom: Plugin message:", msg);

    if (msg.textroom === "success") {
      if (msg.room) {
        setIsInRoom(true);
        setRoomStatus(`Connected to room: ${msg.room}`);
      }
    } else if (msg.textroom === "join") {
      console.log("JanusTextRoom: User joined:", msg.username);
      setParticipants((prev) => [...prev, msg.username]);
    } else if (msg.textroom === "leave") {
      console.log("JanusTextRoom: User left:", msg.username);
      setParticipants((prev) => prev.filter((p) => p !== msg.username));
    } else if (msg.textroom === "message") {
      console.log("JanusTextRoom: New message:", msg);
      const newMessage = {
        username: msg.from,
        text: msg.text,
        timestamp: msg.date ? new Date(msg.date).getTime() : Date.now(),
      };
      setMessages((prev) => [...prev, newMessage]);
    } else if (msg.textroom === "participants") {
      console.log("JanusTextRoom: Participants list:", msg.participants);
      setParticipants(msg.participants.map((p) => p.username));
    }

    if (jsep) {
      console.log("JanusTextRoom: Handling JSEP:", jsep);
      pluginHandleRef.current.createAnswer({
        jsep: jsep,
        tracks: [{ type: "data" }],
        success: (ourjsep) => {
          pluginHandleRef.current.send({
            message: { textroom: "ack" },
            jsep: ourjsep,
          });
        },
        error: (error) => {
          console.error("JanusTextRoom: Failed to create answer:", error);
        },
      });
    }
  };

  const handleDataChannelMessage = (message) => {
    console.log("JanusTextRoom: Data channel message:", message);
    // Handle data channel messages if needed
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(currentMessage);
  };

  const cleanup = () => {
    if (janusRef.current) {
      janusRef.current.destroy();
      janusRef.current = null;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Room selection UI
  if (!isInRoom) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 text-white p-4">
          <h3 className="text-lg font-semibold">Text Room</h3>
          <p className="text-sm text-gray-300">Join a text-only chat room</p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => joinRoom(roomId, username)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors"
              disabled={
                !username || !roomId || (!IS_DEMO_MODE && !janusConnected)
              }
            >
              <FaSignInAlt />
              <span>Join Room</span>
            </button>
          </div>

          {availableRooms.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Available Rooms
              </h4>
              <div className="space-y-2">
                {availableRooms.map((room) => (
                  <div
                    key={room.room}
                    className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setRoomId(room.room);
                      if (username) {
                        joinRoom(room.room, username);
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-800">
                          Room {room.room}
                        </div>
                        <div className="text-sm text-gray-600">
                          {room.description}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <FaUsers className="mr-1" />
                        {room.participants || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {connectionError && (
            <div className="text-red-500 text-sm text-center mt-4">
              {connectionError}
            </div>
          )}

          <div className="text-sm text-gray-600 text-center mt-4">
            {roomStatus}
          </div>
        </div>
      </div>
    );
  }

  // Active room UI
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden h-96 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold">Room {roomId}</div>
          <div className="text-sm text-gray-300 flex items-center">
            <FaUsers className="mr-1" />
            {participants.length}
          </div>
        </div>

        <button
          onClick={leaveRoom}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm flex items-center space-x-1 transition-colors"
        >
          <FaSignOutAlt />
          <span>Leave</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.username === username
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.username === username
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {message.username} • {formatTimestamp(message.timestamp)}
                  </div>
                  <div>{message.text}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={!currentMessage.trim()}
              >
                <FaPaperPlane />
              </button>
            </div>
          </form>
        </div>

        {/* Participants Sidebar */}
        <div className="w-48 border-l bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Participants</h4>
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 text-sm text-gray-700"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span
                  className={participant === username ? "font-semibold" : ""}
                >
                  {participant}
                  {participant === username && " (You)"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {IS_DEMO_MODE && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded text-sm font-semibold">
          DEMO MODE
        </div>
      )}
    </div>
  );
});

JanusTextRoom.displayName = "JanusTextRoom";

export default JanusTextRoom;
