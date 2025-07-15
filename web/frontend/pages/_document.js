import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Load WebRTC adapter and Janus library */}
        <Script src="/adapter.js" strategy="beforeInteractive" />
        <Script src="/janus.js" strategy="beforeInteractive" />
        {/* Removed unified-chat-app-janus-deps.js as it does not exist */}
        <Script src="/sounds/ringtone.js" strategy="beforeInteractive" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
