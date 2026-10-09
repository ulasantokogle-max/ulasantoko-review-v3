"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export default function BusinessTitle({ children, style }: {
  children: string;
  style: CSSProperties;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const baseSize = Number(style.fontSize) || 31;
  const [fontSize, setFontSize] = useState(baseSize);

  useEffect(() => {
    if (!heading.current) return;
    let disposed = false;
    const fit = () => {
      if (disposed || !heading.current || !text.current) return;
      const available = heading.current.clientWidth;
      const measured = text.current.getBoundingClientRect().width;
      const currentSize = parseFloat(getComputedStyle(text.current).fontSize);
      if (available > 0 && measured > 0) {
        setFontSize(Math.min(baseSize, currentSize * Math.max(1, available - 2) / measured));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (heading.current) observer.observe(heading.current);
    document.fonts.ready.then(fit);
    return () => { disposed = true; observer.disconnect(); };
  }, [children, baseSize]);

  return (
    <h1 ref={heading} style={{ ...style, fontSize, whiteSpace: "nowrap", minWidth: 0 }}>
      <span ref={text} style={{ display: "inline-block" }}>{children}</span>
    </h1>
  );
}
