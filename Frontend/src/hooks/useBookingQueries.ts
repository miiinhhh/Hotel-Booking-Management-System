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
    const status = b.bookingStatus.toLowerCase();
    // Số đã trả thật: Paid = toàn bộ, PartiallyPaid = tiền cọc, còn lại = 0 (chưa thanh toán / đã hoàn).
    const paid = b.paymentStatus === 'Paid' ? b.totalAmount : b.paymentStatus === 'PartiallyPaid' ? b.depositAmount : 0;
    return {
      id: String(b.bookingId),
      bookingCode: b.bookingCode,
      hotelName: b.hotelName || '',
      hotelCategory: '',
      location: '',
      roomType: b.roomTypeName || '',
      image: b.imageUrl || '/room-placeholder.svg',
      imageAlt: b.hotelName || '',
      checkInDate: b.checkInDate,
      checkInDetail: '',
      checkOutDate: b.checkOutDate,
      checkOutDetail: '',
      nightsText: '',
      guest: { name: '', countText: '' },
      status: (
        status === 'confirmed' || status === 'checkedin' ? 'confirmed' :
        // Đơn hết hạn giữ chỗ (không thanh toán kịp) không còn là chuyến đi sắp tới.
        status === 'cancelled' || status === 'expired' ? 'cancelled' :
        status === 'completed' || status === 'checkedout' ? 'completed' :
        'pending'
      ),
      statusRaw: b.bookingStatus,
      statusLabel: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      totalAmount: b.totalAmount,
      paidAmount: paid,
      remainingAmount: Math.max(0, b.totalAmount - paid),
      depositDue: b.depositAmount,
      roomCount: b.roomCount || 1,
      numberOfGuests: b.numberOfGuests,
      refundAmount: b.refundAmount,
      refundedAt: b.refundedAt,
      qrType: 'checkin',
      qrCaption: '',
      amenities: [],
      isEligibleForReview: status === 'completed',
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
