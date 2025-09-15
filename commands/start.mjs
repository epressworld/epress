import "../config/index.mjs"
import { fileURLToPath } from "node:url"
import { execa } from "execa"
import cron from "node-cron"
import { Command } from "swiftify"
import server from "../server/index.mjs"
import { CleanContentCommand } from "./clean.mjs"
import { SyncCommand } from "./sync.mjs"

function isMainModule(meta) {
  return process.argv[1] === fileURLToPath(meta.url)
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

export async function startClient() {
  await execa({
    stdout: "inherit",
    stderr: "inherit",
  })`npx next ${process.env.NODE_ENV === "development" ? "dev" : "start"} -p ${process.env.EPRESS_CLIENT_PORT || 8543} ./client`
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

export class StartCommand extends Command {
  arguments = {
    item: {
      optional: true,
      multiple: false,
      choices: ["all", "server", "client", "scheduler", "sync"],
      description: "Start server, client, scheduler, sync or all",
      default: "all",
    },
  }

  async action(item) {
    switch (item) {
      case "server":
        await startServer()
        break
      case "client":
        await startClient()
        break
      case "scheduler":
        await startScheduler()
        break
      case "sync":
        await startSync()
        break
      case "all":
        await Promise.all([
          startServer(),
          startClient(),
          startScheduler(),
          startSync(),
        ])
        break
    }
  }
}

if (isMainModule(import.meta)) {
  new StartCommand().execute(process.argv)
}
