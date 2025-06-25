import "../styles/globals.css";
import Head from "next/head";

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
        {/* Janus WebRTC Library */}
        <script src="https://cdn.jsdelivr.net/npm/janus-gateway@0.2.0/html/janus.js"></script>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
