import "../config/index.mjs"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Command, Model } from "swiftify"
import { Node } from "../server/models/index.mjs"

function isMainModule(meta) {
  return process.argv[1] === fileURLToPath(meta.url)
}

// 同步状态文件路径
const SYNC_STATE_FILE = join(process.cwd(), "data", "sync-state.json")

export class SyncCommand extends Command {
  name = "sync"
  description = "Synchronize content from followed nodes"
  version = "1.0.0"

  options = {
    maxPages: {
      flag: "-p",
      type: "input",
      placeholder: "maxPages",
      optional: true,
      help: "Maximum pages to sync per node (default: 10)",
      default: 10,
    },
    timeout: {
      flag: "-t",
      type: "input",
      placeholder: "timeout",
      optional: true,
      help: "Request timeout in milliseconds (default: 30000)",
      default: 30000,
    },
    batchSize: {
      flag: "-b",
      type: "input",
      placeholder: "batchSize",
      optional: true,
      help: "Number of nodes to process in each batch (default: 5)",
      default: 5,
    },
  }

  constructor() {
    super()
    this.syncState = this.loadSyncState()
    this.stats = {
      totalNodes: 0,
      processedNodes: 0,
      successfulNodes: 0,
      failedNodes: 0,
      totalPublications: 0,
      totalContents: 0,
      startTime: null,
      endTime: null,
    }
  }

  /**
   * Load sync state
   */
  loadSyncState() {
    if (existsSync(SYNC_STATE_FILE)) {
      try {
        const data = readFileSync(SYNC_STATE_FILE, "utf8")
        return JSON.parse(data)
      } catch {
        console.warn("⚠️  Unable to load sync state file, will restart sync")
        return {}
      }
    }
    return {}
  }

  /**
   * Save sync state
   */
  saveSyncState() {
    try {
      writeFileSync(SYNC_STATE_FILE, JSON.stringify(this.syncState, null, 2))
    } catch (error) {
      console.error("❌ Failed to save sync state:", error.message)
    }
  }

  /**
   * Get nodes that need to be synced
   */
  async getNodesToSync() {
    try {
      // Get current node (self node)
      const selfNode = await Node.query().findOne({ is_self: true })
      if (!selfNode) {
        console.log("ℹ️  Current node not found")
        return []
      }

      // Get all followed nodes (non-self nodes)
      const nodes = await Node.query()
        .joinRelated("following")
        .where("following.follower_address", selfNode.address)
        .where("is_self", false)

      console.log(`📋 Found ${nodes.length} nodes to sync`)
      return nodes
    } catch (error) {
      console.error("❌ Failed to get node list:", error.message)
      throw error
    }
  }

