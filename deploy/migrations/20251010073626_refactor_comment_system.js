/**
 * 评论系统重构迁移文件
 *
 * 变更内容:
 * 1. 将 commenter_username 重命名为 author_name
 * 2. 合并 commenter_email 和 commenter_address 为 author_id
 * 3. 将 signature 重命名为 credential
 */

export async function up(knex) {
  await knex.schema.alterTable("comments", (table) => {
    // 添加新字段
    table.string("author_name")
    table.string("author_id")
    table.string("credential")
  })

  // 数据迁移
  await knex.raw(`
    UPDATE comments 
    SET 
      author_name = commenter_username,
      author_id = CASE 
        WHEN auth_type = 'EMAIL' THEN commenter_email 
        WHEN auth_type = 'ETHEREUM' THEN commenter_address 
        ELSE NULL 
      END,
      credential = signature
  `)

  // 删除旧字段
  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("commenter_username")
    table.dropColumn("commenter_email")
    table.dropColumn("commenter_address")
    table.dropColumn("signature")
  })
}

export async function down(knex) {
  await knex.schema.alterTable("comments", (table) => {
    // 添加旧字段
    table.string("commenter_username")
    table.string("commenter_email")
    table.string("commenter_address")
    table.string("signature")
  })

  // 数据迁移回退
  await knex.raw(`
    UPDATE comments 
    SET 
      commenter_username = author_name,
      commenter_email = CASE WHEN auth_type = 'EMAIL' THEN author_id ELSE NULL END,
      commenter_address = CASE WHEN auth_type = 'ETHEREUM' THEN author_id ELSE NULL END,
      signature = credential
  `)

  // 删除新字段
  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("author_name")
    table.dropColumn("author_id")
    table.dropColumn("credential")
  })
}
