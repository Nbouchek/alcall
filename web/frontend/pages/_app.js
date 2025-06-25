import "../styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Load Janus library with fallback
    const loadJanus = () => {
      if (
        typeof window !== "undefined" &&
        typeof window.Janus === "undefined"
      ) {
        const script = document.createElement("script");
        script.src = "https://meetecho.com/janus/janus.js";
        script.async = true;
        script.onload = () => {
          console.log("Janus library loaded successfully");
        };
        script.onerror = () => {
          console.error(
            "Failed to load Janus from primary source, trying fallback..."
          );
          // Fallback CDN
          const fallbackScript = document.createElement("script");
          fallbackScript.src =
            "https://cdn.jsdelivr.net/npm/janus-gateway@1.2.3/html/janus.js";
          fallbackScript.async = true;
          fallbackScript.onload = () => {
            console.log("Janus library loaded from fallback CDN");
          };
          fallbackScript.onerror = () => {
            console.error("Failed to load Janus from all sources");
          };
          document.head.appendChild(fallbackScript);
        };
        document.head.appendChild(script);
      }
    };

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
