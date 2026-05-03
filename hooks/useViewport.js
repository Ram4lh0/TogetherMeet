import { useEffect, useState } from "react";

export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth <= 760;
  });
  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth <= 760);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isPhone;
}

export function useViewportSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return { width: 390, height: 844 };
    return { width: window.innerWidth, height: window.innerHeight };
  });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return size;
}
