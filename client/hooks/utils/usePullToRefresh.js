import { useCallback, useEffect, useState } from "react"

// 默认值
export const DEFAULT_MAXIMUM_PULL_LENGTH = 240
export const DEFAULT_REFRESH_THRESHOLD = 180

/**
 * 一个健壮的、区域触发的 React 下拉刷新 Hook
 * @param {Object} params
 * @param {Function} params.onRefresh - 当触发刷新时调用的回调函数 (可以是 async/Promise)
 * @param {import("react").RefObject<HTMLElement>} params.triggerRef - 一个指向可触发区域DOM元素的 React Ref
 * @param {number} [params.maximumPullLength=240] - 手指可以下拉的最大像素距离
 * @param {number} [params.refreshThreshold=180] - 触发 'onRefresh' 所需的最小下拉距离
 * @param {boolean} [params.isDisabled=false] - 临时禁用下拉刷新
 * @returns {{isRefreshing: boolean, pullPosition: number, isPulling: boolean}}
 */
export const usePullToRefresh = ({
  onRefresh,
  triggerRef,
  maximumPullLength = DEFAULT_MAXIMUM_PULL_LENGTH,
  refreshThreshold = DEFAULT_REFRESH_THRESHOLD,
  isDisabled = false,
}) => {
  const [pullPosition, setPullPosition] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // 新状态：指示用户正在进行下拉手势
  const [isPulling, setIsPulling] = useState(false)
  const [pullStartPosition, setPullStartPosition] = useState(null)

  // 1. 手指按下 (Touch Start)
  const handleTouchStart = useCallback(
    (event) => {
      if (isDisabled || isRefreshing || !triggerRef || !triggerRef.current) {
        return
      }

      const isAtTop = document.documentElement.scrollTop === 0
      const isInsideTrigger = triggerRef.current.contains(event.target)

      if (isAtTop && isInsideTrigger) {
        const touch = event.targetTouches[0]
        if (touch) {
          setPullStartPosition(touch.clientY)
          // 在这里我们不设置 isPulling，因为它可能只是一个点击，我们在 move 中设置
        }
      } else {
        setPullStartPosition(null)
      }
    },
    [isDisabled, isRefreshing, triggerRef],
  )

  // 2. 手指移动 (Touch Move)
  const handleTouchMove = useCallback(
    (event) => {
      if (pullStartPosition === null) return

      const touch = event.targetTouches[0]
      if (!touch) return

      const currentPullLength = touch.clientY - pullStartPosition

      if (currentPullLength < 0) {
        // 向上拉或滚动，取消下拉刷新
        setPullStartPosition(null)
        setPullPosition(0)
        setIsPulling(false) // <--- 重置
        return
      }

      // 只要下拉距离大于 0，就视为正在下拉
      if (currentPullLength > 0 && !isPulling) {
        setIsPulling(true) // <--- 设置正在下拉
      }

      event.preventDefault()

      const cappedPullLength = Math.min(currentPullLength, maximumPullLength)
      setPullPosition(cappedPullLength)
    },
    [pullStartPosition, maximumPullLength, isPulling],
  )

  // 3. 手指抬起 (Touch End)
  const handleTouchEnd = useCallback(() => {
    if (pullStartPosition === null) return

    setPullStartPosition(null)
    setIsPulling(false) // <--- 重置

    if (pullPosition >= refreshThreshold) {
      setIsRefreshing(true)
      setPullPosition(0) // 松手后，pullPosition归零，但 isRefreshing 为 true

      // **【修复】**：
      // 使用一个健壮的 async IIFE 来包装 onRefresh 调用。
      // 这可以确保无论 onRefresh 是-否返回 promise，
      // setIsRefreshing(false) 都会在 onRefresh 执行完毕后才被调用。
      const runRefresh = async () => {
        try {
          // 等待 onRefresh 完成 (await 一个非 promise 值也可以正常工作)
          await onRefresh()
        } catch (error) {
          // onRefresh 内部应该自己处理错误, 但这里也捕获一下以防万一
          console.error("Error during onRefresh:", error)
        } finally {
          // 无论成功还是失败, 结束刷新状态
          setIsRefreshing(false)
        }
      }

      runRefresh()
    } else {
      // 未达到阈值，平滑地弹回去 (拉力归零)
      setPullPosition(0)
    }
  }, [pullStartPosition, pullPosition, refreshThreshold, onRefresh])

  // 4. 注册和清理 (省略，与上一个版本相同)
  useEffect(() => {
    if (isDisabled) return

    const options = { passive: false }
    window.addEventListener("touchstart", handleTouchStart, options)
    window.addEventListener("touchmove", handleTouchMove, options)
    window.addEventListener("touchend", handleTouchEnd, options)
    window.addEventListener("touchcancel", handleTouchEnd, options)

    return () => {
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("touchcancel", handleTouchEnd)
    }
  }, [isDisabled, handleTouchStart, handleTouchMove, handleTouchEnd])

  // 5. 自动禁用浏览器原生下拉刷新 (省略，与上一个版本相同)
  useEffect(() => {
    if (isDisabled) return

    const originalBodyOverscroll = document.body.style.overscrollBehaviorY
    const originalHtmlOverscroll =
      document.documentElement.style.overscrollBehaviorY

    document.body.style.overscrollBehaviorY = "contain"
    document.documentElement.style.overscrollBehaviorY = "contain"

    return () => {
      document.body.style.overscrollBehaviorY = originalBodyOverscroll
      document.documentElement.style.overscrollBehaviorY =
        originalHtmlOverscroll
    }
  }, [isDisabled])

  // 返回 API
  return { isRefreshing, pullPosition, isPulling } // <--- 新增 isPulling
}
