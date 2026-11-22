import React, { useState } from 'react';
import { BreadcrumbHeader } from './components/BreadcrumbHeader';
import { HotelShowcase } from './components/HotelShowcase';
import { PhotoGallery } from './components/PhotoGallery';
import { StickyActionBar } from './components/StickyActionBar';
import { ResortAmenities } from './components/ResortAmenities';
import { RoomInventory } from './components/RoomInventory';
import { HotelPolicies } from './components/HotelPolicies';
import { RoomDetailModal } from './components/RoomDetailModal';
import { HotelDetail, Room } from './types';
import { useLanguage, formatMoney } from '../../i18n/LanguageContext';

interface HotelDetailPageProps {
  hotelData: HotelDetail;
  onNavigateHome?: () => void;
  onNavigateSearch?: () => void;
  onNavigateCheckout?: (room?: Room, totalPrice?: number) => void;
}

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' });
};

/**
 * Trang khách sạn: tiêu đề → bộ ảnh → thanh mục dính (Tổng quan / Phòng / Tiện ích / Chính sách)
 * → nội dung 2 cột, cột phải là thẻ giá + nút "Xem phòng trống" luôn hiển thị khi cuộn.
 */
export const HotelDetailPage: React.FC<HotelDetailPageProps> = ({ hotelData, onNavigateHome, onNavigateSearch, onNavigateCheckout }) => {
  const { t, locale } = useLanguage();
  const [selectedRoomForModal, setSelectedRoomForModal] = useState<Room | null>(null);
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  const prices = hotelData.rooms.flatMap(r => r.packages?.map(p => p.pricePerNight) ?? []).filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const fmtDate = (iso?: string) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—');

  const handleBookRoom = (room: Room, _selectedPackageId?: string, totalPrice?: number) => {
    if (onNavigateCheckout) {
      const nights = room.checkIn && room.checkOut ? Math.round((Date.parse(room.checkOut) - Date.parse(room.checkIn)) / 86400000) : 1;
      onNavigateCheckout(room, totalPrice ?? (room.packages?.[0]?.pricePerNight || 0) * nights);
      return;
    }
    setBookingSuccessMessage(t('detail.bookedToast', { room: room.name, price: formatMoney(totalPrice ?? 0, locale), nights: hotelData.durationNights }));
    setTimeout(() => setBookingSuccessMessage(null), 4000);
  };

  return (
    <main className="min-h-screen w-full bg-background pb-16 pt-20">
      {bookingSuccessMessage && (
        <div role="status" className="fixed right-6 top-24 z-50 flex items-center gap-3 rounded-2xl bg-inverse-surface px-5 py-3 text-inverse-on-surface shadow-xl">
          <span className="material-symbols-outlined">check_circle</span>{bookingSuccessMessage}
        </div>
      )}

      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pt-4">
        <BreadcrumbHeader hotelName={hotelData.name} hotelId={Number(hotelData.id)} onNavigateHome={onNavigateHome} onNavigateSearch={onNavigateSearch} />

        <div id="overview">
          <HotelShowcase name={hotelData.name} starRating={hotelData.starRating} address={hotelData.address}
            ratingScore={hotelData.ratingScore} reviewCount={hotelData.reviewCount} />
        </div>

        <PhotoGallery gallery={hotelData.galleryImages} />

        <StickyActionBar onJump={scrollToId} minPrice={minPrice} />

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          {/* Nội dung chính */}
          <div className="flex min-w-0 flex-col gap-10">
            <section aria-labelledby="highlights-title" className="grid gap-3 sm:grid-cols-3">
              <h2 id="highlights-title" className="sr-only">{t('detail.highlights')}</h2>
              {[
                { icon: 'login', label: t('detail.checkIn'), value: hotelData.checkInTime || t('detail.contactHotel') },
                { icon: 'logout', label: t('detail.checkOut'), value: hotelData.checkOutTime || t('detail.contactHotel') },
                { icon: 'policy', label: t('detail.cancelPolicy'), value: hotelData.cancelPolicySummary || t('detail.noCancelPolicy') },
              ].map(item => (
                <div key={item.label} className="flex gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
                  <span className="material-symbols-outlined text-primary">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-on-surface-variant">{item.label}</p>
                    <p className="line-clamp-2 text-sm font-semibold text-on-surface" title={item.value}>{item.value}</p>
                  </div>
                </div>
              ))}
            </section>

            <div id="rooms">
              <RoomInventory
                hotelId={Number(hotelData.id) > 0 ? Number(hotelData.id) : undefined}
                rooms={hotelData.rooms}
                initialCheckIn={hotelData.checkIn}
                initialCheckOut={hotelData.checkOut}
                initialGuests={hotelData.guestsPerRoom}
                datesText={hotelData.datesText}
                durationNights={hotelData.durationNights}
                guestsText={hotelData.guestsText}
                onBookRoom={handleBookRoom}
                onViewRoomDetail={(room) => setSelectedRoomForModal(room)}
              />
            </div>

            <div id="amenities"><ResortAmenities amenities={hotelData.resortAmenities} /></div>

            <div id="policies"><HotelPolicies policy={hotelData.cancelPolicySummary} checkIn={hotelData.checkInTime} checkOut={hotelData.checkOutTime} /></div>
          </div>

          {/* Thẻ giá bám theo khi cuộn */}
          <aside className="lg:sticky lg:top-40">
            <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-md">
              {minPrice > 0 && (
                <p className="text-sm text-on-surface-variant">{t('detail.priceFrom')}
                  <span className="ml-1 text-2xl font-bold text-on-surface">{formatMoney(minPrice, locale)}</span>
                  <span className="ml-1">{t('detail.perNight')}</span>
                </p>
              )}
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('detail.yourStay')}</p>
              <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-2xl border border-outline-variant/50">
                <div className="border-r border-outline-variant/50 p-3">
                  <p className="text-xs text-on-surface-variant">{t('detail.checkIn')}</p>
                  <p className="font-semibold text-on-surface">{fmtDate(hotelData.checkIn)}</p>
                </div>
                <div className="p-3">
                  <p className="text-xs text-on-surface-variant">{t('detail.checkOut')}</p>
                  <p className="font-semibold text-on-surface">{fmtDate(hotelData.checkOut)}</p>
                </div>
              </div>
              <button type="button" onClick={() => scrollToId('rooms')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-on-primary transition-opacity hover:opacity-90">
                {t('detail.seeRooms')}<span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              </button>
              {hotelData.cancelPolicySummary && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                  <span className="line-clamp-3">{hotelData.cancelPolicySummary}</span>
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <RoomDetailModal room={selectedRoomForModal} onClose={() => setSelectedRoomForModal(null)} onSelectBook={(room) => handleBookRoom(room)} />
    </main>
  );
};
export default HotelDetailPage;
