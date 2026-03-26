import { Network, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";

export const NETWORK = Network.TESTNET;
export const API_KEY = process.env.NEXT_PUBLIC_SHELBY_API_KEY || "";

export const aptosClient = new Aptos(
  new AptosConfig({
    network: NETWORK,
    clientConfig: {
      API_KEY: process.env.NEXT_PUBLIC_APTOS_API_KEY || "",
    },
  })
);

export const getShelbyDownloadUrl = (address: string, fileName: string) => {
  return `https://api.testnet.shelby.xyz/shelby/v1/blobs/${address}/${fileName}`;
};
