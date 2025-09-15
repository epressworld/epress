import { Text } from "@chakra-ui/react"

/**
 * 状态标签组件
 * @param {string} status - 状态文本
 * @param {string} color - 颜色主题
 * @param {string} description - 描述文本
 * @returns {JSX.Element} 状态标签组件
 */
export const StatusBadge = ({ status, color, description }) => {
  return (
    <Text fontSize="xs" color={color}>
      {status}
      {description && (
        <Text as="span" ml={1} color="fg.subtle">
          ({description})
        </Text>
      )}
    </Text>
  )
}
