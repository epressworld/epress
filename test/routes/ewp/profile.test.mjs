import test from "ava"
import { Node } from "../../../server/models/index.mjs"
import { TEST_ETHEREUM_ADDRESS_NODE_A, TEST_NODE_A } from "../../setup.mjs"

test.serial(
  "GET /profile should return 404 if no self node is found",
  async (t) => {
    await Node.query().delete()
    // Action: Send GET request to /profile
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/profile",
    })

    // Expected result
    t.is(response.statusCode, 404, "should return 404 Not Found")
    t.deepEqual(
      response.json(),
      {
        error: "NODE_NOT_FOUND",
      },
      "should return NODE_NOT_FOUND error",
    )
  },
)

test.serial(
  "GET /profile should return the self node profile successfully",
  async (t) => {
    // Prerequisite: Insert a node record with is_self=true
    await Node.query().insert({
      address: TEST_ETHEREUM_ADDRESS_NODE_A,
      url: TEST_NODE_A.url,
      title: TEST_NODE_A.title,
      description: TEST_NODE_A.description,
      is_self: true,
      profile_version: 0,
    })

    // Action: Send GET request to /profile
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/profile",
    })

    // Expected result
    t.is(response.statusCode, 200, "should return 200 OK")
    t.deepEqual(
      response.json(),
      {
        address: TEST_ETHEREUM_ADDRESS_NODE_A,
        url: TEST_NODE_A.url,
        title: TEST_NODE_A.title,
        description: TEST_NODE_A.description,
      },
      "should return the correct self node profile",
    )
  },
)
