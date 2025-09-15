// Import necessary functions from viem library
import {
  generatePrivateKey,
  privateKeyToAccount,
  privateKeyToAddress,
} from "viem/accounts"

// --- Dedicated test private keys and addresses ---
// !!! Important: These private keys are for testing only. Never use real private keys here. !!!
// Node A: Represents the local epress instance we are testing
export const TEST_PRIVATE_KEY_NODE_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" // Hardhat's default private key 0
export const TEST_ETHEREUM_ADDRESS_NODE_A = privateKeyToAddress(
  TEST_PRIVATE_KEY_NODE_A,
)
export const TEST_ACCOUNT_NODE_A = privateKeyToAccount(TEST_PRIVATE_KEY_NODE_A)

// Node B: Represents a simulated external epress instance
export const TEST_PRIVATE_KEY_NODE_B =
  "0x59c6995e998f97a5a004496c2ef36d236219bfc66788629c67fa738e649acf81" // Hardhat's default private key 1
export const TEST_ETHEREUM_ADDRESS_NODE_B = privateKeyToAddress(
  TEST_PRIVATE_KEY_NODE_B,
)
export const TEST_ACCOUNT_NODE_B = privateKeyToAccount(TEST_PRIVATE_KEY_NODE_B)

export function generateTestAccount() {
  const privateKey = generatePrivateKey()
  return privateKeyToAccount(privateKey)
}

// Set test environment variables (must be before database migration and server initialization)
process.env.EPRESS_NODE_ADDRESS = TEST_ETHEREUM_ADDRESS_NODE_A
process.env.EPRESS_NODE_URL = "https://node-a.com"
process.env.EPRESS_DATABASE_CONNECTION = ":memory:"
process.env.EPRESS_AUTH_JWT_SECRET =
  "test-jwt-secret-key-for-testing-only-32-chars"
process.env.EPRESS_API_URL = "http://localhost:4000"
process.env.EPRESS_SERVER_HOST = "0.0.0.0"
process.env.EPRESS_SERVER_PORT = "4000"
process.env.EPRESS_CLIENT_DEFAULT_LANGUAGE = "en"
process.env.EPRESS_CLIENT_DEFAULT_THEME = "light"
process.env.EPRESS_NODE_TITLE = "Test Node A"
process.env.EPRESS_NODE_DESCRIPTION = "Local epress instance we are testing."
process.env.EPRESS_DEV_DEBUG = "false"
process.env.EPRESS_DEV_LOG_LEVEL = "error"

// --- Test data (optional, for reusable test data) ---
// TEST_NODE_B now uses TEST_ETHEREUM_ADDRESS_NODE_B
export const TEST_NODE_B = {
  address: TEST_ETHEREUM_ADDRESS_NODE_B,
  url: "https://node-b.com",
  title: "Test Node B",
  description: "A mock node for testing EWP interactions.",
}

// TEST_NODE_A (our local node) can be represented by TEST_ETHEREUM_ADDRESS_NODE_A
export const TEST_NODE_A = {
  address: TEST_ETHEREUM_ADDRESS_NODE_A,
  url: "https://node-a.com", // Assume our local node has a URL
  title: "Test Node A",
  description: "Local epress instance we are testing.",
}
