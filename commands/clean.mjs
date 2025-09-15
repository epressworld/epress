import "../config/index.mjs"
import { Command, Model } from "swiftify"
import { Content } from "../server/models/index.mjs"

export class CleanContentCommand extends Command {
  description =
    "Clean orphaned Content records that are not referenced by any Publication"

  async action() {
    console.log("Starting content cleanup process...")

    try {
      const result = await Content.cleanupOrphanedContents()

      if (result.totalProcessed === 0) {
        console.log("No orphaned content found. Cleanup completed.")
        return
      }

      console.log(`Cleanup completed successfully!`)
      console.log(
        `- Total orphaned content processed: ${result.totalProcessed}`,
      )
      console.log(`- Content records deleted: ${result.deletedCount}`)
      console.log(`- Physical files deleted: ${result.fileDeletedCount}`)

      // Handle errors during cleanup process
      if (result.errors && result.errors.length > 0) {
        console.log(
          `\n⚠️  ${result.errors.length} errors occurred during cleanup:`,
        )
        result.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.type}: ${error.error}`)
          if (error.contentHash) {
            console.log(`     Content Hash: ${error.contentHash}`)
          }
          if (error.filePath) {
            console.log(`     File Path: ${error.filePath}`)
          }
        })
      }
    } catch (error) {
      console.error("Error during content cleanup:", error)
      throw error
    } finally {
      // Only destroy database connection when running as standalone command
      // Don't destroy when called from scheduler as it's running in the main process
      if (
        process.argv[1] === new URL(import.meta.url).pathname &&
        Model.knex()
      ) {
        await Model.knex().destroy()
      }
    }
  }
}

// If running this file directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  new CleanContentCommand().execute(process.argv)
}
