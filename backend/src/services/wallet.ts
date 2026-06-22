import { createPublicClient, erc20Abi, formatUnits, getAddress, http, isAddress, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { config } from "../config";

export interface TokenBalance {
  id: "pol" | "pusd" | "usdc" | "usdce";
  label: string;
  symbol: string;
  address: string | null;
  decimals: number;
  raw: string;
  amount: string;
  ok: boolean;
  error?: string;
}

export interface WalletSnapshot {
  configured: boolean;
  address: string | null;
  signerAddress: string | null;
  funderAddress: string | null;
  source: "query" | "wallet_address" | "funder" | "private_key" | "none";
  chain: "polygon";
  rpcUrl: string;
  balances: TokenBalance[];
  updatedAt: string;
  errors: string[];
}

const DEFAULT_POLYGON_RPC = "https://polygon-bor-rpc.publicnode.com";

const client = createPublicClient({
  chain: polygon,
  transport: http(config.polymarket.polygonRpcUrl || DEFAULT_POLYGON_RPC),
});

function normalizeAddress(raw: string | undefined | null): Address | null {
  const value = String(raw ?? "").trim();
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

function normalizePrivateKey(raw: string | undefined): `0x${string}` | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const prefixed = value.startsWith("0x") ? value : `0x${value}`;
  return /^0x[0-9a-f]{64}$/i.test(prefixed) ? (prefixed as `0x${string}`) : null;
}

function signerAddress(): Address | null {
  const key = normalizePrivateKey(config.polymarket.privateKey);
  if (!key) return null;
  try {
    return getAddress(privateKeyToAccount(key).address);
  } catch {
    return null;
  }
}

export function resolveWalletAddress(queryAddress?: string): Pick<WalletSnapshot, "address" | "signerAddress" | "funderAddress" | "source" | "configured"> {
  const fromQuery = normalizeAddress(queryAddress);
  const fromWalletAddress = normalizeAddress(config.wallet.watchAddress);
  const funderAddress = normalizeAddress(config.polymarket.funder);
  const signer = signerAddress();
  const address = fromQuery ?? fromWalletAddress ?? funderAddress ?? signer;
  const source = fromQuery ? "query" : fromWalletAddress ? "wallet_address" : funderAddress ? "funder" : signer ? "private_key" : "none";

  return {
    configured: Boolean(address),
    address,
    signerAddress: signer,
    funderAddress,
    source,
  };
}

async function readNativeBalance(address: Address): Promise<TokenBalance> {
  try {
    const raw = await client.getBalance({ address });
    return {
      id: "pol",
      label: "Gas",
      symbol: "POL",
      address: null,
      decimals: 18,
      raw: raw.toString(),
      amount: formatUnits(raw, 18),
      ok: true,
    };
  } catch (err) {
    return failedToken("pol", "Gas", "POL", null, 18, err);
  }
}

async function readErc20Balance(
  id: TokenBalance["id"],
  label: string,
  fallbackSymbol: string,
  tokenAddress: string,
  owner: Address,
): Promise<TokenBalance> {
  const token = normalizeAddress(tokenAddress);
  if (!token) return failedToken(id, label, fallbackSymbol, tokenAddress, 6, new Error("invalid_token_address"));

  try {
    const [raw, decimals, symbol] = await Promise.all([
      client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
      client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
      client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
    ]);

    return {
      id,
      label,
      symbol: String(symbol || fallbackSymbol),
      address: token,
      decimals,
      raw: raw.toString(),
      amount: formatUnits(raw, decimals),
      ok: true,
    };
  } catch (err) {
    return failedToken(id, label, fallbackSymbol, token, 6, err);
  }
}

function failedToken(
  id: TokenBalance["id"],
  label: string,
  symbol: string,
  address: string | null,
  decimals: number,
  err: unknown,
): TokenBalance {
  return {
    id,
    label,
    symbol,
    address,
    decimals,
    raw: "0",
    amount: "0",
    ok: false,
    error: err instanceof Error ? err.message : String(err),
  };
}

export async function getWalletSnapshot(queryAddress?: string): Promise<WalletSnapshot> {
  const resolved = resolveWalletAddress(queryAddress);
  const address = normalizeAddress(resolved.address);

  if (!address) {
    return {
      ...resolved,
      chain: "polygon",
      rpcUrl: config.polymarket.polygonRpcUrl || DEFAULT_POLYGON_RPC,
      balances: [],
      updatedAt: new Date().toISOString(),
      errors: ["wallet_address_missing"],
    };
  }

  const balances = await Promise.all([
    readErc20Balance("pusd", "Polymarket collateral", "pUSD", config.wallet.pUsdAddress, address),
    readErc20Balance("usdc", "Native USDC", "USDC", config.wallet.usdcAddress, address),
    readErc20Balance("usdce", "Bridged USDC.e", "USDC.e", config.wallet.usdcEAddress, address),
    readNativeBalance(address),
  ]);

  return {
    ...resolved,
    address,
    chain: "polygon",
    rpcUrl: config.polymarket.polygonRpcUrl || DEFAULT_POLYGON_RPC,
    balances,
    updatedAt: new Date().toISOString(),
    errors: balances.filter((balance) => !balance.ok).map((balance) => `${balance.id}:${balance.error ?? "read_failed"}`),
  };
}
