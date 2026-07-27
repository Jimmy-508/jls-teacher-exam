import { useEffect, useState } from 'react';
import { isQuestionImageAssetReference, resolveQuestionImageSource } from '../services/questionImageAssetService';

interface QuestionImageProps {
  className: string;
  src: string;
  alt: string;
}

export default function QuestionImage({ className, src, alt }: QuestionImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(() => (isQuestionImageAssetReference(src) ? '' : src));
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let isActive = true;
    let objectUrl = '';

    if (!isQuestionImageAssetReference(src)) {
      setResolvedSrc(src);
      setHasLoadError(false);
      return () => undefined;
    }

    setResolvedSrc('');
    setHasLoadError(false);
    void resolveQuestionImageSource(src)
      .then((url) => {
        objectUrl = url;
        if (isActive) {
          setResolvedSrc(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => {
        if (isActive) {
          setResolvedSrc('');
          setHasLoadError(true);
        }
      });

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (hasLoadError) {
    return (
      <span className="question-image-fallback" role="note">
        {'\u5716\u7247\u7121\u6cd5\u8f09\u5165'}
      </span>
    );
  }

  if (!resolvedSrc) {
    return null;
  }

  return <img className={className} src={resolvedSrc} alt={alt} />;
}
