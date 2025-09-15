import { getSiweMessageQuery } from "./auth.mjs"
import { connectionQuery } from "./connection.mjs"
import { fetchQuery } from "./fetch.mjs"
import { nodeStatusQuery } from "./nodeStatus.mjs"
import { profileQuery } from "./profile.mjs"
import { searchQuery } from "./search.mjs"
import { settingsQuery } from "./settings.mjs" // Import settingsQuery

export default {
  ...profileQuery,
  ...settingsQuery,
  ...fetchQuery,
  ...searchQuery,
  ...getSiweMessageQuery,
  ...connectionQuery,
  ...nodeStatusQuery,
}
