import React, { useState, useEffect } from 'react';
import { discoveryApi } from '../../../services/discoveryApi';
import { useAuth } from '../../../context/AuthContext';
import { SELF_PERMISSIONS } from '../../../auth/permissions';
import { useLanguage } from '../../../i18n/LanguageContext';

interface BreadcrumbHeaderProps {
  hotelName: string;
  hotelId?: number;
  onNavigateHome?: () => void;
  onNavigateSearch?: () => void;
  isInitiallyFavorited?: boolean;
}

export const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({
  hotelName,
  hotelId,
  onNavigateHome,
  onNavigateSearch,
  isInitiallyFavorited = false,
}) => {
  const { session, hasPermission } = useAuth();
  const canUseWishlist = Boolean(session) && hasPermission(SELF_PERMISSIONS.wishlistManage);
  const [isFavorited, setIsFavorited] = useState(isInitiallyFavorited);
  const { t } = useLanguage();
  // null = nhãn mặc định "Chia sẻ"; chuỗi = trạng thái tạm thời sau khi bấm
  const [shareText, setShareText] = useState<string | null>(null);
  useEffect(() => { let alive = true; if (!canUseWishlist) return; discoveryApi.wishlist().then(items => { if (alive) setIsFavorited(items.some(item => item.hotelId === hotelId)); }).catch(() => {}); return () => { alive = false; }; }, [hotelId, canUseWishlist]);

  const [favoriteError, setFavoriteError] = useState('');
  const handleFavoriteClick = async () => {
    if (!hotelId) return;
    if (!session) { setFavoriteError(t('search.loginToSave')); return; }
    try { await discoveryApi.save(hotelId, !isFavorited); setIsFavorited(!isFavorited); setFavoriteError(''); }
    catch (error) { setFavoriteError(error instanceof Error ? error.message : t('search.saveFailed')); }
  };

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${hotelName} - StayLuxe`,
          text: t('detail.shareText', { name: hotelName }),
          url: window.location.href,
        });
      } catch {
        // Canceled share
      }
    } else {
      // Copy URL fallback
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareText(t('detail.linkCopied'));
        setTimeout(() => {
          setShareText(null);
        }, 2000);
      } catch {
        setShareText(t('detail.copyFailed'));
        setTimeout(() => {
          setShareText(null);
        }, 2000);
      }
    }
  };

  return (
    <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-xs">
      {/* Breadcrumb links */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center flex-wrap gap-2 text-on-surface-variant font-body-md text-body-md"
      >
        <button
          type="button"
          onClick={onNavigateHome}
          className="hover:text-primary transition-colors cursor-pointer border-0 bg-transparent p-0 text-inherit font-inherit"
        >{t('detail.home')}</button>
        <span className="material-symbols-outlined text-outline-variant text-[16px]">
          chevron_right
        </span>
        <button
          type="button"
          onClick={onNavigateSearch}
          className="hover:text-primary transition-colors cursor-pointer border-0 bg-transparent p-0 text-inherit font-inherit"
        >{t('detail.hotels')}</button>
        <span className="material-symbols-outlined text-outline-variant text-[16px]">
          chevron_right
        </span>
        <span className="hover:text-primary transition-colors cursor-pointer">{t('detail.details')}</span>
        <span className="material-symbols-outlined text-outline-variant text-[16px]">
          chevron_right
        </span>
        <span className="text-on-surface font-semibold truncate max-w-[240px] md:max-w-md">
          {hotelName}
        </span>
      </nav>

      {/* Action Buttons: Share & Favorite */}
      {favoriteError && <p role="alert">{favoriteError}</p>}
      <div className="flex items-center gap-space-xs self-end sm:self-auto">
        {onNavigateSearch && (
          <button
            type="button"
            onClick={onNavigateSearch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container hover:bg-surface-container-high transition-all text-on-surface font-label-md text-label-md cursor-pointer border-0 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">
              arrow_back
            </span>
            <span>{t('detail.backToList')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleShareClick}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all text-on-surface-variant hover:text-primary active:scale-95 cursor-pointer border-0"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
          <span className="font-label-md text-label-md">{shareText ?? t('detail.share')}</span>
        </button>

        {(!session || canUseWishlist) && <button
          type="button"
          onClick={handleFavoriteClick}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest shadow-sm hover:bg-surface-container-low transition-all text-on-surface-variant hover:text-primary active:scale-95 group cursor-pointer border-0"
        >
          <span
            className={`material-symbols-outlined text-[18px] transition-colors ${
              isFavorited
                ? 'text-primary'
                : 'group-hover:text-primary text-secondary'
            }`}
            style={{ fontVariationSettings: isFavorited ? "'FILL' 1" : "'FILL' 0" }}
          >
            {isFavorited ? 'favorite' : 'favorite_border'}
          </span>
          <span className="font-label-md text-label-md">
            {isFavorited ? t('detail.saved') : t('detail.save')}
          </span>
        </button>}
      </div>
    </section>
  );
};
export default BreadcrumbHeader;
