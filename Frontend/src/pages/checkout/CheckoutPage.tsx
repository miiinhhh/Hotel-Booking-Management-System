import React, { useEffect, useState } from 'react';
import { offerApi } from '../../services/offerApi';
import { CheckoutStepper } from './components/CheckoutStepper';
import { ContactInfoSection } from './components/ContactInfoSection';
import { SpecialRequestsSection } from './components/SpecialRequestsSection';
import { PaymentMethodSection } from './components/PaymentMethodSection';
import { OrderSummaryCard } from './components/OrderSummaryCard';
import { DEFAULT_CHECKOUT_DATA } from './data/mockCheckoutData';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { vi } from '../../i18n/locales/vi';
import { usePriceCalculationQuery } from '../../hooks/useBookingQueries';
import { createBooking } from '../../services/bookingApi';
import { createVnPayPayment } from '../../services/paymentApi';
import {
  CheckoutBookingData,
  CheckoutContactInfo,
  PaymentMethodType,
  SpecialRequestOption,
} from './types';

interface CheckoutPageProps {
  initialBookingData?: CheckoutBookingData;
  onNavigateBack?: () => void;
  onBookingSuccess?: (bookingId: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  initialBookingData = DEFAULT_CHECKOUT_DATA,
  onNavigateBack,
  onBookingSuccess,
}) => {
  const { session, profile } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');
  // Mã được chọn từ trang Ưu đãi ("Dùng ngay") được tự áp dụng khi vào thanh toán.
  const [bookingData, setBookingData] = useState<CheckoutBookingData>(() => {
    const pending = offerApi.takePending();
    return pending ? { ...initialBookingData, couponCode: pending } : initialBookingData;
  });

  // Hook tính toán giá và voucher có cache thông minh và Invalidation bus
  const { calculatePrice, invalidateVoucherCache, isCalculating } = usePriceCalculationQuery();

  const [contactInfo, setContactInfo] = useState<CheckoutContactInfo>({
    fullName: profile?.fullName || session?.fullName || '',
    phone: profile?.phone || '',
    email: profile?.email || session?.email || '',
    isBookingForOther: false,
    otherGuestName: '',
  });

  useEffect(() => {
    if (!profile && !session) return;
    setContactInfo((current) => ({
      ...current,
      fullName: current.fullName || profile?.fullName || session?.fullName || '',
      phone: current.phone || profile?.phone || '',
      email: current.email || profile?.email || session?.email || '',
    }));
  }, [profile, session]);

  const [specialRequests, setSpecialRequests] = useState<SpecialRequestOption[]>([
    // Mặc định KHÔNG chọn gì — chỉ gửi yêu cầu khi khách tự chọn.
    { id: 'high_floor', label: vi['checkout.req.high_floor'], selected: false },
    { id: 'non_smoking', label: vi['checkout.req.non_smoking'], selected: false },
    { id: 'late_checkin', label: vi['checkout.req.late_checkin'], selected: false },
    { id: 'king_bed', label: vi['checkout.req.king_bed'], selected: false },
    { id: 'anniversary', label: vi['checkout.req.anniversary'], selected: false },
  ]);

  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodType>('qr_napas');

  const [vnpayQuote, setVnpayQuote] = useState<{ percent: number; amount: number; remaining: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(1);

  const handleToggleRequest = (id: string) => {
    setSpecialRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, selected: !req.selected } : req))
    );
  };

  const paymentMethod = selectedPaymentMethod === 'pay_at_hotel' ? 'Cash' : 'Deposit';
  // Đơn nhiều phòng cùng hạng: gửi đủ các phòng đã chọn.
  const bookingRoomIds = bookingData.roomIds && bookingData.roomIds.length ? bookingData.roomIds : bookingData.roomId ? [bookingData.roomId] : [];

  const applyPrice = (data: import('../../services/bookingApi').PriceCalculationResult, coupon = '') => {
    setBookingData((prev) => ({
      ...prev,
      originalPrice: data.subTotal + data.taxAmount + data.feeAmount,
      roomSubTotal: data.subTotal,
      feeAmount: data.feeAmount,
      feeRate: data.feeRate,
      taxAmount: data.taxAmount,
      taxRate: data.taxRate,
      couponCode: coupon,
      couponDiscount: data.discountAmount,
      totalPrice: data.totalAmount,
      depositPercentage: data.depositPercentage,
      depositAmount: data.depositAmount,
      remainingAmount: data.remainingAmount,
    }));
    // Giữ báo giá đặt cọc VNPay để thẻ VNPay không hiện "0%" khi khách đang chọn trả tại khách sạn.
    if (data.depositAmount > 0) setVnpayQuote({ percent: data.depositPercentage, amount: data.depositAmount, remaining: data.remainingAmount });
  };

  // Tính toán báo giá ban đầu và khi đổi phương thức thanh toán
  useEffect(() => {
    if (!bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) return;
    let active = true;

    calculatePrice({
      roomIds: bookingRoomIds,
      checkInDate: bookingData.checkIn,
      checkOutDate: bookingData.checkOut,
      paymentMethod,
      voucherCode: bookingData.couponCode || undefined,
    }).then((data) => {
      if (!active) return;
      if (data) {
        applyPrice(data, bookingData.couponCode);
        setError('');
      } else {
        setError(t('checkout.errPrice'));
      }
    });

    return () => {
      active = false;
    };
  }, [bookingData.roomId, bookingRoomIds.join(','), bookingData.checkIn, bookingData.checkOut, paymentMethod, calculatePrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Áp dụng Voucher với Cache Invalidation
  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    if (!bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) {
      setError(t('checkout.errChooseRoom'));
      return false;
    }

    const cleanCode = code.trim();
    if (!cleanCode) {
      // Hủy bỏ voucher
      invalidateVoucherCache();
      const fallbackData = await calculatePrice({
        roomIds: bookingRoomIds,
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        paymentMethod,
      });
      if (fallbackData) applyPrice(fallbackData, '');
      return true;
    }

    const data = await calculatePrice({
      roomIds: bookingRoomIds,
      checkInDate: bookingData.checkIn,
      checkOutDate: bookingData.checkOut,
      paymentMethod,
      voucherCode: cleanCode,
    });

    if (!data) {
      setError(t('checkout.errCoupon'));
      return false;
    }

    applyPrice(data, cleanCode);
    setError('');
    return true;
  };

  const handleConfirmBooking = async () => {
    if (isSubmitting || isCalculating) return;
    setError('');
    if (!bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) {
      setError(t('checkout.errRecheck'));
      return;
    }
    if (!contactInfo.fullName.trim() || !contactInfo.email.includes('@') || !contactInfo.phone.trim()) {
      setError(t('checkout.errContact'));
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep(1);
    try {
      const result = await createBooking({
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        numberOfGuests: bookingData.numberOfGuests || 1,
        paymentMethod,
        voucherCode: bookingData.couponCode || undefined,
        specialRequests: [...specialRequests.filter((r) => r.selected).map((r) => r.label), additionalNotes]
          .filter(Boolean)
          .join('; '),
        rooms: bookingRoomIds.map((roomId) => ({ roomId })),
        guests: [
          {
            fullName: contactInfo.isBookingForOther
              ? contactInfo.otherGuestName || contactInfo.fullName
              : contactInfo.fullName,
            phone: contactInfo.phone,
            email: contactInfo.email,
            isPrimaryGuest: true,
          },
        ],
      });

      setSubmissionStep(2);

      // Nếu phương thức là Deposit: tự động chuyển sang cổng VNPay Sandbox
      if (paymentMethod === 'Deposit') {
        const vnpayRes = await createVnPayPayment(result.bookingId, 'Deposit');
        if (vnpayRes.success && vnpayRes.data?.paymentUrl) {
          window.location.href = vnpayRes.data.paymentUrl;
          return;
        } else {
          setError(vnpayRes.message || t('checkout.errVnpay'));
          return;
        }
      }

      if (onBookingSuccess) onBookingSuccess(result.bookingCode);
      else setError(t('checkout.createdCash', { code: result.bookingCode }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('checkout.errCreate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!bookingData.roomId) {
    return (
      <main className="w-full pt-32 pb-16 bg-background min-h-screen px-5">
        <div className="mx-auto max-w-lg rounded-2xl bg-surface-container-lowest p-10 text-center shadow-sm">
          <span className="material-symbols-outlined text-5xl text-outline-variant">bed</span>
          <p className="mt-3 text-on-surface">{t('checkout.noRoom')}</p>
          {onNavigateBack && (
            <button type="button" onClick={onNavigateBack} className="mt-5 rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary">{t('checkout.findRoom')}</button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full pt-20 bg-background min-h-screen">
      <div className="flex flex-col w-full relative">
        {/* Subtle Decorative Architectural Glow */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute -top-32 right-1/4 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-96 -left-20 w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

          {/* Main 1440px Wrapper */}
          <div className="max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin py-space-md md:py-space-lg flex flex-col gap-space-lg">
            {/* Top Urgency Banner with Live Countdown */}
            {error && <p role="alert" className="rounded-2xl bg-error-container p-4 text-on-error-container">{error}</p>}

            {/* Stepper & Headline Area */}
            <CheckoutStepper onBackToHotel={onNavigateBack} />

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
              {/* Left Column: Form & Requests & Methods (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-space-md">
                {/* Section 1: Guest Contact Info */}
                <ContactInfoSection
                  contactInfo={contactInfo}
                  onChange={setContactInfo}
                />

                {/* Section 2: Special Requests */}
                <SpecialRequestsSection
                  requests={specialRequests}
                  onToggleRequest={handleToggleRequest}
                  additionalNotes={additionalNotes}
                  onNotesChange={setAdditionalNotes}
                />

                {/* Section 3: Secure Payment Methods */}
                <PaymentMethodSection
                  selectedMethod={selectedPaymentMethod}
                  onSelectMethod={setSelectedPaymentMethod}
                  depositAmount={vnpayQuote?.amount ?? bookingData.depositAmount}
                  remainingAmount={vnpayQuote?.remaining ?? bookingData.remainingAmount}
                  depositPercentage={vnpayQuote?.percent ?? bookingData.depositPercentage}
                />
              </div>

              {/* Right Column: Sticky Summary Panel (5 Cols) */}
              <OrderSummaryCard
                bookingData={bookingData}
                selectedPaymentMethod={selectedPaymentMethod}
                onApplyCoupon={handleApplyCoupon}
                onConfirmBooking={handleConfirmBooking}
                isSubmitting={isSubmitting || isCalculating}
                submissionStep={submissionStep}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CheckoutPage;
