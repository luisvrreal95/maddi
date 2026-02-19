import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Grid3X3, MapPin } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  if (images.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[420px] bg-secondary flex items-center justify-center rounded-xl">
        <MapPin className="w-20 h-20 text-muted-foreground/30" />
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    setShowAll(false);
  };

  const openAllPhotos = () => {
    setShowAll(true);
    setLightboxOpen(true);
  };

  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <>
      {/* Airbnb-style grid */}
      <div className="rounded-xl overflow-hidden cursor-pointer">
      {images.length === 1 ? (
          <img
            src={images[0]}
            alt={title}
            onClick={() => openLightbox(0)}
            className="w-full h-[300px] md:h-[420px] object-cover hover:opacity-90 transition-opacity"
          />
        ) : images.length === 2 ? (
          <div className="grid grid-cols-2 gap-1 h-[300px] md:h-[420px]">
            {images.slice(0, 2).map((img, i) => (
              <div key={i} className="relative w-full h-full overflow-hidden" onClick={() => openLightbox(i)}>
                <img src={img} alt={`${title} ${i + 1}`}
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
              </div>
            ))}
          </div>
        ) : images.length === 3 ? (
          <div className="grid grid-cols-2 gap-1 h-[300px] md:h-[420px]">
            <div className="relative w-full h-full overflow-hidden row-span-2" onClick={() => openLightbox(0)}>
              <img src={images[0]} alt={title}
                className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </div>
            <div className="grid grid-rows-2 gap-1">
              {images.slice(1, 3).map((img, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden" onClick={() => openLightbox(i + 1)}>
                  <img src={img} alt={`${title} ${i + 2}`}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 4+ images: main left + 2x2 grid right */
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-1 h-[300px] md:h-[420px]">
            <div className="relative w-full h-full overflow-hidden" onClick={() => openLightbox(0)}>
              <img src={images[0]} alt={title}
                className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </div>
            <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-1">
              {images.slice(1, 5).map((img, i) => (
                <div key={i} className="relative w-full h-full overflow-hidden" onClick={() => openLightbox(i + 1)}>
                  <img src={img} alt={`${title} ${i + 2}`}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </div>
              ))}
            </div>
            {images.length > 5 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={openAllPhotos}
                className="absolute bottom-4 right-4 bg-card/90 hover:bg-card text-foreground border border-border gap-1.5 text-xs font-semibold"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Ver todas las fotos ({images.length})
              </Button>
            )}
            {images.length <= 5 && images.length > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={openAllPhotos}
                className="absolute bottom-4 right-4 bg-card/90 hover:bg-card text-foreground border border-border gap-1.5 text-xs font-semibold md:hidden"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Ver todas ({images.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / All Photos Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[100vw] w-screen h-screen p-0 bg-black/95 border-none [&>button]:hidden">
          {showAll ? (
            /* All photos grid view */
            <div className="h-full overflow-y-auto">
              <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-semibold">{title} · {images.length} fotos</h2>
                <Button variant="ghost" size="icon" onClick={() => setLightboxOpen(false)}
                  className="text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="max-w-4xl mx-auto px-4 pb-8 space-y-2">
                {images.map((img, i) => (
                  <img key={i} src={img} alt={`${title} ${i + 1}`}
                    onClick={() => { setShowAll(false); setLightboxIndex(i); }}
                    className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
                ))}
              </div>
            </div>
          ) : (
            /* Single image lightbox */
            <div className="relative flex items-center justify-center h-full">
              <Button variant="ghost" size="icon" onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/10">
                <X className="w-6 h-6" />
              </Button>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
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
              <img src={images[lightboxIndex]} alt={`${title} ${lightboxIndex + 1}`}
                className="max-h-[85vh] max-w-[90vw] object-contain" />
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
    </>
  );
};

export default ImageGallery;
