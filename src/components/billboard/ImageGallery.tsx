import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Grid3X3, MapPin, Images } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

/* Skeleton shimmer shown while an image loads */
const ImageSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse bg-muted/60 rounded-[inherit]', className)} />
);

/* Single smart image: loads with skeleton, handles errors, subtle overlay for uniformity */
const GalleryImage: React.FC<{
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, priority, className, onClick }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-secondary cursor-pointer group',
        className
      )}
      onClick={onClick}
    >
      {/* Skeleton placeholder */}
      {!loaded && !error && (
        <ImageSkeleton className="absolute inset-0 z-10" />
      )}

      {/* Error state */}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <Images className="w-10 h-10 text-muted-foreground/30" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full object-cover transition-all duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            // Subtle zoom on hover — desktop only
            'group-hover:scale-[1.03]'
          )}
        />
      )}

      {/* Subtle vignette overlay for uniformity */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/5 pointer-events-none" />
    </div>
  );
};

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const isMobile = useIsMobile();
  const [mobileIndex, setMobileIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    setShowAll(false);
  }, []);

  const openAllPhotos = useCallback(() => {
    setShowAll(true);
    setLightboxOpen(true);
  }, []);

  const nextImage = useCallback(() => setLightboxIndex((p) => (p + 1) % images.length), [images.length]);
  const prevImage = useCallback(() => setLightboxIndex((p) => (p - 1 + images.length) % images.length), [images.length]);

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && mobileIndex < images.length - 1) setMobileIndex((p) => p + 1);
      if (diff < 0 && mobileIndex > 0) setMobileIndex((p) => p - 1);
    }
    setTouchStart(null);
  };

  /* ── Empty state ── */
  if (images.length === 0) {
    return (
      <div className="w-full h-[260px] md:h-[460px] bg-secondary flex items-center justify-center rounded-2xl">
        <MapPin className="w-16 h-16 text-muted-foreground/20" />
      </div>
    );
  }

  /* ── Mobile: swipeable carousel ── */
  if (isMobile) {
    return (
      <>
        <div className="relative rounded-2xl overflow-hidden">
          <div
            className="relative h-[280px] overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${mobileIndex * 100}%)` }}
            >
              {images.map((img, i) => (
                <div key={i} className="min-w-full h-full flex-shrink-0">
                  <GalleryImage
                    src={img}
                    alt={`${title} ${i + 1}`}
                    priority={i === 0}
                    className="w-full h-full rounded-none"
                    onClick={() => openLightbox(i)}
                  />
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setMobileIndex(i); }}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      i === mobileIndex
                        ? 'w-6 bg-white'
                        : 'w-1.5 bg-white/50'
                    )}
                  />
                ))}
              </div>
            )}

            {/* Counter badge */}
            {images.length > 1 && (
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-medium z-10">
                {mobileIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* "Show all" button */}
          {images.length > 1 && (
            <button
              onClick={openAllPhotos}
              className="absolute bottom-3 right-3 z-10 bg-card/90 backdrop-blur-sm border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-card transition-colors"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Ver todas ({images.length})
            </button>
          )}
        </div>

        <LightboxDialog
          images={images}
          title={title}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          showAll={showAll}
          setShowAll={setShowAll}
          lightboxIndex={lightboxIndex}
          nextImage={nextImage}
          prevImage={prevImage}
        />
      </>
    );
  }

  /* ── Desktop layouts ── */
  const galleryHeight = 'h-[460px]';

  return (
    <>
      <div className={cn('rounded-2xl overflow-hidden', galleryHeight)}>
        {images.length === 1 ? (
          /* Single image — full hero */
          <GalleryImage
            src={images[0]}
            alt={title}
            priority
            className="w-full h-full rounded-2xl"
            onClick={() => openLightbox(0)}
          />
        ) : images.length === 2 ? (
          /* Two images — balanced split */
          <div className="grid grid-cols-2 gap-1.5 h-full">
            <GalleryImage
              src={images[0]}
              alt={title}
              priority
              className="w-full h-full rounded-l-2xl"
              onClick={() => openLightbox(0)}
            />
            <GalleryImage
              src={images[1]}
              alt={`${title} 2`}
              className="w-full h-full rounded-r-2xl"
              onClick={() => openLightbox(1)}
            />
          </div>
        ) : (
          /* 3+ images — hero left + 2 stacked right */
          <div className="relative grid grid-cols-[2fr_1fr] gap-1.5 h-full">
            <GalleryImage
              src={images[0]}
              alt={title}
              priority
              className="w-full h-full rounded-l-2xl"
              onClick={() => openLightbox(0)}
            />
            <div className="grid grid-rows-2 gap-1.5 h-full">
              <GalleryImage
                src={images[1]}
                alt={`${title} 2`}
                className="w-full h-full rounded-tr-2xl"
                onClick={() => openLightbox(1)}
              />
              <div className="relative">
                <GalleryImage
                  src={images[2]}
                  alt={`${title} 3`}
                  className="w-full h-full rounded-br-2xl"
                  onClick={() => openLightbox(2)}
                />
                {/* "Show all" overlay on last visible image */}
                {images.length > 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openAllPhotos(); }}
                    className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors flex items-center justify-center rounded-br-2xl"
                  >
                    <span className="flex items-center gap-2 text-white text-sm font-semibold">
                      <Grid3X3 className="w-4 h-4" />
                      Ver todas ({images.length})
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <LightboxDialog
        images={images}
        title={title}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        showAll={showAll}
        setShowAll={setShowAll}
        lightboxIndex={lightboxIndex}
        nextImage={nextImage}
        prevImage={prevImage}
      />
    </>
  );
};

/* ── Lightbox Dialog (shared) ── */
const LightboxDialog: React.FC<{
  images: string[];
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAll: boolean;
  setShowAll: (show: boolean) => void;
  lightboxIndex: number;
  nextImage: () => void;
  prevImage: () => void;
}> = ({ images, title, open, onOpenChange, showAll, setShowAll, lightboxIndex, nextImage, prevImage }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[100vw] w-screen h-screen p-0 bg-black/95 border-none [&>button]:hidden">
      {showAll ? (
        <div className="h-full overflow-y-auto">
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold">{title} · {images.length} fotos</h2>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-8 space-y-3">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`${title} ${i + 1}`}
                onClick={() => { setShowAll(false); }}
                className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center h-full">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/10">
            <X className="w-6 h-6" />
          </Button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
            {lightboxIndex + 1} / {images.length}
          </div>
          {images.length > 1 && (
            <>
              <Button variant="ghost" size="icon" onClick={prevImage}
                className="absolute left-4 text-white hover:bg-white/10 w-12 h-12">
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextImage}
                className="absolute right-4 text-white hover:bg-white/10 w-12 h-12">
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}
          <img
            src={images[lightboxIndex]}
            alt={`${title} ${lightboxIndex + 1}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
          />
          {images.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}
              className="absolute bottom-6 text-white/70 hover:text-white hover:bg-white/10 gap-1.5 text-xs">
              <Grid3X3 className="w-3.5 h-3.5" />
              Ver todas las fotos
            </Button>
          )}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default ImageGallery;
