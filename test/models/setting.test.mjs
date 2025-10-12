import test from "ava"
import { Setting } from "../../server/models/index.mjs"

// Import test setup to ensure database is initialized
import "../setup.mjs"

test.serial("Setting.get retrieves a setting from database", async (t) => {
  // First set a test setting
  const setResult = await Setting.set("test_key", "test_value")
  t.true(setResult, "Should successfully set the value")

  const value = await Setting.get("test_key")
  t.is(value, "test_value", "Should retrieve the correct value")
})

test.serial(
  "Setting.get returns default value when setting doesn't exist",
  async (t) => {
    const value = await Setting.get("nonexistent_key", "default")
    t.is(value, "default", "Should return default value")
  },
)

test.serial("Setting.set creates or updates a setting", async (t) => {
  // Create new setting
  const created = await Setting.set("new_key", "new_value")
  t.true(created, "Should successfully create setting")

  const value1 = await Setting.get("new_key")
  t.is(value1, "new_value", "Should retrieve the new value")

  // Update existing setting
  const updated = await Setting.set("new_key", "updated_value")
  t.true(updated, "Should successfully update setting")

  const value2 = await Setting.get("new_key")
  t.is(value2, "updated_value", "Should retrieve the updated value")
})

test.serial(
  "Setting.setMany creates or updates multiple settings",
  async (t) => {
    const settings = {
      setting1: "value1",
      setting2: "value2",
      setting3: "value3",
    }

    const result = await Setting.setMany(settings)
    t.true(result, "Should successfully set multiple settings")

    const value1 = await Setting.get("setting1")
    const value2 = await Setting.get("setting2")
    const value3 = await Setting.get("setting3")

    t.is(value1, "value1", "Should retrieve setting1")
    t.is(value2, "value2", "Should retrieve setting2")
    t.is(value3, "value3", "Should retrieve setting3")
  },
)
