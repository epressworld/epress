import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import test from "ava"
import { SyncCommand } from "../../commands/sync.mjs"
import {
  Connection,
  Content,
  Node,
  Publication,
} from "../../server/models/index.mjs"
import {
  TEST_ETHEREUM_ADDRESS_NODE_A,
  TEST_ETHEREUM_ADDRESS_NODE_B,
} from "../setup.mjs"

const TEST_SYNC_STATE_FILE = join(process.cwd(), "data", "sync-state-test.json")

// Setup and teardown
test.before(() => {
  // Ensure data directory exists
  const dataDir = join(process.cwd(), "data")
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
})

test.beforeEach(async () => {
  // Clean test data
  await Publication.query().delete()
  await Content.query().delete()
  await Node.query().delete()

  // Remove test sync state file
  if (existsSync(TEST_SYNC_STATE_FILE)) {
    rmSync(TEST_SYNC_STATE_FILE)
  }
})

test.afterEach(async () => {
  // Clean test data
  await Publication.query().delete()
  await Content.query().delete()
  await Node.query().delete()

  // Remove test sync state file
  if (existsSync(TEST_SYNC_STATE_FILE)) {
    rmSync(TEST_SYNC_STATE_FILE)
  }
})

// Test: constructor with custom state file
test.serial(
  "SyncCommand constructor should use custom state file path",
  (t) => {
    // Act
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    // Assert
    t.is(
      cmd.stateFilePath,
      TEST_SYNC_STATE_FILE,
      "Should use custom state file path",
    )
  },
)

test.serial(
  "SyncCommand constructor should use default state file path",
  (t) => {
    // Act
    const cmd = new SyncCommand()

    // Assert
    t.true(
      cmd.stateFilePath.endsWith("sync-state.json"),
      "Should use default state file path",
    )
  },
)

// Test: loadSyncState
test.serial("SyncCommand.loadSyncState should load existing state", (t) => {
  // Arrange: Create test state file
  const testState = {
    [TEST_ETHEREUM_ADDRESS_NODE_A]: {
      lastSuccess: "2024-10-01T00:00:00.000Z",
      totalPublications: 10,
      consecutiveFailures: 0,
    },
  }
  writeFileSync(TEST_SYNC_STATE_FILE, JSON.stringify(testState, null, 2))

  // Act
  const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

  // Assert
  t.deepEqual(cmd.syncState, testState, "Should load existing state")
})

test.serial(
  "SyncCommand.loadSyncState should return empty object if no file",
  (t) => {
    // Act
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    // Assert
    t.deepEqual(cmd.syncState, {}, "Should return empty object")
  },
)

test.serial(
  "SyncCommand.loadSyncState should handle corrupted state file",
  (t) => {
    // Arrange: Create corrupted state file
    writeFileSync(TEST_SYNC_STATE_FILE, "{ invalid json")

    // Act
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    // Assert
    t.deepEqual(cmd.syncState, {}, "Should return empty object on error")
  },
)

// Test: saveSyncState
test.serial("SyncCommand.saveSyncState should persist state to disk", (t) => {
  // Arrange
  const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
  cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
    lastSuccess: "2024-10-01T00:00:00.000Z",
    totalPublications: 5,
  }

  // Act
  cmd.saveSyncState()

  // Assert
  t.true(existsSync(TEST_SYNC_STATE_FILE), "State file should be created")

  const savedState = JSON.parse(readFileSync(TEST_SYNC_STATE_FILE, "utf8"))
  t.deepEqual(
    savedState[TEST_ETHEREUM_ADDRESS_NODE_A],
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A],
    "Should save correct state",
  )
})

