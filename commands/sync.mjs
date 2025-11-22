import "../config/index.mjs"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Command, Model } from "solidify.js"
import { Node } from "../server/models/index.mjs"

function isMainModule(meta) {
  return process.argv[1] === fileURLToPath(meta.url)
}

const DEFAULT_SYNC_STATE_FILE = join(process.cwd(), "data", "sync-state.json")
const DEFAULT_START_DATE = "2025-09-15T00:00:00.000Z"

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
    retryFailed: {
      flag: "-r",
      type: "boolean",
      optional: true,
      help: "Retry previously failed nodes (default: true)",
      default: true,
    },
    maxRetries: {
      flag: "-m",
      type: "input",
      placeholder: "maxRetries",
      optional: true,
      help: "Maximum retry attempts for failed nodes (default: 3)",
      default: 3,
    },
    stateFile: {
      flag: "-s",
      type: "input",
      placeholder: "stateFile",
      optional: true,
      help: "Path to sync state file (default: data/sync-state.json)",
      default: null,
    },
  }

  constructor(stateFilePath = null) {
    super()
    this.stateFilePath = stateFilePath || DEFAULT_SYNC_STATE_FILE
    this.syncState = this.loadSyncState()
    this.stats = {
      totalNodes: 0,
      processedNodes: 0,
      successfulNodes: 0,
      failedNodes: 0,
      skippedNodes: 0,
      totalPublications: 0,
      totalContents: 0,
      startTime: null,
      endTime: null,
    }
  }

  /**
   * Load sync state from disk
   */
  loadSyncState() {
    if (existsSync(this.stateFilePath)) {
      try {
        const data = readFileSync(this.stateFilePath, "utf8")
        const state = JSON.parse(data)
        console.log(
          `✅ Loaded sync state (${Object.keys(state).length} node records)`,
        )
        return state
      } catch (_error) {
        console.warn("⚠️  Unable to load sync state file, starting fresh")
        return {}
      }
    }
    console.log("ℹ️  No sync state file found, creating new sync records")
    return {}
  }

  /**
   * Save sync state to disk
   */
  saveSyncState() {
    try {
      writeFileSync(this.stateFilePath, JSON.stringify(this.syncState, null, 2))
    } catch (error) {
      console.error("❌ Failed to save sync state:", error.message)
    }
  }

  /**
   * Get list of nodes that need synchronization
   */
  async getNodesToSync() {
    try {
      const selfNode = await Node.query().findOne({ is_self: true })
      if (!selfNode) {
        console.log("ℹ️  Current node not found")
        return []
      }

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
   * Calculate sync start time for a node
   * Core logic: Use last successful sync time, not last attempt time
   */
  getSyncStartTime(nodeId) {
    const nodeState = this.syncState[nodeId]

    if (!nodeState) {
      // New node, start from default date
      return new Date(DEFAULT_START_DATE)
    }

    // Use last successful sync time
    // If never succeeded, use default start date
    const lastSuccessTime = nodeState.lastSuccess || DEFAULT_START_DATE
    return new Date(lastSuccessTime)
  }

  /**
   * Check if node should be skipped based on retry policy
   */
  shouldSkipNode(nodeId, maxRetries) {
    const nodeState = this.syncState[nodeId]

    if (!nodeState || !nodeState.consecutiveFailures) {
      return false
    }

    // Skip if consecutive failures exceed max retries
    if (nodeState.consecutiveFailures >= maxRetries) {
      const lastAttempt = new Date(nodeState.lastAttempt)
      const hoursSinceLastAttempt =
        (Date.now() - lastAttempt) / (1000 * 60 * 60)

      // Give retry opportunity if more than 24 hours since last attempt
      if (hoursSinceLastAttempt < 24) {
        return true
      }
    }

    return false
  }

  /**
   * Initialize node state if not exists
   */
  initNodeState(nodeId) {
    if (!this.syncState[nodeId]) {
      this.syncState[nodeId] = {
        totalPublications: 0,
        totalContents: 0,
        consecutiveFailures: 0,
        totalAttempts: 0,
      }
    }
  }

  /**
   * Sync a single node
   */
  async syncNode(node, maxPages, timeout) {
    const nodeId = node.address
    const nodeTitle = node.title || node.address

    console.log(`\n🔄 Starting sync for node: ${nodeTitle}`)
    console.log(`   🌐 URL: ${node.url}`)

    this.initNodeState(nodeId)

    try {
      // Calculate sync start time (using last success time)
      const since = this.getSyncStartTime(nodeId)
      const now = new Date()

      console.log(
        `   📅 Sync time range: ${since.toISOString()} → ${now.toISOString()}`,
      )

      // Record attempt
      this.syncState[nodeId].lastAttempt = now.toISOString()
      this.syncState[nodeId].totalAttempts =
        (this.syncState[nodeId].totalAttempts || 0) + 1

      // Execute sync
      const result = await node.sync.publications(since, {
        maxPages,
        timeout,
      })

      // Handle sync result
      return await this.handleSyncResult(nodeId, nodeTitle, result, now)
    } catch (error) {
      return await this.handleSyncError(nodeId, nodeTitle, error)
    }
  }

  /**
   * Handle sync result and update state accordingly
   */
  async handleSyncResult(nodeId, _nodeTitle, result, syncTime) {
    const nodeState = this.syncState[nodeId]

    // Update statistics
    this.stats.totalPublications += result.syncedPublications || 0
    this.stats.totalContents += result.syncedContents || 0

    // Determine if sync is fully successful
    const isFullSuccess =
      result.success && (!result.errors || result.errors.length === 0)

    if (isFullSuccess) {
      // Full success: update success time and counters
      console.log(
        `   ✅ Sync successful: ${result.syncedPublications} publications, ${result.syncedContents} files`,
      )

      nodeState.lastSuccess = syncTime.toISOString()
      nodeState.consecutiveFailures = 0
      nodeState.totalPublications += result.syncedPublications
      nodeState.totalContents += result.syncedContents
      delete nodeState.lastError

      this.stats.successfulNodes++
    } else if (result.partialSuccess) {
      // Partial success: don't update success time, but record synced items
      console.log(
        `   ⚠️  Partial success: ${result.syncedPublications} publications, ${result.syncedContents} files`,
      )
      console.log(`   ⚠️  Errors detected, will retry failed parts next time`)

      nodeState.consecutiveFailures = (nodeState.consecutiveFailures || 0) + 1
      nodeState.totalPublications += result.syncedPublications
      nodeState.totalContents += result.syncedContents

      // Record error information
      if (result.errors && result.errors.length > 0) {
        nodeState.lastError = result.errors[0].error
        console.log(`   ⚠️  Found ${result.errors.length} errors:`)
        result.errors.slice(0, 3).forEach((err, idx) => {
          console.log(`      ${idx + 1}. ${err.type}: ${err.error}`)
        })
        if (result.errors.length > 3) {
          console.log(`      ... and ${result.errors.length - 3} more errors`)
        }
      }

      this.stats.failedNodes++
    } else {
      // Complete failure
      console.log(`   ❌ Sync failed`)

      nodeState.consecutiveFailures = (nodeState.consecutiveFailures || 0) + 1

      if (result.errors && result.errors.length > 0) {
        nodeState.lastError = result.errors[0].error
        console.log(`   ❌ Error: ${result.errors[0].error}`)
      }

      this.stats.failedNodes++
    }

    // Save state
    this.saveSyncState()

    return result
  }

  /**
   * Handle sync error and update state
   */
  async handleSyncError(nodeId, _nodeTitle, error) {
    console.error(`   ❌ Failed to sync node: ${error.message}`)

    const nodeState = this.syncState[nodeId]
    nodeState.consecutiveFailures = (nodeState.consecutiveFailures || 0) + 1
    nodeState.lastError = error.message

    this.stats.failedNodes++
    this.saveSyncState()

    throw error
  }

  /**
   * Sync nodes in batches
   */
  async syncNodesBatch(nodes, maxPages, timeout, batchSize, maxRetries) {
    // Filter nodes that should be skipped
    const nodesToSync = nodes.filter((node) => {
      if (this.shouldSkipNode(node.address, maxRetries)) {
        const failures = this.syncState[node.address].consecutiveFailures
        console.log(
          `⏭️  Skipping node ${node.title || node.address} (${failures} consecutive failures)`,
        )
        this.stats.skippedNodes++
        return false
      }
      return true
    })

    if (nodesToSync.length === 0) {
      console.log(
        "⚠️  All nodes skipped, check sync state or increase maxRetries",
      )
      return
    }

    // Split into batches
    const batches = []
    for (let i = 0; i < nodesToSync.length; i += batchSize) {
      batches.push(nodesToSync.slice(i, i + batchSize))
    }

    console.log(
      `📦 Processing ${batches.length} batches, ${batchSize} nodes per batch (${nodesToSync.length} total)`,
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
          // Continue to next node
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
   * Display sync statistics
   */
  showStats() {
    const duration = this.stats.endTime - this.stats.startTime
    const durationMinutes = Math.round((duration / 1000 / 60) * 100) / 100

    console.log("\n📊 Sync Statistics:")
    console.log(`   📋 Total nodes: ${this.stats.totalNodes}`)
    console.log(`   ✅ Successful nodes: ${this.stats.successfulNodes}`)
    console.log(`   ❌ Failed nodes: ${this.stats.failedNodes}`)
    console.log(`   ⏭️  Skipped nodes: ${this.stats.skippedNodes}`)
    console.log(`   📄 Synced publications: ${this.stats.totalPublications}`)
    console.log(`   📁 Synced files: ${this.stats.totalContents}`)
    console.log(`   ⏱️  Total time: ${durationMinutes} minutes`)

    if (durationMinutes > 0 && this.stats.totalPublications > 0) {
      const speed = Math.round(this.stats.totalPublications / durationMinutes)
      console.log(`   📈 Average speed: ${speed} publications/minute`)
    }

    // Show failed node details
    if (this.stats.failedNodes > 0) {
      console.log("\n⚠️  Failed Node Details:")
      Object.entries(this.syncState).forEach(([nodeId, state]) => {
        if (state.consecutiveFailures > 0) {
          console.log(
            `   - ${nodeId}: ${state.consecutiveFailures} consecutive failures`,
          )
          if (state.lastError) {
            console.log(`     Error: ${state.lastError}`)
          }
        }
      })
    }
  }

  /**
   * Main action function
   */
  async action(options) {
    const maxPages = parseInt(options.maxPages, 10) || 10
    const timeout = parseInt(options.timeout, 10) || 30000
    const batchSize = parseInt(options.batchSize, 10) || 5
    const maxRetries = parseInt(options.maxRetries, 10) || 3

    // Override state file path if provided in options
    if (options.stateFile) {
      this.stateFilePath = options.stateFile
      this.syncState = this.loadSyncState()
    }

    console.log("🚀 Starting node synchronization...")
    console.log(`⚙️  Configuration:`)
    console.log(`   - maxPages: ${maxPages}`)
    console.log(`   - timeout: ${timeout}ms`)
    console.log(`   - batchSize: ${batchSize}`)
    console.log(`   - maxRetries: ${maxRetries}`)
    console.log(`   - stateFile: ${this.stateFilePath}`)

    this.stats.startTime = new Date()

    try {
      const nodes = await this.getNodesToSync()
      this.stats.totalNodes = nodes.length

      if (nodes.length === 0) {
        console.log("ℹ️  No nodes to sync")
        return
      }

      await this.syncNodesBatch(nodes, maxPages, timeout, batchSize, maxRetries)

      this.stats.endTime = new Date()
      this.showStats()

      if (this.stats.failedNodes === 0) {
        console.log("\n🎉 Sync completed successfully!")
      } else {
        console.log("\n⚠️  Sync completed with some failures")
        console.log("💡 Tip: Failed nodes will be retried on next sync")
      }
    } catch (error) {
      console.error("❌ Error during sync:", error.message)
      console.error(error.stack)
      throw error
    } finally {
      if (isMainModule(import.meta) && Model.knex()) {
        await Model.knex().destroy()
      }
    }
  }
}

if (isMainModule(import.meta)) {
  new SyncCommand().execute(process.argv)
}
