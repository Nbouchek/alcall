const ws = new WebSocket('ws://localhost:8188/'); ws.onopen = () => console.log('✅ Connected'); ws.onerror = (e) => console.log('❌ Error:', e);
