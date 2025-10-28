"use client"
import { Box, Icon, Spinner } from "@chakra-ui/react"
import { LuRefreshCw } from "react-icons/lu"

// 定义固定指示器在顶部的位置 (例如，距离顶部 10px)
const FIXED_TOP_POSITION = 10
const REFRESH_THRESHOLD_FOR_SPINNER = 180 // 匹配 Hook 中的默认值

/**
 * Pull to refresh VISUAL component (Fixed Position, High Performance)
 * @param {Object} props
 * @param {boolean} props.isRefreshing - 是否正在刷新
 * @param {number} props.pullPosition - 当前下拉的像素 (来自Hook)
 * @param {boolean} props.isPulling - 是否正在下拉 (来自Hook)
 */
export function PullToRefresh({ isRefreshing, pullPosition, isPulling }) {
  // 1. 确定组件是否可见
  const isVisible = isRefreshing || isPulling

  // 2. 确定组件的Y轴位移 (用于下拉时的动态跟随)
  let translateY = 0

  if (isPulling) {
    // 正在下拉时，指示器跟随手指移动。
    // 为了视觉效果，我们只让指示器跟随实际拉动距离的一小部分，例如 1/5。
    // 这样指示器会从顶部 "滑入"。
    const pullDistanceScale = 5
    translateY = pullPosition / pullDistanceScale

    // 限制位移，确保它不会离开屏幕
    const maxTranslateY = 50 // 最大位移
    translateY = Math.min(translateY, maxTranslateY)
  }

  // 3. 确定是显示 Spinner 还是 Icon
  const showSpinner = isRefreshing

  // 4. 计算 Icon 的旋转角度 (仅在非刷新状态下)
  // 当 pullPosition 达到阈值时，旋转角度达到最大 (360度)
  const rotationDegrees = Math.min(
    (pullPosition / REFRESH_THRESHOLD_FOR_SPINNER) * 360,
    360,
  )

  return (
    <Box
      position="fixed" // <--- 关键修改：Fixed 定位
      top={`${FIXED_TOP_POSITION}px`} // 固定在顶部
      left="50%"
      transform={`translateX(-50%) translateY(${translateY}px)`} // 使用 transform 实现高性能位移
      zIndex={1000}
      // 只有在 isVisible 变化时才过渡 opacity，避免频繁的 transform 变化被过渡影响
      opacity={isVisible ? 1 : 0}
      transition="opacity 0.2s ease-out"
      pointerEvents="none"
    >
      <Box
        bg="bg.panel"
        borderRadius="full"
        boxShadow="lg"
        p={3}
        display="flex"
        alignItems="center"
        justifyContent="center"
        w={12}
        h={12}
        _dark={{
          bg: "gray.800",
          boxShadow: "dark-lg",
        }}
      >
        {showSpinner ? (
          <Spinner size="md" color="blue.500" thickness="3px" />
        ) : (
          <Box
            // 注意：这里我们不给 Box 容器设置 transition，直接修改 style 保持灵敏度
            style={{
              transform: `rotate(${rotationDegrees}deg)`,
            }}
          >
            <Icon size="lg">
              <LuRefreshCw />
            </Icon>
          </Box>
        )}
      </Box>
    </Box>
  )
}
