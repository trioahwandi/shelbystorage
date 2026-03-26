"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./page.module.css";

export default function HomePage() {
  const { connected, connect, wallets } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) {
      router.push("/dashboard");
    }
  }, [connected, router]);

  const handleConnect = async () => {
    const petraWallet = wallets?.find((w) =>
      w.name.toLowerCase().includes("petra")
    );
    if (petraWallet) {
      await connect(petraWallet.name);
    } else {
      window.open("https://petra.app", "_blank");
    }
  };

  return (
    <main className={styles.main}>
      {/* Corner shapes matching Shelby website */}
      <div className="corner-shape corner-tl" />
      <div className="corner-shape corner-tr" />
      <div className="corner-shape corner-bl" />
      <div className="corner-shape corner-br" />

      <div className={styles.center}>
        <div className={`${styles.logo} fade-up`}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M14 2L24 8V20L14 26L4 20V8L14 2Z"
              stroke="#ff5fbe"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M14 7L20 10.5V17.5L14 21L8 17.5V10.5L14 7Z"
              fill="#ff5fbe"
              opacity="0.4"
            />
            <circle cx="14" cy="14" r="3" fill="#ff5fbe" />
          </svg>
          <span>ShelbyStorage</span>
        </div>

        <h1 className={`${styles.headline} fade-up-delay-1`}>
          Sto<span className={styles.pinkDot}>r</span>e It
        </h1>

        <p className={`${styles.subtitle} fade-up-delay-2`}>
          The first decentralized hot storage network
        </p>

        <button
          className={`${styles.ctaBtn} fade-up-delay-3`}
          onClick={handleConnect}
        >
          GET STARTED
        </button>

        <p className={`${styles.hint} fade-up-delay-4`}>
          Connect your{" "}
          <a href="https://petra.app" target="_blank" rel="noreferrer">
            Petra Wallet
          </a>{" "}
          to continue
        </p>
      </div>
    </main>
  );
}