// Test: getNodesToSync
test.serial(
  "SyncCommand.getNodesToSync should return followed nodes",
  async (t) => {
    // Arrange: Create self node
    const selfNode = await Node.query().insert({
      address: TEST_ETHEREUM_ADDRESS_NODE_A,
      url: "https://self-node.com",
      title: "Self Node",
      is_self: true,
    })

    // Create followed node
    const followedNode = await Node.query().insert({
      address: TEST_ETHEREUM_ADDRESS_NODE_B,
      url: "https://followed-node.com",
      title: "Followed Node",
      is_self: false,
    })

    // Create following relationship
    await Connection.query().insert({
      follower_address: selfNode.address,
      followee_address: followedNode.address,
    })

    // Act
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    const nodes = await cmd.getNodesToSync()

    // Assert
    t.is(nodes.length, 1, "Should return 1 followed node")
    t.is(
      nodes[0].address,
      TEST_ETHEREUM_ADDRESS_NODE_B,
      "Should return correct node",
    )
  },
)

test.serial(
  "SyncCommand.getNodesToSync should return empty array if no self node",
  async (t) => {
    // Act
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    const nodes = await cmd.getNodesToSync()

    // Assert
    t.is(nodes.length, 0, "Should return empty array")
  },
)

test.serial(
  "SyncCommand.getNodesToSync should exclude self node",
  async (t) => {
    // Arrange: Create self node
    const _selfNode = await Node.query().insert({
      address: TEST_ETHEREUM_ADDRESS_NODE_A,
      url: "https://self-node.com",
      title: "Self Node",
      is_self: true,
    })

    // Act
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    const nodes = await cmd.getNodesToSync()

    // Assert
    t.is(nodes.length, 0, "Should not return self node")
  },
)

// Test: getSyncStartTime
test.serial(
  "SyncCommand.getSyncStartTime should use default date for new node",
  (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    // Act
    const startTime = cmd.getSyncStartTime("new-node-address")

    // Assert
    t.is(
      startTime.toISOString(),
      "2025-09-15T00:00:00.000Z",
      "Should use default start date",
    )
  },
)

test.serial("SyncCommand.getSyncStartTime should use lastSuccess time", (t) => {
  // Arrange
  const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
  const lastSuccessTime = "2024-10-15T12:00:00.000Z"
  cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
    lastSuccess: lastSuccessTime,
    lastAttempt: "2024-10-20T12:00:00.000Z", // Should not use this
  }

  // Act
  const startTime = cmd.getSyncStartTime(TEST_ETHEREUM_ADDRESS_NODE_A)

  // Assert
  t.is(
    startTime.toISOString(),
    lastSuccessTime,
    "Should use lastSuccess time, not lastAttempt",
  )
})

test.serial(
  "SyncCommand.getSyncStartTime should use default if never succeeded",
  (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
      lastAttempt: "2024-10-20T12:00:00.000Z",
      consecutiveFailures: 5,
    }

    // Act
    const startTime = cmd.getSyncStartTime(TEST_ETHEREUM_ADDRESS_NODE_A)

    // Assert
    t.is(
      startTime.toISOString(),
      "2025-09-15T00:00:00.000Z",
      "Should use default date if never succeeded",
    )
  },
)

// Test: shouldSkipNode
test.serial(
  "SyncCommand.shouldSkipNode should skip if failures exceed maxRetries",
  (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
      consecutiveFailures: 5,
      lastAttempt: new Date().toISOString(), // Recent attempt
    }

    // Act
    const shouldSkip = cmd.shouldSkipNode(TEST_ETHEREUM_ADDRESS_NODE_A, 3)

    // Assert
    t.true(shouldSkip, "Should skip node with too many failures")
  },
)

test.serial("SyncCommand.shouldSkipNode should retry after 24 hours", (t) => {
  // Arrange
  const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
  const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
  cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
    consecutiveFailures: 5,
    lastAttempt: yesterday.toISOString(),
  }

  // Act
  const shouldSkip = cmd.shouldSkipNode(TEST_ETHEREUM_ADDRESS_NODE_A, 3)

  // Assert
  t.false(shouldSkip, "Should retry after 24 hours")
})

test.serial("SyncCommand.shouldSkipNode should not skip new nodes", (t) => {
  // Arrange
  const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

  // Act
  const shouldSkip = cmd.shouldSkipNode("new-node-address", 3)

  // Assert
  t.false(shouldSkip, "Should not skip new nodes")
})

