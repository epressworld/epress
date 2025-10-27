"use client"

import Lightbox from "yet-another-react-lightbox"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"

/**
 * ImageLightbox - 图片 Lightbox 组件
 *
 * 使用 yet-another-react-lightbox 显示全尺寸图片
 * 此组件被动态导入以减少初始包大小
 *
 * @param {Object} props
 * @param {boolean} props.open - Lightbox 是否打开
 * @param {Function} props.onClose - 关闭回调
 * @param {string} props.src - 图片 URL
 * @param {string} props.alt - 图片描述
 *
 * @example
 * <ImageLightbox open={true} onClose={() => {}} src="/image.jpg" alt="Image" />
 */
export function ImageLightbox({ open, onClose, src, alt }) {
  return (
    <Lightbox
      open={open}
      close={onClose}
      slides={[
        {
          src: src,
          alt: alt || "Image",
        },
      ]}
      plugins={[Zoom]}
      carousel={{ finite: true }}
      render={{
        buttonPrev: () => null,
        buttonNext: () => null,
      }}
    />
  )
}
