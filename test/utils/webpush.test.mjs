// webpush.test.mjs
import test from "ava"
import sinon from "sinon"
import webpush from "web-push"
import { Setting } from "../../server/models/index.mjs"
import { sendPushNotification } from "../../server/utils/webpush.mjs"

test.beforeEach(() => {
  sinon.restore()
  // 保证 stub 存在，方便断言
  sinon.stub(webpush, "setVapidDetails").returns()
  sinon.stub(webpush, "sendNotification").resolves()
})

// --- Tests ---

test.serial("should skip when VAPID keys are not configured", async (t) => {
  sinon.stub(Setting, "get").withArgs("notification_vapid_keys").resolves(null)

  await sendPushNotification({ msg: "hi" })
  t.false(webpush.setVapidDetails.called)
  t.false(webpush.sendNotification.called)
})

test.serial("should skip when subscriptions are missing", async (t) => {
  sinon
    .stub(Setting, "get")
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "pub", privateKey: "priv" })
  Setting.get.withArgs("notification_subscriptions").resolves(null)

  await sendPushNotification({ msg: "no subs" })
  t.false(webpush.setVapidDetails.called)
  t.false(webpush.sendNotification.called)
})

test.serial("should skip when subscriptions array is empty", async (t) => {
  sinon
    .stub(Setting, "get")
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "pub", privateKey: "priv" })
  Setting.get.withArgs("notification_subscriptions").resolves([])

  await sendPushNotification({ msg: "empty" })
  t.false(webpush.setVapidDetails.called)
  t.false(webpush.sendNotification.called)
})

test.serial("should send notification successfully", async (t) => {
  const vapid = { publicKey: "pub", privateKey: "priv" }
  const sub = { endpoint: "https://push.test/send" }

  sinon.stub(Setting, "get").callsFake((key) => {
    if (key === "notification_vapid_keys") return Promise.resolve(vapid)
    if (key === "notification_subscriptions") return Promise.resolve([sub])
  })

  await sendPushNotification({ msg: "ok" })

  t.true(webpush.setVapidDetails.calledOnce)
  t.true(webpush.sendNotification.calledOnce)
  t.deepEqual(webpush.sendNotification.firstCall.args[0], sub)
})

test.serial("should remove invalid subscriptions (404/410)", async (t) => {
  const vapid = { publicKey: "pub", privateKey: "priv" }
  const subs = [{ endpoint: "1" }, { endpoint: "2" }]

  sinon.stub(Setting, "get").callsFake((key) => {
    if (key === "notification_vapid_keys") return Promise.resolve(vapid)
    if (key === "notification_subscriptions") return Promise.resolve(subs)
  })
  const setStub = sinon.stub(Setting, "set").resolves()
  webpush.sendNotification.onFirstCall().rejects({ statusCode: 410 })
  webpush.sendNotification.onSecondCall().resolves()

  await sendPushNotification({ msg: "clean" })

  t.true(setStub.calledOnce)
  const validSubs = setStub.firstCall.args[1]
  t.deepEqual(validSubs, [subs[1]])
})

test.serial("should continue when general send error occurs", async (t) => {
  const vapid = { publicKey: "pub", privateKey: "priv" }
  const sub = { endpoint: "err" }

  sinon.stub(Setting, "get").callsFake((key) => {
    if (key === "notification_vapid_keys") return Promise.resolve(vapid)
    if (key === "notification_subscriptions") return Promise.resolve([sub])
  })
  webpush.sendNotification.rejects({ message: "fail", statusCode: 500 })

  await t.notThrowsAsync(() => sendPushNotification({ msg: "fail" }))
  t.true(webpush.sendNotification.calledOnce)
})

test.serial("should throw when subscriptions getter throws", async (t) => {
  const vapid = { publicKey: "pub", privateKey: "priv" }

  sinon.stub(Setting, "get").callsFake((key) => {
    if (key === "notification_vapid_keys") return Promise.resolve(vapid)
    if (key === "notification_subscriptions") throw new Error("parse error")
  })

  await t.throwsAsync(() => sendPushNotification({ msg: "parse" }), {
    message: "parse error",
  })
})

test.serial("should rethrow unexpected errors", async (t) => {
  sinon.stub(Setting, "get").rejects(new Error("unexpected"))
  await t.throwsAsync(() => sendPushNotification({ msg: "boom" }), {
    message: "unexpected",
  })
})
