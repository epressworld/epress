import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import "dayjs/locale/zh-cn"
import "dayjs/locale/en"

// 扩展 dayjs 插件
dayjs.extend(relativeTime)

// 根据语言设置格式化时间
export const formatTime = (timestamp, language = "en") => {
  const dayjsInstance = dayjs(timestamp)

  if (language === "zh") {
    return dayjsInstance.locale("zh-cn").format("YYYY年MM月DD日 HH:mm")
  } else {
    return dayjsInstance.locale("en").format("MMM DD, YYYY HH:mm")
  }
}

// 格式化日期（不包含时间）
export const formatDate = (timestamp, language = "en") => {
  const dayjsInstance = dayjs(timestamp)

  if (language === "zh") {
    return dayjsInstance.locale("zh-cn").format("YYYY年MM月DD日")
  } else {
    return dayjsInstance.locale("en").format("MMM DD, YYYY")
  }
}

// 相对时间格式化（如：2小时前）
export const formatRelativeTime = (timestamp, language = "en") => {
  // 创建 dayjs 实例并设置语言
  const dayjsInstance = dayjs(timestamp)

  if (language === "zh") {
    return dayjsInstance.locale("zh-cn").fromNow()
  } else {
    return dayjsInstance.locale("en").fromNow()
  }
}
