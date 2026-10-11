import React, { useState } from 'react';
import { BreadcrumbHeader } from './components/BreadcrumbHeader';
import { HotelShowcase } from './components/HotelShowcase';
import { PhotoGallery } from './components/PhotoGallery';
import { StickyActionBar } from './components/StickyActionBar';
import { ResortAmenities } from './components/ResortAmenities';
import { RoomInventory } from './components/RoomInventory';
import { HotelPolicies } from './components/HotelPolicies';
import { RoomDetailModal } from './components/RoomDetailModal';
import { MOCK_HOTEL_DETAIL } from './data/mockHotelDetail';
import { HotelDetail, Room } from './types';

interface HotelDetailPageProps {
  hotelData?: HotelDetail;
  onNavigateHome?: () => void;
  onNavigateSearch?: () => void;
}

export const HotelDetailPage: React.FC<HotelDetailPageProps> = ({
  hotelData = MOCK_HOTEL_DETAIL,
  onNavigateHome,
  onNavigateSearch,
}) => {
  const [selectedRoomForModal, setSelectedRoomForModal] = useState<Room | null>(
    null
  );
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(
    null
  );

  const handleBookRoom = (
    room: Room,
    _selectedPackageId?: string,
    totalPrice?: number
  ) => {
    const formattedPrice = totalPrice?.toLocaleString('vi-VN') || '';
    setBookingSuccessMessage(
      `Đã chọn đặt "${room.name}" thành công! Tổng giá: ${formattedPrice}₫ cho ${hotelData.durationNights} đêm.`
    );
    setTimeout(() => {
      setBookingSuccessMessage(null);
    }, 4000);
  };

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full relative">
        {/* Subtle Architectural Atmospheric Glow */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 right-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-96 -left-20 w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

          {/* Main Container */}
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-md flex flex-col gap-space-lg">
            {/* Booking Toast Alert */}
            {bookingSuccessMessage && (
              <div className="fixed top-24 right-6 z-50 bg-primary-container text-on-primary px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fadeIn">
                <span className="material-symbols-outlined text-[24px]">
                  check_circle
                </span>
                <span className="font-body-md text-body-md font-medium">
                  {bookingSuccessMessage}
                </span>
                <button
                  type="button"
                  onClick={() => setBookingSuccessMessage(null)}
                  className="ml-2 text-on-primary/80 hover:text-on-primary border-0 bg-transparent cursor-pointer p-0"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>
              </div>
            )}

            {/* Breadcrumbs & Quick Share/Save Actions */}
            <BreadcrumbHeader
              hotelName={hotelData.name}
              onNavigateHome={onNavigateHome}
              onNavigateSearch={onNavigateSearch}
            />

            {/* Hotel Header Showcase Section */}
            <HotelShowcase
              name={hotelData.name}
              categoryTag={hotelData.categoryTag}
              starRating={hotelData.starRating}
              address={hotelData.address}
              distanceToBeach={hotelData.distanceToBeach}
              ratingScore={hotelData.ratingScore}
              ratingText={hotelData.ratingText}
              reviewCount={hotelData.reviewCount}
            />

            {/* Mosaic Photo Gallery */}
            <PhotoGallery gallery={hotelData.galleryImages} />

            {/* Sticky Quick Info & Direct Room Action Bar */}
            <StickyActionBar
              checkInTime={hotelData.checkInTime}
              checkOutTime={hotelData.checkOutTime}
              cancelPolicySummary={hotelData.cancelPolicySummary}
              datesText={hotelData.datesText}
            />

            {/* Highlight Overview & Signature Resort Amenities */}
            <ResortAmenities amenities={hotelData.resortAmenities} />

            {/* Room Types Inventory */}
            <RoomInventory
              rooms={hotelData.rooms}
              datesText={hotelData.datesText}
              durationNights={hotelData.durationNights}
              guestsText={hotelData.guestsText}
              onBookRoom={handleBookRoom}
              onViewRoomDetail={(room) => setSelectedRoomForModal(room)}
            />

            {/* Policies & Resort Commitments Section */}
            <HotelPolicies />
          </div>
        </div>

        {/* Room Detail Modal */}
        <RoomDetailModal
          room={selectedRoomForModal}
          onClose={() => setSelectedRoomForModal(null)}
          onSelectBook={(room) => handleBookRoom(room)}
        />
      </div>
    </main>
  );
};
export default HotelDetailPage;
