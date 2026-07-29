import React, { useState, useEffect, useRef } from 'react';

interface TransparentImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export const TransparentImage: React.FC<TransparentImageProps> = ({ src, alt, className, ...props }) => {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cacheRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!src) {
      setError(true);
      setLoading(false);
      return;
    }

    if (cacheRef.current[src]) {
      setProcessedSrc(cacheRef.current[src]);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get 2D context');
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 235 && g > 235 && b > 235) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        cacheRef.current[src] = dataUrl;
        setProcessedSrc(dataUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error processing transparent image:', err);
        setError(true);
        setLoading(false);
      }
    };

    img.onerror = () => {
      setError(true);
      setLoading(false);
    };
  }, [src]);

  if (error || loading || !processedSrc) {
    return <img src={src} alt={alt} className={className} {...props} />;
  }

  return <img src={processedSrc} alt={alt} className={className} {...props} />;
};
