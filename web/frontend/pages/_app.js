import "../styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Load Janus library with multiple fallbacks
    const loadJanus = () => {
      if (
        typeof window !== "undefined" &&
        typeof window.Janus === "undefined"
      ) {
        console.log("Loading Janus library...");

        const tryLoadScript = (src, description, fallbackFn) => {
          return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = false; // Load synchronously for better reliability
            script.onload = () => {
              console.log(
                `Janus library loaded successfully from ${description}`
              );
              resolve();
            };
            script.onerror = () => {
              console.error(`Failed to load Janus from ${description}: ${src}`);
              reject();
            };
            document.head.appendChild(script);
          });
        };

        // Try primary source first
        tryLoadScript(
          "https://meetecho.com/janus/janus.js",
          "Meetecho official"
        )
          .catch(() => {
            // Try first fallback
            return tryLoadScript(
              "https://cdn.jsdelivr.net/npm/janus-gateway@1.2.3/html/janus.js",
              "JSDelivr CDN"
            );
          })
          .catch(() => {
            // Try second fallback
            return tryLoadScript(
              "https://unpkg.com/janus-gateway@1.2.3/html/janus.js",
              "Unpkg CDN"
            );
          })
          .catch(() => {
            console.error("Failed to load Janus from all sources");
          });
      } else if (typeof window.Janus !== "undefined") {
        console.log("Janus library already available");
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
