import installRoutes from "./api/install.mjs"
import smtpcheckRoutes from "./api/smtp_check.mjs"
import visitorsRoutes from "./api/visitors.mjs"
import avatarRoutes from "./ewp/avatar.mjs"
import connectionsRoutes from "./ewp/connections.mjs"
import contentsRoutes from "./ewp/contents.mjs" // Import new contents routes
import nodesRoutes from "./ewp/nodes.mjs"
import profileRoutes from "./ewp/profile.mjs"
import publicationsRoutes from "./ewp/publications.mjs"
import replicationsRoutes from "./ewp/replications.mjs"

// This function will register all EWP-related routes.
export default (app) => {
  app.register(
    (instance, _opts, done) => {
      instance.register(profileRoutes)
      instance.register(avatarRoutes)
      instance.register(connectionsRoutes)
      instance.register(contentsRoutes)
      instance.register(replicationsRoutes)
      instance.register(nodesRoutes)
      instance.register(publicationsRoutes)
      done()
    },
    { prefix: "/ewp" },
  )
  app.register(
    (instance, _opts, done) => {
      instance.register(installRoutes)
      instance.register(smtpcheckRoutes)
      instance.register(visitorsRoutes)
      done()
    },
    { prefix: "/api" },
  )
}
