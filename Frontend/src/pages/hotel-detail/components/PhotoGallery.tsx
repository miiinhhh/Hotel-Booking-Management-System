import React, { useState } from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';

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
  const { t } = useLanguage();
  const [activeModalIndex, setActiveModalIndex] = useState<number | null>(null);

  const allImages = [
    { url: gallery.hero.url, caption: gallery.hero.caption },
    ...gallery.thumbnails,
  ];
  const thumbs = gallery.thumbnails.slice(0, 4);
  if (gallery.totalCount === 0) return <section className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant"><p>{t('detail.noPhotos')}</p></section>;

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
      {/* Lưới ảnh: 1 ảnh lớn + tối đa 4 ảnh nhỏ, tự co theo số ảnh thật */}
      <section className="relative">
        <div className={`grid h-[300px] gap-2 overflow-hidden rounded-2xl md:h-[440px] ${thumbs.length ? 'md:grid-cols-4 md:grid-rows-2' : ''}`}>
          <button type="button" onClick={() => setActiveModalIndex(0)}
            className={`group relative overflow-hidden bg-surface-container ${thumbs.length ? 'md:col-span-2 md:row-span-2' : ''} ${thumbs.length === 0 ? '' : ''}`}>
            <img src={gallery.hero.url} alt={gallery.hero.caption} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </button>
          {thumbs.map((item, idx) => (
            <button key={idx} type="button" onClick={() => setActiveModalIndex(idx + 1)}
              className={`group relative hidden overflow-hidden bg-surface-container md:block ${thumbs.length === 1 ? 'md:col-span-2 md:row-span-2' : thumbs.length === 2 ? 'md:col-span-2' : thumbs.length === 3 && idx === 2 ? 'md:col-span-2' : ''}`}>
              <img src={item.url} alt={item.caption} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </button>
          ))}
        </div>
        {gallery.totalCount > 1 && (
          <button type="button" onClick={() => setActiveModalIndex(0)}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-surface-container-lowest/95 px-4 py-2 text-sm font-semibold text-on-surface shadow-md hover:bg-surface-container-lowest">
            <span className="material-symbols-outlined text-[18px] text-primary">photo_library</span>
            {t('detail.viewAllPhotos', { count: gallery.totalCount })}
          </button>
        )}
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
              <span>{t('detail.close')}</span>
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
