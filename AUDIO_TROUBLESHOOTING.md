# 🔊 Audio Troubleshooting Guide

## 🚨 **"I Cannot Hear Anything" - Quick Fixes**

### **Step 1: Check Microphone Permissions**

1. **Look for microphone permission popup** in your browser
2. **Click "Allow"** when prompted
3. **Check browser address bar** for microphone icon
4. **If blocked, click the microphone icon** and select "Allow"

### **Step 2: Check System Audio**

1. **Verify microphone is not muted** in system settings
2. **Check volume levels** in system audio settings
3. **Test microphone** in other applications (Zoom, Teams, etc.)

### **Step 3: Browser-Specific Checks**

#### **Chrome/Edge:**

1. **Click the lock icon** in address bar
2. **Ensure "Microphone" is set to "Allow"**
3. **Refresh the page** if needed

#### **Firefox:**

1. **Click the microphone icon** in address bar
2. **Select "Allow"** for microphone access
3. **Check "Remember this decision"**

#### **Safari:**

1. **Go to Safari > Preferences > Websites > Microphone**
2. **Ensure the site is set to "Allow"**

## 🔧 **Advanced Troubleshooting**

### **Step 1: Check Browser Console**

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Look for these messages:**
   ```
   ✅ "AudioCall: WebSocket connected for audio calls"
   ✅ "AudioCall: Call answered - updating UI state"
   ✅ "AudioCall: Call answered successfully"
   ```

### **Step 2: Check for WebRTC Errors**

Look for these error messages:

```
❌ "Failed to establish WebRTC connection"
❌ "getUserMedia failed"
❌ "Microphone permission denied"
```

### **Step 3: Test Audio Service**

```bash
# Check if audio service is running
curl http://localhost:8085/health

# Should return: {"status":"healthy"}
```

### **Step 4: Check WebSocket Connection**

1. **Open Network tab** in Developer Tools
2. **Look for WebSocket connection** to `ws://localhost:8085/ws/[user_id]`
3. **Status should be "101 Switching Protocols"**

## 🎯 **Step-by-Step Audio Test**

### **Test 1: Microphone Access**

1. **Open browser console** (F12)
2. **Run this test:**
   ```javascript
   navigator.mediaDevices
     .getUserMedia({ audio: true })
     .then((stream) => {
       console.log("✅ Microphone access granted");
       stream.getTracks().forEach((track) => track.stop());
     })
     .catch((err) => {
       console.error("❌ Microphone access failed:", err);
     });
   ```

### **Test 2: Audio Element**

1. **Check if audio element exists:**
   ```javascript
   const audioElement = document.querySelector("audio");
   console.log("Audio element:", audioElement);
   console.log("Audio srcObject:", audioElement?.srcObject);
   ```

### **Test 3: WebRTC Connection**

1. **Look for these console logs during call:**
   ```
   ✅ "AudioCall: establishWebRTCConnection called"
   ✅ "AudioCall: getUserMedia successful"
   ✅ "AudioCall: RTCPeerConnection created"
   ✅ "AudioCall: Remote stream received"
   ```

## 🛠️ **Common Fixes**

### **Fix 1: Refresh and Retry**

1. **Close both browser windows**
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Reopen and try again**

### **Fix 2: Use Different Browser**

1. **Try Chrome** (most reliable for WebRTC)
2. **Try Firefox** as alternative
3. **Avoid Safari** (WebRTC issues)

### **Fix 3: Check Network**

1. **Ensure both users are on same network** (for local testing)
2. **Check firewall settings**
3. **Try disabling VPN** if using one

### **Fix 4: Restart Services**

```bash
# Restart audio service
docker-compose -f docker-compose.external.yml restart audio-service

# Restart frontend
cd web/frontend && npm start
```

## 🎮 **Manual Audio Test**

### **Test Setup:**

1. **Open two browser windows**
2. **Login as different users**
3. **Start a call**

### **Expected Behavior:**

1. **Both users should see microphone permission popup**
2. **Both should click "Allow"**
3. **Call should connect**
4. **Both should see floating call bar**
5. **Audio should work in both directions**

### **Test Audio:**

1. **User A speaks** → User B should hear
2. **User B speaks** → User A should hear
3. **Test mute/unmute** functionality
4. **Test volume levels**

## 🔍 **Debug Information**

### **Collect Debug Info:**

1. **Browser console logs**
2. **Network tab WebSocket messages**
3. **Audio service logs:**
   ```bash
   docker-compose -f docker-compose.external.yml logs audio-service
   ```

### **Common Issues:**

#### **Issue 1: "getUserMedia failed"**

- **Cause**: Microphone permission denied
- **Fix**: Allow microphone access in browser

#### **Issue 2: "WebSocket connection failed"**

- **Cause**: Audio service not running
- **Fix**: Restart audio service

#### **Issue 3: "No remote stream"**

- **Cause**: WebRTC connection failed
- **Fix**: Check network/firewall settings

#### **Issue 4: "Audio element not playing"**

- **Cause**: Browser audio policy
- **Fix**: Interact with page (click, scroll) to enable audio

## 🚀 **Quick Test Script**

Run this in browser console to test audio:

```javascript
// Test microphone access
navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    console.log("✅ Microphone OK");

    // Create audio element and play
    const audio = document.createElement("audio");
    audio.srcObject = stream;
    audio.play();

    console.log("✅ Audio playback OK");
  })
  .catch((err) => {
    console.error("❌ Audio test failed:", err);
  });
```

## 📞 **Still Not Working?**

If audio still doesn't work after trying all fixes:

1. **Check browser console** for specific error messages
2. **Try different browser** (Chrome recommended)
3. **Check system microphone** in other apps
4. **Restart browser** completely
5. **Check if microphone works** in system settings

The most common issue is **microphone permissions** - make sure you click "Allow" when prompted! 🎤
