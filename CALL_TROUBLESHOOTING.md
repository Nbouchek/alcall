# Call Functionality Troubleshooting Guide

## 🚨 **Issue: Call Button Shows "Audio call feature is loading..."**

### **Problem Description**

- Call button appears but doesn't work
- Shows "Audio call feature is loading..." message
- Ringing continues but call doesn't connect

## ✅ **Solution Implemented**

### **Root Cause**

The call button was trying to find a hidden button in the AudioCall component using `document.querySelector()`, which was unreliable and often failed.

### **Fix Applied**

1. **Added React Ref**: Used `forwardRef` and `useImperativeHandle` to expose the `startCall` function
2. **Direct Function Calls**: Call buttons now directly call `audioCallRef.current.startCall()`
3. **Better Error Handling**: Added proper error messages and debugging
4. **Validation**: Added checks for user and selectedReceiver before making calls

## 🔧 **Technical Changes**

### **AudioCall Component**

```javascript
// Before: Hidden button approach
<button title="Start audio call" onClick={startCall} className="hidden">
  Call
</button>;

// After: Ref-based approach
const AudioCall = forwardRef(
  ({ user, selectedReceiver, onCallEnd, getUserName }, ref) => {
    useImperativeHandle(ref, () => ({
      startCall: () => {
        console.log("AudioCall: startCall called");
        startCall();
      },
    }));
  }
);
```

### **Main Page**

```javascript
// Before: DOM query approach
const callButton = document.querySelector(
  '.audio-call-container button[title="Start audio call"]'
);
if (callButton) {
  callButton.click();
}

// After: Ref-based approach
const audioCallRef = useRef(null);

if (audioCallRef.current) {
  console.log("Calling startCall via ref");
  audioCallRef.current.startCall();
} else {
  console.error("AudioCall ref not available");
  alert("Audio call feature is loading... Please wait a moment and try again.");
}
```

## 🧪 **Testing the Fix**

### **Step 1: Check Browser Console**

1. Open browser developer tools (F12)
2. Go to Console tab
3. Click the call button
4. Look for these messages:
   ```
   Calling startCall via ref
   AudioCall: startCall function called
   AudioCall: user = {id: 1, username: "admin"}
   AudioCall: selectedReceiver = 4
   AudioCall: Making API call to start call
   ```

### **Step 2: Verify API Call**

1. Check Network tab in developer tools
2. Look for POST request to `/call/start`
3. Verify request payload:
   ```json
   {
     "caller_id": 1,
     "receiver_id": 4
   }
   ```

### **Step 3: Check Response**

1. Look for API response in console:
   ```
   AudioCall: API response status = 200
   AudioCall: API response data = {call_id: "abc123"}
   ```

## 🚀 **How to Test**

### **Test Scenario 1: Basic Call**

1. **Login as admin** (`admin` / `password123`)
2. **Select a user** from the sidebar (e.g., Linda)
3. **Click "Start Huddle"** button in header
4. **Check console** for debug messages
5. **Verify** call status appears

### **Test Scenario 2: Quick Call**

1. **Login as admin**
2. **Select a user**
3. **Click phone icon** in message input area
4. **Verify** same debug messages appear

### **Test Scenario 3: Popover Call**

1. **Login as admin**
2. **Click on user** in sidebar to open popover
3. **Click "Start Huddle"** in popover
4. **Verify** call starts correctly

## 🔍 **Debugging Steps**

### **If Call Still Doesn't Work**

1. **Check Audio Service Status**:

   ```bash
   curl https://unifiedchat-audio-service.onrender.com/health
   ```

2. **Check Audio Service Logs**:

   - Look for incoming call requests
   - Check WebSocket connections

3. **Verify User Selection**:

   - Make sure a user is selected in sidebar
   - Check that `selectedReceiver` is not null

4. **Check Network Connectivity**:
   - Ensure audio service is accessible
   - Check for CORS issues

### **Common Error Messages**

- **"AudioCall ref not available"**: Component not properly mounted
- **"Missing user or selectedReceiver"**: User not logged in or no receiver selected
- **"Failed to start call - API error"**: Audio service issue
- **"Failed to start call - network error"**: Network connectivity issue

## 📊 **Expected Behavior**

### **Successful Call Flow**

1. ✅ Click call button
2. ✅ Console shows debug messages
3. ✅ API call to `/call/start` succeeds
4. ✅ Call status shows "ringing"
5. ✅ Floating call bar appears
6. ✅ Call controls become available

### **Error Handling**

- ❌ Missing user/receiver → Alert with clear message
- ❌ API errors → Alert with error details
- ❌ Network errors → Alert with network message
- ❌ Service unavailable → Disabled button with message

## 🎯 **Next Steps**

1. **Test the fix** with different users
2. **Monitor console logs** for any remaining issues
3. **Verify cross-machine calls** work properly
4. **Check audio quality** and WebRTC connection

## 📝 **Notes**

- The fix maintains backward compatibility
- All call buttons now use the same reliable ref-based approach
- Debug logging helps identify issues quickly
- Error messages are user-friendly and actionable

---

**Status**: ✅ **Fix Implemented and Ready for Testing**
