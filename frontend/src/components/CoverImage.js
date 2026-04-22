import { useState } from 'react';

export default function CoverImage({ src, alt, className, fallback = '✍️' }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    if (!fallback) return null;
    return (
      <span className="post-card-img-fallback" aria-hidden="true">
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

