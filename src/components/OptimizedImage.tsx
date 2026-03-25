import { useState, useCallback, ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Show a tiny blurred placeholder while loading */
  blur?: boolean;
}

/**
 * Performance-optimized image component:
 * - Native lazy loading + async decoding
 * - Fade-in on load
 * - Error fallback to placeholder
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  blur = true,
  className = "",
  style,
  ...rest
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const onLoad = useCallback(() => setLoaded(true), []);
  const onError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  const finalSrc = error ? "/placeholder.svg" : src;

  return (
    <img
      src={finalSrc}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onLoad={onLoad}
      onError={onError}
      className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      style={style}
      {...rest}
    />
  );
};

export default OptimizedImage;
