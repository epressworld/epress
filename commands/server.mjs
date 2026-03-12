import "../config/index.mjs"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import cron from "node-cron"
import { Command } from "solidify.js"
import server from "../server/index.mjs"
import { CleanContentCommand } from "./clean.mjs"
import { SyncCommand } from "./sync.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))

function isMainModule(meta) {
  return process.argv[1] === fileURLToPath(meta.url)
}

async function ensureLogsDirectory() {
  const logsDir = join(__dirname, "../data/logs")
  try {
    await mkdir(logsDir, { recursive: true })
  } catch (error) {
    // Directory already exists, ignore error
    if (error.code !== "EEXIST") {
      console.error("Failed to create logs directory:", error.message)
    }
  }
}

export async function startServer() {
  const listen = {
    port: parseInt(process.env.EPRESS_SERVER_PORT, 10) || 8544,
    host: process.env.EPRESS_SERVER_HOST || "0.0.0.0",
  }
  const app = await server()
  await app.listen(listen)
  console.log(`Server is running on port ${listen.port}`)
}

export async function startScheduler() {
  console.log("Scheduler is running")

  // Execute content cleanup task daily at 3:00 AM
  cron.schedule(
    "0 3 * * *", // Execute daily at 3:00 AM
    async () => {
      console.log("Executing scheduled content cleanup task...")
      try {
        const cleanCommand = new CleanContentCommand()
        await cleanCommand.action()
        console.log("Scheduled content cleanup completed successfully")
      } catch (error) {
        console.error("Scheduled content cleanup failed:", error)
      }
    },
  )

  console.log("Content cleanup scheduled for 3:00 AM EST daily")
}

export async function startSync() {
  console.log("Sync service is starting...")

  try {
    const syncCommand = new SyncCommand()
    // Run sync in background without blocking
    setImmediate(async () => {
      try {
        console.log("Starting background sync...")
        await syncCommand.action({
          maxPages: 10,
          timeout: 30000,
          batchSize: 5,
        })
        console.log("Initial sync completed")
      } catch (error) {
        console.error("Initial sync failed:", error.message)
      }
    })

    console.log("Sync service started in background")
  } catch (error) {
    console.error("Failed to start sync service:", error.message)
  }
}

export class ServerCommand extends Command {
  async action() {
    // Ensure logs directory exists
    await ensureLogsDirectory()

    // Start all services
    await Promise.all([startServer(), startScheduler(), startSync()])
  }
}

if (isMainModule(import.meta)) {
  new ServerCommand().execute(process.argv)
}
