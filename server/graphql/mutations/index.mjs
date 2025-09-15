import { authMutations } from "./auth.mjs"
import { commentMutations } from "./comment.mjs"
import { connectionMutations } from "./connection.mjs"
import { updateProfileMutation } from "./profile.mjs"
import { publicationMutations } from "./publication.mjs"
import { updateSettingsMutation } from "./settings.mjs"

export default {
  ...authMutations,
  ...updateProfileMutation,
  ...updateSettingsMutation,
  ...publicationMutations,
  ...connectionMutations,
  ...commentMutations,
}
