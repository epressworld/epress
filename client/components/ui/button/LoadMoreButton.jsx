"use client"

import { Box, Button, Text } from "@chakra-ui/react"
import { LuEllipsis } from "react-icons/lu"
import { useIntl } from "@/hooks/utils"

/**
 * LoadMoreButton - 加载更多按钮组件
 *
 * 统一的加载更多按钮,包含加载状态和无更多数据提示
 *
 * @param {Object} props
 * @param {boolean} props.hasMore - 是否还有更多数据
 * @param {boolean} [props.loading=false] - 加载状态
 * @param {Function} props.onLoadMore - 加载更多回调
 * @param {boolean} [props.showNoMore=true] - 是否显示"无更多数据"提示
 * @param {boolean} [props.hasAttemptedLoadMore=false] - 是否已尝试加载更多
 *
 * @example
 * <LoadMoreButton
 *   hasMore={hasMore}
 *   loading={loading}
 *   onLoadMore={handleLoadMore}
 * />
 */
export function LoadMoreButton({
  hasMore,
  loading = false,
  onLoadMore,
  showNoMore = true,
  hasAttemptedLoadMore = false,
}) {
  const { t } = useIntl()

  if (hasMore) {
    return (
      <Box textAlign="center" pt={2}>
        <Button
          onClick={onLoadMore}
          loading={loading}
          size="sm"
          variant={"subtle"}
          w="full"
          block
          disabled={loading}
        >
          {t("common")("loadMore")} <LuEllipsis />
        </Button>
      </Box>
    )
  }

  if (showNoMore && hasAttemptedLoadMore) {
    return (
      <Box textAlign="center" pt={2}>
        <Text color="gray.400" _dark={{ color: "gray.500" }} fontSize="sm">
          {t("common")("noMore")}
        </Text>
      </Box>
    )
  }

  return null
}
