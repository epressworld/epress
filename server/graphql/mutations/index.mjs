import { authMutations } from "./auth.mjs"
import { commentMutations } from "./comment.mjs"
import { connectionMutations } from "./connection.mjs"
import { updateProfileMutation } from "./profile.mjs"
import { publicationMutations } from "./publication.mjs"
import { notificationMutation, updateSettingsMutation } from "./settings.mjs"

export default {
  ...authMutations,
  ...updateProfileMutation,
  ...updateSettingsMutation,
  ...notificationMutation,
  ...publicationMutations,
  ...connectionMutations,
  ...commentMutations,
}