  /**
   * Sync a single node
   */
  async syncNode(node, maxPages, timeout) {
    const nodeId = node.address
    const nodeTitle = node.title || node.address

    console.log(`\n🔄 Starting to sync node: ${nodeTitle} (${node.url})`)

    try {
      // Get last sync time
      const lastSync = this.syncState[nodeId]?.lastSync
      const since = lastSync
        ? new Date(lastSync)
        : new Date("2024-01-01T00:00:00.000Z")

      console.log(`   📅 Sync time range: ${since.toISOString()} to now`)

      // Execute sync
      const result = await node.sync.publications(since, {
        maxPages,
        timeout,
      })

      // Update statistics
      this.stats.totalPublications += result.syncedPublications
      this.stats.totalContents += result.syncedContents

      if (result.success) {
        console.log(
          `   ✅ Sync successful: ${result.syncedPublications} contents, ${result.syncedContents} files`,
        )
        this.stats.successfulNodes++
      } else if (result.partialSuccess) {
        console.log(
          `   ⚠️  Partial sync success: ${result.syncedPublications} contents, ${result.syncedContents} files`,
        )
        this.stats.successfulNodes++
      } else {
        console.log(`   ❌ Sync failed`)
        this.stats.failedNodes++
      }

      // Record errors
      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️  Found ${result.errors.length} errors:`)
        result.errors.forEach((error, index) => {
          console.log(`      ${index + 1}. ${error.type}: ${error.error}`)
        })
      }

      // Update sync state
      this.syncState[nodeId] = {
        lastSync: new Date().toISOString(),
        lastSuccess: result.success
          ? new Date().toISOString()
          : this.syncState[nodeId]?.lastSuccess,
        totalPublications:
          (this.syncState[nodeId]?.totalPublications || 0) +
          result.syncedPublications,
        totalContents:
          (this.syncState[nodeId]?.totalContents || 0) + result.syncedContents,
        errorCount:
          (this.syncState[nodeId]?.errorCount || 0) +
          (result.errors?.length || 0),
      }

      // Save state
      this.saveSyncState()

      return result
    } catch (error) {
      console.error(`   ❌ Failed to sync node: ${error.message}`)
      this.stats.failedNodes++

      // Update error state
      this.syncState[nodeId] = {
        ...this.syncState[nodeId],
        lastError: error.message,
        errorCount: (this.syncState[nodeId]?.errorCount || 0) + 1,
      }

      this.saveSyncState()
      throw error
    }
  }

  /**
   * Batch sync nodes
   */
  async syncNodesBatch(nodes, maxPages, timeout, batchSize) {
    const batches = []

    for (let i = 0; i < nodes.length; i += batchSize) {
      batches.push(nodes.slice(i, i + batchSize))
    }

    console.log(
      `📦 Will process in ${batches.length} batches, ${batchSize} nodes per batch`,
    )

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(
        `\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} nodes)`,
      )

      for (const node of batch) {
        try {
          await this.syncNode(node, maxPages, timeout)
          this.stats.processedNodes++
        } catch (error) {
          console.error(
            `❌ Node ${node.title || node.address} sync failed:`,
            error.message,
          )
        }
      }

      // Pause between batches
      if (batchIndex < batches.length - 1) {
        console.log(`⏸️  Pausing 2 seconds between batches...`)
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }

  /**
   * Show sync statistics
   */
  showStats() {
    const duration = this.stats.endTime - this.stats.startTime
    const durationMinutes = Math.round((duration / 1000 / 60) * 100) / 100

    console.log("\n📊 Sync Statistics:")
    console.log(`   📋 Total nodes: ${this.stats.totalNodes}`)
    console.log(`   ✅ Successful nodes: ${this.stats.successfulNodes}`)
    console.log(`   ❌ Failed nodes: ${this.stats.failedNodes}`)
    console.log(`   📄 Synced contents: ${this.stats.totalPublications}`)
    console.log(`   📁 Synced files: ${this.stats.totalContents}`)
    console.log(`   ⏱️  Total time: ${durationMinutes} minutes`)
    if (durationMinutes > 0) {
      console.log(
        `   📈 Average speed: ${Math.round(this.stats.totalPublications / durationMinutes)} contents/minute`,
      )
    }
  }

  async action(options) {
    // Extract parameters from options or use defaults
    const maxPages = parseInt(options.maxPages, 10) || 10
    const timeout = parseInt(options.timeout, 10) || 30000
    const batchSize = parseInt(options.batchSize, 10) || 5

    console.log("🚀 Starting node sync...")
    console.log(
      `⚙️  Configuration: maxPages=${maxPages}, timeout=${timeout}ms, batchSize=${batchSize}`,
    )

    this.stats.startTime = new Date()

    try {
      // Get nodes that need to be synced
      const nodes = await this.getNodesToSync()
      this.stats.totalNodes = nodes.length

      if (nodes.length === 0) {
        console.log("ℹ️  No nodes to sync")
        return
      }

      // Execute sync
      await this.syncNodesBatch(nodes, maxPages, timeout, batchSize)

      this.stats.endTime = new Date()
      this.showStats()

      console.log("\n🎉 Sync completed!")
    } catch (error) {
      console.error("❌ Error occurred during sync:", error.message)
      throw error
    } finally {
      // Note: Don't destroy database connection when called from start.mjs
      // as it's running in the main process and other services need the connection
      // Only destroy when running as standalone command
      if (isMainModule(import.meta) && Model.knex()) {
        await Model.knex().destroy()
      }
    }
  }
}

if (isMainModule(import.meta)) {
  new SyncCommand().execute(process.argv)
}
