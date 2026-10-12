import React, { useState } from 'react';

interface GalleryImages {
  hero: {
    url: string;
    caption: string;
    badge: string;
  };
  thumbnails: {
    url: string;
    caption: string;
  }[];
  totalCount: number;
}

interface PhotoGalleryProps {
  gallery: GalleryImages;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ gallery }) => {
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);

  const allImages = [
    { url: gallery.hero.url, caption: gallery.hero.caption },
    ...gallery.thumbnails,
  ];

  const handleNextPhoto = () => {
    if (activeModalIndex !== null) {
      setActiveModalIndex((activeModalIndex + 1) % allImages.length);
    }
  };

  const handlePrevPhoto = () => {
    if (activeModalIndex !== null) {
      setActiveModalIndex(
        (activeModalIndex - 1 + allImages.length) % allImages.length
      );
    }
  };

  return (
    <>
      <section className="relative w-full rounded-xl overflow-hidden shadow-sm bg-surface-container-low p-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-auto lg:h-[540px]">
          {/* Large Hero (Left Pavilion) */}
          <div
            onClick={() => setActiveModalIndex(0)}
            className="lg:col-span-7 h-[360px] lg:h-full relative rounded-lg overflow-hidden group cursor-pointer"
          >
            <img
              src={gallery.hero.url}
              alt={gallery.hero.caption}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />
            <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface font-label-sm text-label-sm font-semibold tracking-wide shadow-sm">
              {gallery.hero.badge}
            </span>
          </div>

          {/* 4 Thumbnail Grid (Right) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-2 h-full">
            {gallery.thumbnails.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setActiveModalIndex(idx + 1)}
                className="relative rounded-lg overflow-hidden h-40 lg:h-full group cursor-pointer"
              >
                <img
                  src={item.url}
                  alt={item.caption}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-2.5 left-2.5 font-label-sm text-label-sm text-white px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
                  {item.caption}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Gallery Button */}
        <button
          type="button"
          onClick={() => setActiveModalIndex(0)}
          className="absolute bottom-6 right-6 flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-lowest/90 hover:bg-surface-container-lowest text-on-surface font-label-lg text-label-lg backdrop-blur-md shadow-md hover:shadow-lg transition-all active:scale-95 group cursor-pointer border-0"
        >
          <span className="material-symbols-outlined text-[18px] text-primary group-hover:rotate-12 transition-transform">
            photo_library
          </span>
          <span>Xem tất cả {gallery.totalCount} ảnh</span>
        </button>
      </section>

      {/* Lightbox Modal */}
      {activeModalIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveModalIndex(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalIndex(null)}
              className="absolute -top-12 right-0 text-white hover:text-primary transition-colors border-0 bg-transparent cursor-pointer p-2 flex items-center gap-1 font-label-md text-label-md"
            >
              <span>Đóng</span>
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            {/* Current Image */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={allImages[activeModalIndex].url}
                alt={allImages[activeModalIndex].caption}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />

              {/* Navigation Arrows */}
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center transition-all border-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center transition-all border-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">
                  chevron_right
                </span>
              </button>
            </div>

            {/* Caption */}
            <div className="mt-3 text-center text-white/90 font-body-md text-body-md">
              <span>{allImages[activeModalIndex].caption}</span>
              <span className="text-white/50 text-xs ml-3">
                ({activeModalIndex + 1} / {allImages.length})
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default PhotoGallery;
