import React, { useEffect, useState } from 'react';
import { CheckoutUrgencyBanner } from './components/CheckoutUrgencyBanner';
import { CheckoutStepper } from './components/CheckoutStepper';
import { ContactInfoSection } from './components/ContactInfoSection';
import { SpecialRequestsSection } from './components/SpecialRequestsSection';
import { PaymentMethodSection } from './components/PaymentMethodSection';
import { OrderSummaryCard } from './components/OrderSummaryCard';
import { DEFAULT_CHECKOUT_DATA } from './data/mockCheckoutData';
import { useAuth } from '../../context/AuthContext';
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
  const [error, setError] = useState('');
  const [bookingData, setBookingData] = useState<CheckoutBookingData>(initialBookingData);

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
    { id: 'high_floor', label: 'Tầng cao hướng biển', selected: true },
    { id: 'non_smoking', label: 'Phòng không hút thuốc', selected: true },
    { id: 'late_checkin', label: 'Check-in muộn (Sau 18:00)', selected: false },
    { id: 'king_bed', label: 'Giường King cỡ lớn', selected: false },
    { id: 'anniversary', label: 'Kỷ niệm ngày cưới / Trăng mật', selected: false },
  ]);

  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodType>('qr_napas');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(1);

  const handleToggleRequest = (id: string) => {
    setSpecialRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, selected: !req.selected } : req))
    );
  };

  const paymentMethod = selectedPaymentMethod === 'pay_at_hotel' ? 'Cash' : 'Deposit';

  const applyPrice = (data: import('../../services/bookingApi').PriceCalculationResult, coupon = '') => {
    setBookingData((prev) => ({
      ...prev,
      originalPrice: data.subTotal + data.taxAmount + data.feeAmount,
      couponCode: coupon,
      couponDiscount: data.discountAmount,
      totalPrice: data.totalAmount,
      depositPercentage: data.depositPercentage,
      depositAmount: data.depositAmount,
      remainingAmount: data.remainingAmount,
    }));
  };

  // Tính toán báo giá ban đầu và khi đổi phương thức thanh toán
  useEffect(() => {
    if (!bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) return;
    let active = true;

    calculatePrice({
      roomIds: [bookingData.roomId],
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
        setError('Không thể tính toán giá phòng cho ngày đã chọn.');
      }
    });

    return () => {
      active = false;
    };
  }, [bookingData.roomId, bookingData.checkIn, bookingData.checkOut, paymentMethod, calculatePrice]);

  // Áp dụng Voucher với Cache Invalidation
  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    if (!bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) {
      setError('Chọn phòng và ngày lưu trú trước.');
      return false;
    }

    const cleanCode = code.trim();
    if (!cleanCode) {
      // Hủy bỏ voucher
      invalidateVoucherCache();
      const fallbackData = await calculatePrice({
        roomIds: [bookingData.roomId],
        checkInDate: bookingData.checkIn,
        checkOutDate: bookingData.checkOut,
        paymentMethod,
      });
      if (fallbackData) applyPrice(fallbackData, '');
      return true;
    }

    const data = await calculatePrice({
      roomIds: [bookingData.roomId],
      checkInDate: bookingData.checkIn,
      checkOutDate: bookingData.checkOut,
      paymentMethod,
      voucherCode: cleanCode,
    });

    if (!data) {
      setError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
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
      setError('Vui lòng quay lại kiểm tra phòng trống và chọn phòng thực tế.');
      return;
    }
    if (!contactInfo.fullName.trim() || !contactInfo.email.includes('@') || !contactInfo.phone.trim()) {
      setError('Nhập đầy đủ họ tên, email và số điện thoại liên hệ.');
      return;
    }
    if (selectedPaymentMethod === 'card_international') {
      setError('Thanh toán thẻ quốc tế chưa được hỗ trợ. Vui lòng chọn phương thức khác.');
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
        rooms: [{ roomId: bookingData.roomId }],
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
          setError(vnpayRes.message || 'Không thể tạo liên kết thanh toán VNPay.');
          return;
        }
      }

      if (onBookingSuccess) onBookingSuccess(result.bookingCode);
      else alert(`Đã tạo booking ${result.bookingCode}. Vui lòng hoàn tất thanh toán tiền mặt khi nhận phòng.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tạo được booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {error && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
            <CheckoutUrgencyBanner />

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
                  depositAmount={bookingData.depositAmount}
                  remainingAmount={bookingData.remainingAmount}
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
