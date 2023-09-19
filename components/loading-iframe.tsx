"use client"
import React, { IframeHTMLAttributes, ReactElement, useState } from "react"

type Props = IframeHTMLAttributes<any> & {
  skeleton?: ReactElement
}

const LoadingIframe = (props: Props) => {
  const { skeleton, ...iframeProps } = props
  const [iframeLoading, setIframeLoading] = useState(true)

  if (!skeleton) {
    console.warn("Rendered without skeleton, consider using an html iframe")
  }

  return (
    <>
      {iframeLoading && skeleton}
      <iframe
        {...iframeProps}
        style={{ display: iframeLoading ? "none" : "block" }}
        onLoad={() => {
          setIframeLoading(false)
        }}
      />
    </>
  )
}

export default LoadingIframe
