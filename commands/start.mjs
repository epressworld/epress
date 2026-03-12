import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

/**
 * Prefix each line of output with [server] or [client]
 * @param {string} name - Process name for prefix
 * @param {NodeJS.ReadableStream} source - Output stream from child process
 * @param {NodeJS.WritableStream} target - Target stream (stdout/stderr)
 */
function prefixStream(name, source, target) {
  let buffer = ""
  source.on("data", (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split("\n")
    // Keep the last incomplete line in buffer
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (line.trim()) {
        target.write(`[${name}] ${line}\n`)
      }
    }
  })
  source.on("end", () => {
    if (buffer.trim()) {
      target.write(`[${name}] ${buffer}\n`)
    }
  })
}

/**
 * Start both server and client processes
 * Implements:
 * - Signal forwarding (SIGTERM, SIGINT)
 * - Exit coupling (if one dies, kill the other)
 * - Log passthrough with prefixes
 */
function start() {
  const clientPort = process.env.EPRESS_CLIENT_PORT || "8543"
  const serverPort = process.env.EPRESS_SERVER_PORT || "8544"

  console.log(`[start] Starting epress node...`)
  console.log(`[start] Server port: ${serverPort}`)
  console.log(`[start] Client port: ${clientPort}`)

  // Start server process
  const server = spawn("node", ["commands/server.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  // Start client process
  const client = spawn(
    "node",
    ["node_modules/.bin/next", "start", "-p", clientPort],
    {
      cwd: resolve(root, "client"),
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: clientPort,
        EPRESS_API_URL:
          process.env.EPRESS_API_URL || `http://localhost:${serverPort}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  )

  // Pipe logs with prefixes
  prefixStream("server", server.stdout, process.stdout)
  prefixStream("server", server.stderr, process.stderr)
  prefixStream("client", client.stdout, process.stdout)
  prefixStream("client", client.stderr, process.stderr)

  // Track process state
  let isShuttingDown = false
  let serverExitCode = null
  let clientExitCode = null

  /**
   * Gracefully shutdown both processes
   * @param {number} exitCode - Exit code for parent process
   */
  function shutdown(exitCode) {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log(`[start] Shutting down...`)

    // Kill both processes
    if (serverExitCode === null) {
      server.kill("SIGTERM")
    }
    if (clientExitCode === null) {
      client.kill("SIGTERM")
    }

    // Wait for both to exit, then exit parent
    const checkExit = () => {
      if (serverExitCode !== null && clientExitCode !== null) {
        console.log(`[start] Exit code: ${exitCode}`)
        process.exit(exitCode)
      }
    }

    // Give processes time to exit gracefully
    setTimeout(() => {
      if (serverExitCode === null) {
        server.kill("SIGKILL")
      }
      if (clientExitCode === null) {
        client.kill("SIGKILL")
      }
    }, 5000)

    // Periodically check if both have exited
    const interval = setInterval(() => {
      checkExit()
      if (serverExitCode !== null && clientExitCode !== null) {
        clearInterval(interval)
      }
    }, 100)
  }

  // Handle server exit
  server.on("exit", (code, signal) => {
    serverExitCode = code ?? (signal ? 1 : 0)
    if (!isShuttingDown) {
      console.log(
        `[start] Server exited with code ${serverExitCode}, shutting down...`,
      )
      shutdown(code !== 0 ? code : 1)
    }
  })

  // Handle client exit
  client.on("exit", (code, signal) => {
    clientExitCode = code ?? (signal ? 1 : 0)
    if (!isShuttingDown) {
      console.log(
        `[start] Client exited with code ${clientExitCode}, shutting down...`,
      )
      shutdown(code !== 0 ? code : 1)
    }
  })

  // Handle process errors
  server.on("error", (err) => {
    console.error(`[start] Server error: ${err.message}`)
    shutdown(1)
  })

  client.on("error", (err) => {
    console.error(`[start] Client error: ${err.message}`)
    shutdown(1)
  })

  // Forward signals to child processes
  process.on("SIGTERM", () => {
    console.log(`[start] Received SIGTERM`)
    shutdown(0)
  })

  process.on("SIGINT", () => {
    console.log(`[start] Received SIGINT`)
    shutdown(0)
  })
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start()
}

export { start }
