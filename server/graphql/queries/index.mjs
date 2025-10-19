import { getSiweMessageQuery } from "./auth.mjs"
import { fetchQuery } from "./fetch.mjs"
import { nodeStatusQuery } from "./nodeStatus.mjs"
import { profileQuery } from "./profile.mjs"
import { searchQuery } from "./search.mjs"
import { settingsQuery } from "./settings.mjs" // Import settingsQuery
import { visitorQuery } from "./visitor.mjs"

export default {
  ...profileQuery,
  ...settingsQuery,
  ...fetchQuery,
  ...searchQuery,
  ...getSiweMessageQuery,
  ...visitorQuery,
  ...nodeStatusQuery,
}