test.serial(
  "SyncCommand.shouldSkipNode should not skip if failures below threshold",
  (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
      consecutiveFailures: 2,
      lastAttempt: new Date().toISOString(),
    }

    // Act
    const shouldSkip = cmd.shouldSkipNode(TEST_ETHEREUM_ADDRESS_NODE_A, 3)

    // Assert
    t.false(shouldSkip, "Should not skip if failures below maxRetries")
  },
)

// Test: initNodeState
test.serial(
  "SyncCommand.initNodeState should initialize new node state",
  (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    // Act
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)

    // Assert
    t.truthy(cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A], "Should create state")
    t.is(
      cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].totalPublications,
      0,
      "Should initialize totalPublications",
    )
    t.is(
      cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].consecutiveFailures,
      0,
      "Should initialize consecutiveFailures",
    )
  },
)

test.serial(
  "SyncCommand.initNodeState should not overwrite existing state",
  (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
      totalPublications: 10,
      consecutiveFailures: 2,
    }

    // Act
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)

    // Assert
    t.is(
      cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].totalPublications,
      10,
      "Should preserve existing totalPublications",
    )
    t.is(
      cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].consecutiveFailures,
      2,
      "Should preserve existing consecutiveFailures",
    )
  },
)

// Test: handleSyncResult - Full Success
test.serial(
  "SyncCommand.handleSyncResult should handle full success",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)

    const result = {
      success: true,
      syncedPublications: 5,
      syncedContents: 5,
      errors: [],
    }
    const syncTime = new Date()

    // Act
    await cmd.handleSyncResult(
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "Test Node",
      result,
      syncTime,
    )

    // Assert
    const state = cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A]
    t.is(state.lastSuccess, syncTime.toISOString(), "Should update lastSuccess")
    t.is(state.consecutiveFailures, 0, "Should reset consecutiveFailures")
    t.is(state.totalPublications, 5, "Should update totalPublications")
    t.is(cmd.stats.successfulNodes, 1, "Should increment successfulNodes")
    t.is(cmd.stats.totalPublications, 5, "Should update stats")
    t.falsy(state.lastError, "Should clear lastError")
  },
)

// Test: handleSyncResult - Partial Success
test.serial(
  "SyncCommand.handleSyncResult should handle partial success",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].lastSuccess =
      "2024-10-01T00:00:00.000Z"

    const result = {
      success: false,
      partialSuccess: true,
      syncedPublications: 3,
      syncedContents: 3,
      errors: [{ type: "content", error: "Content fetch failed" }],
    }
    const syncTime = new Date()

    // Act
    await cmd.handleSyncResult(
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "Test Node",
      result,
      syncTime,
    )

    // Assert
    const state = cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A]
    t.is(
      state.lastSuccess,
      "2024-10-01T00:00:00.000Z",
      "Should NOT update lastSuccess on partial success",
    )
    t.is(state.consecutiveFailures, 1, "Should increment consecutiveFailures")
    t.is(state.totalPublications, 3, "Should still update totalPublications")
    t.is(state.lastError, "Content fetch failed", "Should record lastError")
    t.is(cmd.stats.failedNodes, 1, "Should increment failedNodes")
  },
)

// Test: handleSyncResult - Complete Failure
test.serial(
  "SyncCommand.handleSyncResult should handle complete failure",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].lastSuccess =
      "2024-10-01T00:00:00.000Z"

    const result = {
      success: false,
      partialSuccess: false,
      syncedPublications: 0,
      syncedContents: 0,
      errors: [{ type: "network", error: "Network timeout" }],
    }
    const syncTime = new Date()

    // Act
    await cmd.handleSyncResult(
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "Test Node",
      result,
      syncTime,
    )

    // Assert
    const state = cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A]
    t.is(
      state.lastSuccess,
      "2024-10-01T00:00:00.000Z",
      "Should NOT update lastSuccess on failure",
    )
    t.is(state.consecutiveFailures, 1, "Should increment consecutiveFailures")
    t.is(state.totalPublications, 0, "Should not update totalPublications")
    t.is(state.lastError, "Network timeout", "Should record lastError")
    t.is(cmd.stats.failedNodes, 1, "Should increment failedNodes")
  },
)

