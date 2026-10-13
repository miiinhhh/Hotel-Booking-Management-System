import React, { useState, useEffect, useMemo } from 'react';
import { BookingItem } from '../types';

export interface ReviewStayModalProps {
  isOpen: boolean;
  booking: BookingItem | null;
  onClose: () => void;
  onSubmitReview: (
    bookingId: string,
    rating: number,
    comment: string,
    reviewData?: {
      criteria: Record<string, number>;
      selectedTags: string[];
      photos: { id: string; url: string; caption: string }[];
      isPublicName: boolean;
    }
  ) => void;
}

interface PhotoItem {
  id: string;
  url: string;
  caption: string;
}

export const ReviewStayModal: React.FC<ReviewStayModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSubmitReview,
}) => {
  // Overall rating
  const [overallRating, setOverallRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Criteria ratings (5 categories)
  const [criteriaRatings, setCriteriaRatings] = useState({
    cleanliness: 5,
    location: 5,
    service: 5,
    facilities: 5,
    value: 5,
  });

  // Review comment
  const [comment, setComment] = useState(
    'Kỳ nghỉ 3 ngày 2 đêm tại Biệt thự hồ bơi riêng thực sự vượt ngoài mong đợi! Không gian trúc xanh mát, hồ bơi riêng biệt lập hoàn toàn và dịch vụ Pure Spa miễn phí hàng ngày rất chu đáo. Bữa sáng tại nhà hàng Hay Hay rất đa dạng món Việt truyền thống.'
  );

  // Quick tags
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Bể bơi riêng đẹp',
    'Bữa sáng phong phú',
  ]);

  // Uploaded photos
  const [photos, setPhotos] = useState<PhotoItem[]>([
    {
      id: 'photo-1',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQG0FXQsjtwrn2gWW4hSCTVdN9dk3Eald5DfFLJ1Xw6OqyTTP5FNEsZMBDQVvFNQ_rg2OnuHS6j3U-wadFQroKHrHatB7urGox5wn_TZ1qF1to7P5IBjPxjVu7-5HHq8dlQK2GJgSCxqlCWCY2mKurSSed37tMIBy_7RYc0qxGRpVMGmNsd46aH6OMQzRc1DqJzJ0jKW3wEIxXH6NXO4K0PtBBQITN810tYcQQsmg0',
      caption: 'Hồ bơi villa',
    },
    {
      id: 'photo-2',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKh-E3pVGIjG1hect85jeOxsTtItlE2H_-6IDhR9YfY9RTbeu0QV3B42o36qdjP91YWo9SrRWj8W0FmRJe8ofzvOCsP-6AkUEKb8ypUMxcUD63ggYgeufqCMO4Y727qwbHWqyGYzh8VdCMlOwdVGZYcMwNLRDzo1Hyh4petAgTh01WS4k1zat3YYqZDp0Nm2a026iBdwbbLyMYUFt2I1dHmeuLymMlNR2DFgXDWVgK',
      caption: 'Bữa sáng',
    },
    {
      id: 'photo-3',
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDbFiV4I8alKcG4a9so3YhWkbutoLBa8HWFZ7XGdLpwZr3ZK0VbIL1flTEXloIpOo0KIllEUYC47vN2YDjkPW7ic5gKDujctl1KhYSYjPXNNmv9N-GS9KETewaXlhu0L2TShCEp3vXZlO6Tlkn96-X2CNWeeh1gA0lIlb1jljIDj-283zwJoG7oE04oXhA7jeISD_vPn4f5zBaKeXD2E_M_nzxm0PIt_ZEm0XnSN4IU',
      caption: 'Pure Spa',
    },
  ]);

  // Privacy toggle
  const [isPublicName, setIsPublicName] = useState(true);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or preset when booking changes
  useEffect(() => {
    if (booking) {
      setOverallRating(5);
      setCriteriaRatings({
        cleanliness: 5,
        location: 5,
        service: 5,
        facilities: 5,
        value: 5,
      });
      setSelectedTags(['Bể bơi riêng đẹp', 'Bữa sáng phong phú']);
      setIsPublicName(true);
      setIsSubmitting(false);
    }
  }, [booking]);

  // Calculate dynamic criteria average
  const averageCriteriaScore = useMemo(() => {
    const values = Object.values(criteriaRatings);
    const sum = values.reduce((acc, curr) => acc + curr, 0);
    return (sum / values.length).toFixed(1);
  }, [criteriaRatings]);

  if (!isOpen || !booking) return null;

  // Text label based on current rating
  const getRatingBadgeText = (score: number) => {
    switch (score) {
      case 5:
        return '5/5 sao · Tuyệt vời & Vượt mong đợi';
      case 4:
        return '4/5 sao · Rất hài lòng & Dịch vụ tốt';
      case 3:
        return '3/5 sao · Hài lòng & Đạt yêu cầu';
      case 2:
        return '2/5 sao · Cần cải thiện dịch vụ';
      default:
        return '1/5 sao · Chưa hài lòng';
    }
  };

  const getRatingSentimentIcon = (score: number) => {
    switch (score) {
      case 5:
        return 'sentiment_very_satisfied';
      case 4:
        return 'sentiment_satisfied';
      case 3:
        return 'sentiment_neutral';
      case 2:
        return 'sentiment_dissatisfied';
      default:
        return 'sentiment_very_dissatisfied';
    }
  };

  // Quick tag list
  const availableTags = [
    'Không gian yên tĩnh',
    'Nhân viên nhiệt tình',
    'Bể bơi riêng đẹp',
    'Bữa sáng phong phú',
    'Spa Pure thư giãn',
  ];

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleAddSamplePhoto = () => {
    if (photos.length >= 6) {
      alert('Bạn chỉ có thể tải lên tối đa 6 ảnh.');
      return;
    }
    const sampleImages = [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKJiFktCkZPVtynmzSfxjtPMkS9ieT6CiRpM5pbEUgAZzobcsaNYWYKblTOOVrrSypt7kTHRzh-WCu_2iBrzQL8i3JglnmdfXvaQpulEtgas5H9ASO1od6hNckPpmdnZjtLGxmQ-CaQoIjHf944Yn6VHOX989tTioSEu-_QsDHrna6diiVGVtrMGQIt0VX6xhwrP97MiXmtN0EpwGZ6SkagfWl4H9vroKQrlHlvnqe',
        caption: 'Toàn cảnh resort',
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDQutWN_l85U5jeyWFUjm0ljvG3Pwr5d0PCfmzCYADgvSReJmb5SJVYPwU9GmvfkFNrnE93jsdp7ZoMeavq55AuxrBhLH_GxoJbtwIROKiycetLYbe_1g9vTV4vzGlBhWnHeXT36z6kHMBc_OfGV9VDIHD5xKOQPFbk0kfIHR5AIAvnHRgH2lhGpN1DkJe8B2huzuQ8a101R_ykgWmcTyzeBZLhzOQsTBQlBpkl9m0D',
        caption: 'Phòng ngủ sang trọng',
      },
    ];
    const newSample = sampleImages[photos.length % sampleImages.length];
    setPhotos([
      ...photos,
      {
        id: `photo-${Date.now()}`,
        url: newSample.url,
        caption: newSample.caption,
      },
    ]);
  };

  const handleCriteriaChange = (key: keyof typeof criteriaRatings, star: number) => {
    setCriteriaRatings((prev) => ({
      ...prev,
      [key]: star,
    }));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitReview(booking.id, overallRating, comment, {
        criteria: criteriaRatings,
        selectedTags,
        photos,
        isPublicName,
      });
      setIsSubmitting(false);
    }, 600);
  };

  const currentDisplayRating = hoverRating || overallRating;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* UNDERLYING CONTEXTUAL AMBIENT BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none filter blur-sm scale-[1.01] select-none opacity-40">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDKJiFktCkZPVtynmzSfxjtPMkS9ieT6CiRpM5pbEUgAZzobcsaNYWYKblTOOVrrSypt7kTHRzh-WCu_2iBrzQL8i3JglnmdfXvaQpulEtgas5H9ASO1od6hNckPpmdnZjtLGxmQ-CaQoIjHf944Yn6VHOX989tTioSEu-_QsDHrna6diiVGVtrMGQIt0VX6xhwrP97MiXmtN0EpwGZ6SkagfWl4H9vroKQrlHlvnqe')`,
          }}
        />
      </div>

      {/* Dimmed luxury overlay */}
      <div
        className="fixed inset-0 z-10 bg-on-surface/40 backdrop-blur-md transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* MODAL CONTAINER DIALOG */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-3 sm:p-6 md:p-10 pointer-events-none">
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all transform animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
          {/* MODAL HEADER */}
          <div className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-sm border-b border-surface-container-high px-6 sm:px-8 py-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary-fixed/50 px-2.5 py-0.5 rounded-full">
                  <span
                    className="material-symbols-outlined text-[14px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  Đặt phòng đã hoàn thành
                </span>
                <span className="text-xs text-outline font-medium">
                  Mã: {booking.bookingCode || '#SL-88492'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-headline-sm text-on-surface mt-1.5 tracking-tight">
                Đánh giá kỳ nghỉ của bạn
              </h2>
              <p className="text-secondary text-xs sm:text-sm font-body-md mt-0.5 flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-sm text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  villa
                </span>
                <span>
                  {booking.hotelName} · {booking.roomType}
                </span>
              </p>
            </div>

            {/* Close modal button */}
            <button
              aria-label="Đóng hộp thoại"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors shadow-sm focus:outline-none cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* MODAL BODY SCROLLABLE */}
          <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-7 custom-scrollbar flex-1">
            {/* SECTION 1: OVERALL RATING */}
            <div className="bg-surface-container-low/70 rounded-2xl p-6 text-center border border-outline-variant/30 flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-outline mb-2">
                Trải nghiệm tổng quan
              </p>

              {/* 5 Big Star Selector */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 my-2" id="star-selector">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= currentDisplayRating;
                  return (
                    <button
                      key={star}
                      aria-label={`${star} sao`}
                      type="button"
                      onClick={() => setOverallRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="group focus:outline-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <span
                        className={`material-symbols-outlined text-3xl sm:text-4xl transition-colors ${
                          isFilled ? 'text-primary-container' : 'text-surface-container-highest'
                        }`}
                        style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic highlight badge */}
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary-fixed/60 border border-secondary-fixed-dim/40 text-on-secondary-fixed text-xs sm:text-sm font-semibold shadow-sm">
                <span
                  className="material-symbols-outlined text-primary text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {getRatingSentimentIcon(currentDisplayRating)}
                </span>
                <span>{getRatingBadgeText(currentDisplayRating)}</span>
              </div>
            </div>

            {/* SECTION 2: DETAILED CRITERIA GRID (2 COLUMNS) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">tune</span>
                  Chi tiết theo tiêu chí
                </h3>
                <span className="text-xs text-outline font-medium">
                  Trung bình: {averageCriteriaScore} / 5.0
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Item 1: Cleanliness */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">cleaning_services</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Sạch sẽ &amp; Vệ sinh</p>
                      <p className="text-[11px] text-outline">Độ tinh tươm, buồng phòng</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('cleanliness', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.cleanliness
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.cleanliness ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 2: Location & Landscape */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">landscape</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Vị trí &amp; Cảnh quan</p>
                      <p className="text-[11px] text-outline">Bãi biển, khu nghỉ dưỡng</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('location', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.location
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.location ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 3: Service & Staff */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">room_service</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Chất lượng dịch vụ</p>
                      <p className="text-[11px] text-outline">Thân thiện, hỗ trợ tận tâm</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('service', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.service
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.service ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 4: Facilities & Villa */}
                <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">pool</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Tiện nghi &amp; Phòng ốc</p>
                      <p className="text-[11px] text-outline">Hồ bơi riêng, giường ngủ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('facilities', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.facilities
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.facilities ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item 5: Value for money */}
                <div className="sm:col-span-2 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-base">loyalty</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface">Đáng giá tiền</p>
                      <p className="text-[11px] text-outline">
                        Xứng đáng với chi phí &amp; tiêu chuẩn 5 sao
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 text-primary-container">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCriteriaChange('value', s)}
                        className="cursor-pointer hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            s <= criteriaRatings.value
                              ? 'text-primary-container'
                              : 'text-surface-container-highest'
                          }`}
                          style={{
                            fontVariationSettings:
                              s <= criteriaRatings.value ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: DETAILED REVIEW TEXTAREA & QUICK TAGS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5"
                  htmlFor="review-content"
                >
                  <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                  Chia sẻ trải nghiệm chi tiết
                </label>
                <span className="text-[11px] text-outline" id="char-count">
                  {comment.length} / 1000 ký tự
                </span>
              </div>

              {/* Quick tag suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`text-[11px] font-medium px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-secondary-fixed/40 text-on-secondary-fixed border border-secondary-fixed-dim/60 font-semibold'
                          : 'bg-surface-container hover:bg-secondary-fixed/50 hover:text-on-secondary-fixed text-on-surface-variant border border-outline-variant/40'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-xs text-primary"
                        style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {isSelected ? 'check' : 'add'}
                      </span>
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  id="review-content"
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn về phòng ốc, dịch vụ, nhân viên hoặc những điều bạn ấn tượng nhất trong kỳ nghỉ..."
                  className="w-full rounded-2xl border border-outline-variant/60 focus:border-primary focus:ring-1 focus:ring-primary p-4 text-on-surface bg-surface-container-low/40 text-xs sm:text-sm placeholder:text-outline/70 leading-relaxed transition resize-none outline-none"
                />
              </div>
            </div>

            {/* SECTION 4: REAL PHOTO UPLOADS WITH PREVIEWS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-primary">
                    photo_camera
                  </span>
                  Hình ảnh thực tế từ chuyến đi
                </span>
                <span className="text-[11px] text-outline font-medium">
                  Đã chọn {photos.length} / 6 ảnh
                </span>
              </div>

              {/* Upload Container & Thumbnail Gallery */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden aspect-square border border-outline-variant/50 shadow-sm bg-surface-container"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="w-7 h-7 rounded-full bg-surface-container-lowest/90 text-error hover:bg-error hover:text-white flex items-center justify-center transition-colors shadow cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
                      {photo.caption}
                    </span>
                  </div>
                ))}

                {/* Add More Slot */}
                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddSamplePhoto}
                    className="border-2 border-dashed border-outline-variant hover:border-primary rounded-xl aspect-square flex flex-col items-center justify-center p-2 text-center bg-surface-container-low/50 hover:bg-primary-fixed/20 transition group focus:outline-none cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-container group-hover:bg-primary-container group-hover:text-white text-primary flex items-center justify-center mb-1 transition-colors">
                      <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                    </div>
                    <span className="text-xs font-semibold text-on-surface group-hover:text-primary">
                      Thêm ảnh
                    </span>
                    <span className="text-[10px] text-outline mt-0.5">Tối đa 6 ảnh</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-outline text-center sm:text-left flex items-center justify-center sm:justify-start gap-1">
                <span className="material-symbols-outlined text-[13px]">info</span>
                Hỗ trợ định dạng JPG, PNG hoặc HEIC dung lượng tối đa 10MB mỗi ảnh.
              </p>
            </div>

            {/* SECTION 5: PRIVACY / ANONYMOUS DISPLAY OPTION */}
            <div className="bg-surface-container-low/50 rounded-xl p-3.5 border border-outline-variant/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <span className="material-symbols-outlined text-base">person</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface">
                    Hiển thị tên người đánh giá
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {isPublicName ? (
                      <>
                        Hiển thị công khai là:{' '}
                        <strong className="text-on-surface">
                          {booking.guest?.name || 'Nguyễn Văn An'}
                        </strong>{' '}
                        (Thành viên Diamond)
                      </>
                    ) : (
                      <>Đánh giá sẽ được hiển thị ẩn danh với du khách khác</>
                    )}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicName}
                  onChange={(e) => setIsPublicName(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-dim after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>

          {/* MODAL STICKY FOOTER ACTIONS */}
          <div className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-sm border-t border-surface-container-high px-6 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-outline text-center sm:text-left hidden sm:flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-xs text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                security
              </span>
              Đánh giá được xác thực bởi thuật toán minh bạch StayLuxe.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors focus:outline-none cursor-pointer"
              >
                Hủy &amp; Để sau
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-1/2 sm:w-auto px-7 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/95 text-on-primary shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <span>Gửi đánh giá</span>
                    <span className="material-symbols-outlined text-base">send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewStayModal;
