import "../styles/globals.css";
import Head from "next/head";
import Script from "next/script";
import { initializeWebSocket, closeWebSocket } from "../utils/realtime"; // Adjust path if different
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>UnifiedChat - Connect Across Platforms</title>
        <meta
          name="description"
          content="Unified messaging and calling platform"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Load WebRTC adapter and Janus library */}
      <Script
        src="/adapter.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("WebRTC adapter loaded successfully");
        }}
        onError={(e) => {
          console.error("Failed to load WebRTC adapter:", e);
        }}
      />
      <Script
        src="/janus.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("Janus library loaded successfully");
          if (typeof window !== "undefined" && window.Janus) {
            console.log("Janus is available:", window.Janus);
          }
        }}
        onError={(e) => {
          console.error("Failed to load Janus library:", e);
        }}
      />

      {/* Load ringtone functions */}
      <Script
        src="/sounds/ringtone.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("Ringtone script loaded successfully");
        }}
        onError={(e) => {
          console.error("Failed to load ringtone script:", e);
        }}
      />

      <Component {...pageProps} />
    </>
  );
}