// Test: handleSyncResult - Multiple consecutive failures
test.serial(
  "SyncCommand.handleSyncResult should track consecutive failures",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].consecutiveFailures = 2

    const result = {
      success: false,
      partialSuccess: false,
      syncedPublications: 0,
      syncedContents: 0,
      errors: [{ type: "network", error: "Network error" }],
    }
    const syncTime = new Date()

    // Act
    await cmd.handleSyncResult(
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "Test Node",
      result,
      syncTime,
    )

    // Assert
    t.is(
      cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].consecutiveFailures,
      3,
      "Should increment consecutiveFailures",
    )
  },
)

// Test: handleSyncResult - Success after failures should reset counter
test.serial(
  "SyncCommand.handleSyncResult should reset failures on success",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].consecutiveFailures = 5
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].lastError = "Previous error"

    const result = {
      success: true,
      syncedPublications: 2,
      syncedContents: 2,
      errors: [],
    }
    const syncTime = new Date()

    // Act
    await cmd.handleSyncResult(
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "Test Node",
      result,
      syncTime,
    )

    // Assert
    t.is(
      cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].consecutiveFailures,
      0,
      "Should reset consecutiveFailures",
    )
    t.falsy(
      cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].lastError,
      "Should clear lastError",
    )
  },
)

// Test: handleSyncError
test.serial(
  "SyncCommand.handleSyncError should record error state",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)
    const error = new Error("Sync failed")

    // Act & Assert
    await t.throwsAsync(
      async () => {
        await cmd.handleSyncError(
          TEST_ETHEREUM_ADDRESS_NODE_A,
          "Test Node",
          error,
        )
      },
      { message: "Sync failed" },
      "Should throw the error",
    )

    const state = cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A]
    t.is(state.consecutiveFailures, 1, "Should increment consecutiveFailures")
    t.is(state.lastError, "Sync failed", "Should record error message")
    t.is(cmd.stats.failedNodes, 1, "Should increment failedNodes")
  },
)

// Test: syncNodesBatch - Should filter skipped nodes
test.serial(
  "SyncCommand.syncNodesBatch should skip nodes exceeding maxRetries",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    // Mock node with too many failures
    cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A] = {
      consecutiveFailures: 5,
      lastAttempt: new Date().toISOString(),
    }

    const nodes = [
      {
        address: TEST_ETHEREUM_ADDRESS_NODE_A,
        title: "Failed Node",
        url: "https://failed-node.com",
        sync: {
          publications: async () => ({
            success: true,
            syncedPublications: 0,
            syncedContents: 0,
            errors: [],
          }),
        },
      },
    ]

    // Act
    await cmd.syncNodesBatch(nodes, 10, 30000, 5, 3)

    // Assert
    t.is(cmd.stats.skippedNodes, 1, "Should skip node with too many failures")
    t.is(cmd.stats.processedNodes, 0, "Should not process skipped nodes")
  },
)

// Test: syncNodesBatch - Should process valid nodes
test.serial(
  "SyncCommand.syncNodesBatch should process valid nodes",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    const nodes = [
      {
        address: TEST_ETHEREUM_ADDRESS_NODE_A,
        title: "Test Node",
        url: "https://test-node.com",
        sync: {
          publications: async () => ({
            success: true,
            syncedPublications: 5,
            syncedContents: 5,
            errors: [],
          }),
        },
      },
    ]

    // Act
    await cmd.syncNodesBatch(nodes, 10, 30000, 5, 3)

    // Assert
    t.is(cmd.stats.processedNodes, 1, "Should process valid node")
    t.is(cmd.stats.successfulNodes, 1, "Should record success")
    t.is(cmd.stats.totalPublications, 5, "Should count publications")
  },
)

