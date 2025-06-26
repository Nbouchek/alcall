import "../styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";
import Script from "next/script";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Enhanced Janus library loading with fallbacks
    const loadJanus = () => {
      if (typeof window !== "undefined") {
        // Check if Janus is already loaded
        if (typeof window.Janus !== "undefined") {
          console.log("Janus library already available");
          window.janusLoaded = true;
          return;
        }

        // If primary script failed, try fallbacks
        if (!window.janusLoaded) {
          console.log("Loading Janus fallback libraries...");

          const tryLoadScript = (src, description) => {
            return new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = src;
              script.async = false;
              script.onload = () => {
                console.log(
                  `Janus library loaded successfully from ${description}`
                );
                window.janusLoaded = true;
                resolve();
              };
              script.onerror = () => {
                console.error(
                  `Failed to load Janus from ${description}: ${src}`
                );
                reject();
              };
              document.head.appendChild(script);
            });
          };

          // Try fallback sources
          tryLoadScript(
            "https://cdn.jsdelivr.net/npm/janus-gateway@1.2.3/html/janus.js",
            "JSDelivr CDN"
          )
            .catch(() => {
              return tryLoadScript(
                "https://unpkg.com/janus-gateway@1.2.3/html/janus.js",
                "Unpkg CDN"
              );
            })
            .catch(() => {
              return tryLoadScript(
                "https://gitcdn.xyz/repo/meetecho/janus-gateway/master/html/janus.js",
                "GitCDN"
              );
            })
            .catch(() => {
              return tryLoadScript("/janus.js", "Local fallback");
            })
            .catch(() => {
              console.error(
                "Failed to load Janus from all sources including local fallback"
              );
              console.log(
                "Please ensure janus.js is available or check your internet connection"
              );
            });
        }
      }
    };

    // Wait a bit for the primary script to load, then try fallbacks if needed
    const timer = setTimeout(loadJanus, 1000);
    return () => clearTimeout(timer);
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

        {/* Additional Janus loading attempt via script tag */}
        <script
          src="https://unpkg.com/janus-gateway@1.2.3/dist/janus.min.js"
          async
        />
      </Head>

      {/* Load Janus library with multiple fallbacks */}
      <Script
        src="https://meetecho.com/janus/janus.js"
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("Janus library loaded successfully from Meetecho");
          window.janusLoaded = true;
        }}
        onError={() => {
          console.log("Primary Janus source failed, trying fallback...");
          // Fallback will be handled by the existing useEffect logic
        }}
      />

      <Component {...pageProps} />
    </>
  );
}
