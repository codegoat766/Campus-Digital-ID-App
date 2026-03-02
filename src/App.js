import React, { useState, useEffect } from "react";
import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";
import { Buffer } from "buffer";

const peraWallet = new PeraWalletConnect({
  chainId: 416002, // TestNet
});

const algodClient = new algosdk.Algodv2(
  "",
  "https://testnet-api.algonode.cloud",
  ""
);

function App() {
  const [connectedAddress, setConnectedAddress] = useState("");
  const [role, setRole] = useState("");
  const [studentInputAddress, setStudentInputAddress] = useState("");
  const [optInAssetId, setOptInAssetId] = useState("");
  const [transferAssetId, setTransferAssetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(null);

  // 🔥 Auto reconnect existing session
  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (accounts?.length) {
        setConnectedAddress(accounts[0]);
      }
    });
  }, []);

  // ===============================
  // CONNECT WALLET (Safe Version)
  // ===============================
  const connectWallet = async (selectedRole) => {
    try {
      const accounts = await peraWallet.connect();
      if (!accounts?.length) return;

      setConnectedAddress(accounts[0]);
      setRole(selectedRole);
      setVerified(null);
    } catch (err) {
      // If already connected, reconnect instead of crashing
      const accounts = await peraWallet.reconnectSession();
      if (accounts?.length) {
        setConnectedAddress(accounts[0]);
        setRole(selectedRole);
      }
    }
  };

  const disconnectWallet = async () => {
    await peraWallet.disconnect();
    setConnectedAddress("");
    setRole("");
    setVerified(null);
  };

  // ===============================
  // STUDENT OPT-IN
  // ===============================
  const studentOptIn = async () => {
    if (!optInAssetId) return alert("Enter Asset ID first");

    try {
      setLoading(true);

      const suggestedParams = await algodClient.getTransactionParams().do();

      const txn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: connectedAddress,
          receiver: connectedAddress,
          amount: 0,
          assetIndex: Number(optInAssetId),
          suggestedParams,
        });

      const signed = await peraWallet.signTransaction([
        [{ txn, signers: [connectedAddress] }],
      ]);

      const response = await algodClient
        .sendRawTransaction(signed.flat())
        .do();

      await algosdk.waitForConfirmation(
        algodClient,
        response.txid,
        4
      );

      alert("Opt-in successful!");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UNIVERSITY MINT NFT
  // ===============================
  const mintIdentityNFT = async () => {
    try {
      setLoading(true);

      const suggestedParams = await algodClient.getTransactionParams().do();

      const txn =
        algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
          sender: connectedAddress,
          total: 1,
          decimals: 0,
          defaultFrozen: false,
          assetName: "Campus Student ID",
          unitName: "CSID",
          assetURL:
            "ipfs://bafkreigoznvfnomrwxjxfa6ljqvr63aiwkojw2cl7puv27k47plf6i7xq4#arc3",
          metadataHash: new Uint8Array(
            Buffer.from(
              "cecb6a56b991b5d37283cb4c2b1f6c08b29c9b684bfbe95d7d5cfbd65f23f787",
              "hex"
            )
          ),
          manager: connectedAddress,
          reserve: connectedAddress,
          freeze: connectedAddress,
          clawback: connectedAddress,
          suggestedParams,
        });

      const signed = await peraWallet.signTransaction([
        [{ txn, signers: [connectedAddress] }],
      ]);

      const response = await algodClient
        .sendRawTransaction(signed.flat())
        .do();

      await algosdk.waitForConfirmation(
        algodClient,
        response.txid,
        4
      );

      const pendingInfo = await algodClient
        .pendingTransactionInformation(response.txid)
        .do();

      alert("NFT Minted! Asset ID: " + pendingInfo.assetIndex);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UNIVERSITY TRANSFER
  // ===============================
  const transferNFTToStudent = async () => {
    if (!studentInputAddress || !transferAssetId)
      return alert("Enter student address and asset ID");

    try {
      setLoading(true);

      const suggestedParams = await algodClient.getTransactionParams().do();

      const txn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          sender: connectedAddress,
          receiver: studentInputAddress,
          amount: 1,
          assetIndex: Number(transferAssetId),
          suggestedParams,
        });

      const signed = await peraWallet.signTransaction([
        [{ txn, signers: [connectedAddress] }],
      ]);

      const response = await algodClient
        .sendRawTransaction(signed.flat())
        .do();

      await algosdk.waitForConfirmation(
        algodClient,
        response.txid,
        4
      );

      alert("NFT transferred successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // VERIFY OWNERSHIP
  // ===============================
  const verifyMyID = async () => {
    try {
      setLoading(true);

      const accountInfo = await algodClient
        .accountInformation(connectedAddress)
        .do();

      const ownsID = (accountInfo.assets || []).some(
        (asset) => asset.amount > 0
      );

      setVerified(ownsID);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div style={styles.app}>
      <div style={styles.card}>
        <h1 style={styles.title}>Campus Digital ID</h1>

        {!connectedAddress ? (
          <>
            <button style={styles.primaryBtn} onClick={() => connectWallet("student")}>
              Connect as Student
            </button>
            <button style={styles.secondaryBtn} onClick={() => connectWallet("university")}>
              Connect as University
            </button>
          </>
        ) : (
          <>
            <div style={styles.walletBox}>
              <p style={styles.address}>{connectedAddress}</p>
              <span
                style={{
                  ...styles.badge,
                  background:
                    role === "university" ? "#8b5cf6" : "#06b6d4",
                }}
              >
                {role}
              </span>
            </div>

            {loading && (
              <p style={{ color: "#facc15" }}>
                Processing transaction...
              </p>
            )}

            {role === "university" && (
              <>
                <button style={styles.primaryBtn} onClick={mintIdentityNFT}>
                  Mint NFT
                </button>

                <input
                  style={styles.input}
                  placeholder="Student Wallet Address"
                  value={studentInputAddress}
                  onChange={(e) =>
                    setStudentInputAddress(e.target.value)
                  }
                />

                <input
                  style={styles.input}
                  placeholder="Asset ID to Transfer"
                  value={transferAssetId}
                  onChange={(e) =>
                    setTransferAssetId(e.target.value)
                  }
                />

                <button
                  style={styles.secondaryBtn}
                  onClick={transferNFTToStudent}
                >
                  Transfer NFT
                </button>
              </>
            )}

            {role === "student" && (
              <>
                <input
                  style={styles.input}
                  placeholder="Asset ID to Opt-In"
                  value={optInAssetId}
                  onChange={(e) =>
                    setOptInAssetId(e.target.value)
                  }
                />

                <button style={styles.primaryBtn} onClick={studentOptIn}>
                  Opt-In
                </button>

                <button
                  style={styles.secondaryBtn}
                  onClick={verifyMyID}
                >
                  Verify My ID
                </button>

                {verified !== null && (
                  <div style={styles.idCard}>
                    <h3>Status</h3>
                    <p>
                      {verified
                        ? "🟢 Valid Campus ID"
                        : "🔴 No Valid ID"}
                    </p>
                  </div>
                )}
              </>
            )}

            <button style={styles.disconnectBtn} onClick={disconnectWallet}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "sans-serif",
  },
  card: {
    background: "#1e293b",
    padding: "40px",
    borderRadius: "16px",
    width: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
  },
  title: { textAlign: "center", color: "white" },
  walletBox: { background: "#0f172a", padding: "12px", borderRadius: "8px" },
  address: { fontSize: "12px", color: "#cbd5e1", wordBreak: "break-all" },
  badge: {
    display: "inline-block",
    marginTop: "6px",
    padding: "4px 10px",
    borderRadius: "999px",
    color: "white",
    fontSize: "12px",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
  },
  primaryBtn: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#22c55e",
    color: "white",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    cursor: "pointer",
  },
  disconnectBtn: {
    marginTop: "10px",
    padding: "8px",
    borderRadius: "8px",
    border: "none",
    background: "#ef4444",
    color: "white",
    cursor: "pointer",
  },
  idCard: {
    background: "#0f172a",
    padding: "16px",
    borderRadius: "12px",
    textAlign: "center",
  },
};

export default App;