// Test: syncNodesBatch - Should handle batch processing
test.serial(
  "SyncCommand.syncNodesBatch should process nodes in batches",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

    const nodes = [
      {
        address: TEST_ETHEREUM_ADDRESS_NODE_A,
        title: "Node A",
        url: "https://node-a.com",
        sync: {
          publications: async () => ({
            success: true,
            syncedPublications: 2,
            syncedContents: 2,
            errors: [],
          }),
        },
      },
      {
        address: TEST_ETHEREUM_ADDRESS_NODE_B,
        title: "Node B",
        url: "https://node-b.com",
        sync: {
          publications: async () => ({
            success: true,
            syncedPublications: 3,
            syncedContents: 3,
            errors: [],
          }),
        },
      },
    ]

    // Act - batch size of 1 should process sequentially
    await cmd.syncNodesBatch(nodes, 10, 30000, 1, 3)

    // Assert
    t.is(cmd.stats.processedNodes, 2, "Should process both nodes")
    t.is(cmd.stats.successfulNodes, 2, "Should record 2 successes")
    t.is(cmd.stats.totalPublications, 5, "Should count total publications")
  },
)

// Test: Statistics tracking
test.serial("SyncCommand should track statistics correctly", (t) => {
  // Arrange
  const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

  // Assert initial state
  t.is(cmd.stats.totalNodes, 0, "Should initialize totalNodes")
  t.is(cmd.stats.successfulNodes, 0, "Should initialize successfulNodes")
  t.is(cmd.stats.failedNodes, 0, "Should initialize failedNodes")
  t.is(cmd.stats.totalPublications, 0, "Should initialize totalPublications")
  t.is(cmd.stats.skippedNodes, 0, "Should initialize skippedNodes")
})

// Test: State persistence across failures
test.serial(
  "SyncCommand should persist state after each sync attempt",
  async (t) => {
    // Arrange
    const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)
    cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)

    const result = {
      success: true,
      syncedPublications: 3,
      syncedContents: 3,
      errors: [],
    }

    // Act
    await cmd.handleSyncResult(
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "Test Node",
      result,
      new Date(),
    )

    // Assert
    t.true(existsSync(TEST_SYNC_STATE_FILE), "Should save state to file")

    // Create new command instance and verify state persisted
    const cmd2 = new SyncCommand(TEST_SYNC_STATE_FILE)
    t.is(
      cmd2.syncState[TEST_ETHEREUM_ADDRESS_NODE_A].totalPublications,
      3,
      "Should load persisted state",
    )
  },
)

// Test: Integration - Full sync workflow simulation
test.serial("SyncCommand should handle complete sync workflow", async (t) => {
  // Arrange
  const cmd = new SyncCommand(TEST_SYNC_STATE_FILE)

  // Simulate first sync - partial success
  cmd.initNodeState(TEST_ETHEREUM_ADDRESS_NODE_A)
  await cmd.handleSyncResult(
    TEST_ETHEREUM_ADDRESS_NODE_A,
    "Test Node",
    {
      success: false,
      partialSuccess: true,
      syncedPublications: 3,
      syncedContents: 3,
      errors: [{ type: "content", error: "Some content failed" }],
    },
    new Date("2024-10-20T10:00:00.000Z"),
  )

  const state1 = cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A]
  t.falsy(
    state1.lastSuccess,
    "Should not have lastSuccess after partial failure",
  )
  t.is(state1.consecutiveFailures, 1, "Should have 1 failure")

  // Simulate second sync - success
  await cmd.handleSyncResult(
    TEST_ETHEREUM_ADDRESS_NODE_A,
    "Test Node",
    {
      success: true,
      syncedPublications: 2,
      syncedContents: 2,
      errors: [],
    },
    new Date("2024-10-21T10:00:00.000Z"),
  )

  const state2 = cmd.syncState[TEST_ETHEREUM_ADDRESS_NODE_A]
  t.truthy(state2.lastSuccess, "Should have lastSuccess after success")
  t.is(state2.consecutiveFailures, 0, "Should reset failures")
  t.is(state2.totalPublications, 5, "Should accumulate publications")

  // Verify next sync would start from lastSuccess
  const nextStartTime = cmd.getSyncStartTime(TEST_ETHEREUM_ADDRESS_NODE_A)
  t.is(
    nextStartTime.toISOString(),
    state2.lastSuccess,
    "Next sync should start from last success",
  )
})
