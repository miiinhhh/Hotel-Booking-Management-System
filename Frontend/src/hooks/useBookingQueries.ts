import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClient } from './useQueryCache';
import {
  getBookingsList,
  cancelBooking,
  calculateBookingPrice,
  CalculatePriceRequest,
  PriceCalculationResult,
  BookingListDto,
} from '../services/bookingApi';
import { BookingItem } from '../pages/booking-history/types';

/**
 * Hook truy vấn và đồng bộ danh sách đơn đặt phòng kèm Invalidation Bus
 */
export function useBookingsQuery() {
  const [data, setData] = useState<BookingItem[]>(() => {
    return queryClient.get<BookingItem[]>(['bookings']) || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(!queryClient.get(['bookings']));
  const [error, setError] = useState<string | null>(null);

  const mapToBookingItem = useCallback((b: BookingListDto): BookingItem => {
    return {
      id: String(b.bookingId),
      bookingCode: b.bookingCode,
      hotelName: b.hotelName || 'Khách sạn StayLuxe',
      hotelCategory: 'Khu nghỉ dưỡng & Khách sạn cao cấp',
      location: 'Việt Nam',
      roomType: b.roomTypeName || 'Phòng nghỉ cao cấp',
      image: b.imageUrl || '/room-placeholder.svg',
      imageAlt: b.hotelName || 'StayLuxe Room',
      checkInDate: b.checkInDate,
      checkInDetail: `Nhận phòng từ 14:00 · ${b.checkInDate}`,
      checkOutDate: b.checkOutDate,
      checkOutDetail: `Trả phòng trước 12:00 · ${b.checkOutDate}`,
      nightsText: `${b.roomCount || 1} phòng`,
      guest: {
        name: 'Khách hàng',
        countText: `${b.numberOfGuests} khách`,
      },
      status: (
        b.bookingStatus.toLowerCase() === 'confirmed' ? 'confirmed' :
        b.bookingStatus.toLowerCase() === 'checkedin' ? 'confirmed' :
        b.bookingStatus.toLowerCase() === 'cancelled' ? 'cancelled' :
        b.bookingStatus.toLowerCase() === 'completed' || b.bookingStatus.toLowerCase() === 'checkedout' ? 'completed' :
        'pending'
      ),
      statusLabel: b.bookingStatus.toUpperCase(),
      depositBadge: (
        b.paymentStatus === 'Paid' ? 'ĐÃ THANH TOÁN 100%' :
        b.paymentStatus === 'PartiallyPaid' ? 'ĐÃ ĐẶT CỌC' :
        b.paymentStatus === 'Refunded' ? 'ĐÃ HOÀN TIỀN' :
        b.paymentStatus === 'RefundPending' ? 'ĐANG CHỜ HOÀN TIỀN' :
        'CHỜ THANH TOÁN CỌC'
      ),
      totalAmount: b.totalAmount,
      paidAmount: b.depositAmount,
      remainingAmount: Math.max(0, b.totalAmount - b.depositAmount),
      qrType: b.paymentStatus === 'Paid' ? 'checkin' : 'vietqr',
      qrCaption: b.paymentStatus === 'Paid' ? 'Mã nhận phòng nhanh' : 'Quét mã thanh toán',
      amenities: [
        { icon: 'wifi', text: 'Wi-Fi tốc độ cao' },
        { icon: 'pool', text: 'Hồ bơi vô cực' },
        { icon: 'restaurant', text: 'Bữa sáng buffet' }
      ],
      isEligibleForReview: b.bookingStatus.toLowerCase() === 'completed',
    };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getBookingsList();
      if (res.success && res.data) {
        const items = res.data.map(mapToBookingItem);
        setData(items);
        queryClient.set(['bookings'], items);
      } else {
        setData([]);
        queryClient.set(['bookings'], []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đơn đặt phòng.';
      setError(msg);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapToBookingItem]);

  useEffect(() => {
    // Initial fetch
    refetch();

    // Đăng ký lắng nghe sự kiện Invalidate Cache từ các Mutation khác (vd: Cancel Booking)
    const unsubscribe = queryClient.subscribe((key) => {
      if (key === '*' || key.startsWith('bookings')) {
        refetch();
      }
    });

    return () => unsubscribe();
  }, [refetch]);

  return {
    bookings: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Mutation hủy đơn đặt phòng có tự động Invalidate Cache 'bookings'
 */
export function useCancelBookingMutation() {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(
    async ({ bookingId, reason }: { bookingId: number; reason: string }): Promise<boolean> => {
      setIsCancelling(true);
      setError(null);
      try {
        const res = await cancelBooking(bookingId, reason);
        if (!res.success) {
          const msg = res.message || 'Không thể hủy đơn đặt phòng trên máy chủ.';
          setError(msg);
          return false;
        }

        // Tự động Invalidate Cache sau khi hủy thành công -> Các component khác đồng bộ lại ngay
        queryClient.invalidateQueries('bookings');
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi kết nối khi gửi yêu cầu hủy phòng.';
        setError(msg);
        return false;
      } finally {
        setIsCancelling(false);
      }
    },
    []
  );

  return {
    cancelBookingAsync: mutateAsync,
    isCancelling,
    error,
  };
}

/**
 * Mutation / Hook tính toán báo giá và áp dụng Voucher có Cache thông minh
 */
export function usePriceCalculationQuery() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestKeyRef = useRef<string>('');

  const calculatePrice = useCallback(
    async (request: CalculatePriceRequest): Promise<PriceCalculationResult | null> => {
      if (!request.roomIds || request.roomIds.length === 0 || !request.checkInDate || !request.checkOutDate) {
        return null;
      }

      const cacheKey = [
        'booking-price',
        request.roomIds.join(','),
        request.checkInDate,
        request.checkOutDate,
        request.paymentMethod || 'Deposit',
        request.voucherCode?.trim().toUpperCase() || '',
      ];

      const serializedKey = cacheKey.join('::');
      lastRequestKeyRef.current = serializedKey;

      // Kiểm tra cache trước (TTL 20s cho báo giá để tránh spam API)
      const cached = queryClient.get<PriceCalculationResult>(cacheKey, 20000);
      if (cached) {
        return cached;
      }

      setIsCalculating(true);
      setError(null);
      try {
        const res = await calculateBookingPrice(request);
        if (res.success && res.data) {
          queryClient.set(cacheKey, res.data);
          return res.data;
        } else {
          setError(res.message || 'Không thể tính toán chi phí đặt phòng.');
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi kết nối khi tính giá phòng.');
        return null;
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  const invalidateVoucherCache = useCallback(() => {
    queryClient.invalidateQueries('booking-price');
  }, []);

  return {
    calculatePrice,
    invalidateVoucherCache,
    isCalculating,
    error,
    setError,
  };
}
