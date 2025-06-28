import "../styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";
import Script from "next/script";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Load Janus library synchronously from local file
    const loadJanus = () => {
      if (typeof window !== "undefined" && !window.Janus) {
        console.log("Loading Janus library from local file...");

        const script = document.createElement("script");
        script.src = "/janus.js";
        script.async = false;
        script.onload = () => {
          console.log("Janus library loaded successfully from local file");
          window.janusLoaded = true;
        };
        script.onerror = () => {
          console.error("Failed to load Janus from local file: /janus.js");
          window.janusLoadFailed = true;
        };
        document.head.appendChild(script);
      }
    };

    // Load immediately
    loadJanus();
  }, []);

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

      <Component {...pageProps} />
    </>
  );
}
