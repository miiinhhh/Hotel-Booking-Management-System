import React, { useState } from 'react';
import { CheckoutUrgencyBanner } from './components/CheckoutUrgencyBanner';
import { CheckoutStepper } from './components/CheckoutStepper';
import { ContactInfoSection } from './components/ContactInfoSection';
import { SpecialRequestsSection } from './components/SpecialRequestsSection';
import { PaymentMethodSection } from './components/PaymentMethodSection';
import { OrderSummaryCard } from './components/OrderSummaryCard';
import { DEFAULT_CHECKOUT_DATA } from './data/mockCheckoutData';
import { calculateBookingPrice } from '../../services/bookingApi';
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
  const [bookingData, setBookingData] = useState<CheckoutBookingData>(initialBookingData);

  const [contactInfo, setContactInfo] = useState<CheckoutContactInfo>({
    fullName: 'Nguyễn Văn An',
    phone: '+84 912 345 678',
    email: 'an.nguyen@example.com',
    isBookingForOther: false,
    otherGuestName: '',
  });

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

  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    try {
      const res = await calculateBookingPrice({
        checkInDate: '2026-11-01',
        checkOutDate: '2026-11-04',
        roomIds: [1],
        voucherCode: code.toUpperCase(),
        paymentMethod: 'Deposit',
      });

      if (res.success && res.data && res.data.discountAmount > 0) {
        const data = res.data;
        setBookingData((prev) => ({
          ...prev,
          couponCode: code.toUpperCase(),
          couponDiscount: data.discountAmount,
          totalPrice: data.totalAmount,
          depositAmount: data.depositAmount,
          remainingAmount: data.remainingAmount,
        }));
        return true;
      }
    } catch {
      // fallback below
    }

    if (code.toUpperCase() === 'STAYLUXEVIP' || code.toUpperCase() === 'LUXE2025' || code.toUpperCase() === 'SUMMER2026' || code.toUpperCase() === 'LUXE2026') {
      const discount = 1000000;
      const newTotal = Math.max(0, bookingData.originalPrice - discount);
      const newDeposit = Math.round((newTotal * bookingData.depositPercentage) / 100);
      setBookingData((prev) => ({
        ...prev,
        couponCode: code.toUpperCase(),
        couponDiscount: discount,
        totalPrice: newTotal,
        depositAmount: newDeposit,
        remainingAmount: newTotal - newDeposit,
      }));
      return true;
    }
    return false;
  };

  const handleConfirmBooking = () => {
    setIsSubmitting(true);
    setSubmissionStep(1);

    setTimeout(() => {
      setSubmissionStep(2);

      setTimeout(() => {
        setIsSubmitting(false);
        const generatedBookingCode = `#BK-${Math.floor(100000 + Math.random() * 900000)}`;
        if (onBookingSuccess) {
          onBookingSuccess(generatedBookingCode);
        } else {
          alert(
            `Chúc mừng ${contactInfo.fullName}! Đơn đặt phòng ${generatedBookingCode} đã được khởi tạo thành công.`
          );
        }
      }, 1500);
    }, 1500);
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
                isSubmitting={isSubmitting}
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
