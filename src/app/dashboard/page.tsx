"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { API_KEY, aptosClient } from "@/lib/shelby";
import styles from "./dashboard.module.css";

interface BlobFile {
  name: string;
  size?: number;
  timestamp?: string;
}

type UploadStatus = "idle" | "encoding" | "registering" | "uploading" | "done" | "error";

// Download URL pakai Shelbynet
const getShelbyDownloadUrl = (address: string, fileName: string) => {
  return `https://api.shelbynet.shelby.xyz/shelby/v1/blobs/${address}/${fileName}`;
};

export default function DashboardPage() {
  const { connected, account, disconnect, signAndSubmitTransaction } = useWallet();
  const router = useRouter();

  const [files, setFiles] = useState<BlobFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  const fetchFiles = useCallback(async () => {
    if (!account?.address) return;
    setLoadingFiles(true);
    try {
      const { ShelbyClient } = await import("@shelby-protocol/sdk/browser");
      const { Network } = await import("@aptos-labs/ts-sdk");
      const shelbyClient = new ShelbyClient({ network: Network.SHELBYNET, apiKey: API_KEY });
      const addrStr = account.address.toString();
      const blobs = await shelbyClient.coordination.getAccountBlobs({ account: addrStr });

      // Log raw untuk debug
      console.log("RAW BLOBS:", JSON.stringify(blobs, null, 2));

      // Map dengan semua kemungkinan field name dari SDK
      const mapped = (blobs || []).map((b: any) => ({
        name: b.blobNameSuffix || b.blob_name || b.blobName || b.fileName || "",
        size: b.size || b.blob_size || b.blobSize || 0,
      }));

      // Filter: hanya tampilkan file dengan nama yang valid (bukan angka, bukan alamat wallet)
      const clean = mapped.filter((b: any) => {
        if (!b.name) return false;
        if (b.name.startsWith("0x")) return false;
        if (b.name.startsWith("@")) return false;
        if (/^\d+(\.\w+)?$/.test(b.name)) return false;
        return true;
      });

      console.log("CLEAN FILES:", clean);
      setFiles(clean);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [account?.address]);

  useEffect(() => {
    if (connected && account) fetchFiles();
  }, [connected, account, fetchFiles]);

  const handleUpload = async (file: File) => {
    if (!account?.address) return;
    const addrStr = account.address.toString();
    setUploadStatus("encoding");
    setProgress(10);
    setUploadMessage("Encoding file...");

    try {
      const {
        ShelbyClient,
        createDefaultErasureCodingProvider,
        generateCommitments,
        expectedTotalChunksets,
        ShelbyBlobClient,
      } = await import("@shelby-protocol/sdk/browser");
      const { Network, Aptos: AptosSDK, AptosConfig } = await import("@aptos-labs/ts-sdk");

      // Step 1: Encode
      const data = Buffer.from(await file.arrayBuffer());
      const provider = await createDefaultErasureCodingProvider();
      const commitments = await generateCommitments(provider, data);
      setProgress(35);
      setUploadStatus("registering");
      setUploadMessage("Registering on Aptos blockchain...");

      console.log("raw_data_size:", commitments.raw_data_size);
      console.log("raw_data_size type:", typeof commitments.raw_data_size);
      console.log("numChunksets:", expectedTotalChunksets(commitments.raw_data_size));
      console.log("numChunksets type:", typeof expectedTotalChunksets(commitments.raw_data_size));

      // Step 2: Register on-chain payload (signing handled by wallet)
      const payload = ShelbyBlobClient.createRegisterBlobPayload({
        account: addrStr,
        blobName: file.name,
        blobMerkleRoot: commitments.blob_merkle_root,
        numChunksets: Number(expectedTotalChunksets(commitments.raw_data_size)),
        expirationMicros: (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000,
        blobSize: Number(commitments.raw_data_size),
        encoding: 0,
      });

      console.log("PAYLOAD:", JSON.stringify(payload, null, 2));

      setUploadMessage("Please approve in Petra wallet...");
      let txResult;
      try {
        txResult = await signAndSubmitTransaction({ data: payload });
        console.log("TX RESULT:", JSON.stringify(txResult, null, 2));
      } catch (signErr) {
        console.log("SIGN ERROR:", signErr);
        throw signErr;
      }

      // Tunggu transaksi confirmed di chain
      const shelbynetClient = new AptosSDK(new AptosConfig({
        network: Network.SHELBYNET,
      }));
      await shelbynetClient.waitForTransaction({
        transactionHash: txResult.hash,
        options: {
          checkSuccess: true,
          waitForIndexer: true,
          timeoutSecs: 30,
        }
      });

      // Delay agar indexer Shelby sempat update
      await new Promise(resolve => setTimeout(resolve, 3000));
      setProgress(60);

      // Step 3: RPC Upload
      const shelbyClient = new ShelbyClient({
        network: Network.SHELBYNET,
        apiKey: API_KEY,
        indexer: {
          baseUrl: "https://api.shelbynet.shelby.xyz/v1/graphql",
        },
        rpc: {
          baseUrl: "https://api.shelbynet.shelby.xyz/shelby",
        }
      });

      await shelbyClient.rpc.putBlob({
        account: addrStr,
        blobName: file.name,
        blobData: new Uint8Array(await file.arrayBuffer()),
      });

      setProgress(100);
      setUploadStatus("done");
      setUploadMessage(`"${file.name}" uploaded successfully!`);
      await fetchFiles();

      setTimeout(() => {
        setUploadStatus("idle");
        setProgress(0);
        setUploadMessage("");
      }, 3000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      setUploadMessage(err?.message || "Upload failed. Please try again.");
      setTimeout(() => {
        setUploadStatus("idle");
        setProgress(0);
        setUploadMessage("");
      }, 4000);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDownload = (fileName: string) => {
    if (!account?.address) return;
    const url = getShelbyDownloadUrl(account.address.toString(), fileName);
    window.open(url, "_blank");
  };

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const isUploading = ["encoding", "registering", "uploading"].includes(uploadStatus);

  return (
    <div className={styles.page}>
      <div className="corner-shape corner-tl" />
      <div className="corner-shape corner-tr" />
      <div className="corner-shape corner-bl" />
      <div className="corner-shape corner-br" />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLogo}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L24 8V20L14 26L4 20V8L14 2Z" stroke="#ff5fbe" strokeWidth="2" fill="none" />
            <path d="M14 7L20 10.5V17.5L14 21L8 17.5V10.5L14 7Z" fill="#ff5fbe" opacity="0.4" />
            <circle cx="14" cy="14" r="3" fill="#ff5fbe" />
          </svg>
          <span>ShelbyStorage</span>
        </div>

        <div className={styles.headerRight}>
          {account?.address && (
            <span className={styles.address}>{formatAddress(account.address.toString())}</span>
          )}
          <button className={styles.disconnectBtn} onClick={() => disconnect()}>
            Disconnect
          </button>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
        {/* Upload Zone */}
        <section className={`${styles.uploadSection} fade-up`}>
          <h2 className={styles.sectionTitle}>Upload File</h2>

          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragActive : ""} ${isUploading ? styles.uploading : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && document.getElementById("fileInput")?.click()}
          >
            <input
              id="fileInput"
              type="file"
              style={{ display: "none" }}
              onChange={handleFileInput}
              disabled={isUploading}
            />

            {isUploading ? (
              <div className={styles.uploadingState}>
                <div className={styles.spinner} />
                <p className={styles.uploadMsg}>{uploadMessage}</p>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : uploadStatus === "done" ? (
              <div className={styles.successState}>
                <div className={styles.checkIcon}>✓</div>
                <p>{uploadMessage}</p>
              </div>
            ) : uploadStatus === "error" ? (
              <div className={styles.errorState}>
                <div className={styles.errorIcon}>✕</div>
                <p>{uploadMessage}</p>
              </div>
            ) : (
              <div className={styles.idleState}>
                <div className={styles.uploadIcon}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 28V16M20 16L14 22M20 16L26 22" stroke="#ff5fbe" strokeWidth="2" strokeLinecap="round" />
                    <path d="M10 30C7 30 4 27.5 4 24C4 20.8 6.3 18.2 9.4 17.7C9.1 17 9 16.3 9 15.5C9 12 11.7 9 15 9C16.3 9 17.5 9.4 18.5 10.1C19.5 7.7 21.9 6 24.5 6C28.6 6 32 9.4 32 13.5V14C34.8 14.5 37 17 37 20C37 23.3 34.3 26 31 26H30" stroke="#ff5fbe" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className={styles.dropText}>
                  Drop your file here or <span>click to browse</span>
                </p>
                <p className={styles.dropHint}>Any file type • Stored on Shelby testnet for 30 days</p>
              </div>
            )}
          </div>
        </section>

        {/* Files List */}
        <section className={`${styles.filesSection} fade-up-delay-2`}>
          <div className={styles.filesSectionHeader}>
            <h2 className={styles.sectionTitle}>Your Files</h2>
            <button className={styles.refreshBtn} onClick={fetchFiles} disabled={loadingFiles}>
              {loadingFiles ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {loadingFiles ? (
            <div className={styles.loadingFiles}>
              <div className={styles.spinner} />
              <span>Fetching your files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No files uploaded yet.</p>
              <p className={styles.emptyHint}>Upload your first file above to get started!</p>
            </div>
          ) : (
            <div className={styles.filesList}>
              {files.map((file, i) => (
                <div key={i} className={styles.fileItem}>
                  <div className={styles.fileIcon}>{getFileIcon(file.name)}</div>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{file.name}</span>
                    {file.size ? (
                      <span className={styles.fileMeta}>{formatSize(file.size)}</span>
                    ) : null}
                  </div>
                  <button
                    className={styles.downloadBtn}
                    onClick={() => handleDownload(file.name)}
                  >
                    ↓ Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Info Banner */}
        <section className={`${styles.infoBanner} fade-up-delay-3`}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Network</span>
            <span className={styles.infoValue}>Shelbynet</span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Storage</span>
            <span className={styles.infoValue}>Shelby Hot Storage</span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Retrieval</span>
            <span className={styles.infoValue}>Sub-second</span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Expiry</span>
            <span className={styles.infoValue}>30 days</span>
          </div>
        </section>
      </main>
    </div>
  );
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    pdf: "📄", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🎞️",
    mp4: "🎬", mp3: "🎵", txt: "📝", doc: "📝", docx: "📝",
    zip: "📦", json: "⚙️", csv: "📊",
  };
  return icons[ext || ""] || "📁";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
