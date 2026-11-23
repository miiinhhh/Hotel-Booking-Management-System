import { ApiError } from './authApi';
import { discoveryRequest, RatingSummary } from './discoveryApi';

export type ReviewStatus = 'Visible' | 'Hidden' | 'Deleted';

export interface ReviewDto {
  reviewId: number;
  bookingId: number;
  customerId: number;
  hotelId: number | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface HotelRatingDto {
  hotelId: number;
  totalReviews: number;
  averageRating: number | null;
  distribution: { rating: number; count: number }[];
}

/** Đánh giá công khai (chỉ trạng thái Visible). */
export interface PublicReviewDto { reviewId: number; rating: number; comment: string | null; createdAt: string; updatedAt: string | null; reviewerName: string }

/** Đề xuất của AI cho một đánh giá chờ duyệt. */
export interface AiSuggestionDto { reviewId: number; decision: 'show' | 'hide' | 'review'; confidence: number; labels: string[]; reason: string; provider: string; scannedAt: string }
export interface AiScanStatusDto { jobId: string; hotelId: number; state: 'running' | 'completed' | 'failed'; total: number; processed: number; suggested: number; message: string | null }
export interface AiApplyResultDto { shown: number; hidden: number; skipped: number }

export interface ReviewPageDto<T> { items: T[]; total: number; page: number; pageSize: number }

// Backend trả thông báo nghiệp vụ bằng tiếng Anh; dịch các trường hợp khách hay gặp.
const MESSAGES: [RegExp, string][] = [
  [/Only a completed stay/i, 'Chỉ có thể đánh giá sau khi bạn đã trả phòng.'],
  [/already has a review/i, 'Đơn đặt phòng này đã được đánh giá.'],
  [/deleted review cannot be edited/i, 'Đánh giá đã bị xóa nên không thể chỉnh sửa.'],
  [/exactly one hotel/i, 'Đơn đặt phòng không hợp lệ để đánh giá.'],
  [/own (booking|review)|ownership/i, 'Bạn chỉ có thể đánh giá đơn đặt phòng của chính mình.'],
  [/Booking not found/i, 'Không tìm thấy đơn đặt phòng.'],
  [/deleting is not allowed/i, 'Chỉ được hiển thị hoặc ẩn đánh giá, không được xóa.'],
  [/reason is required/i, 'Vui lòng nhập lý do khi ẩn đánh giá.'],
  [/review author does not match/i, 'Người viết đánh giá không khớp chủ đơn đặt phòng nên không thể hiển thị.'],
  [/Review not found/i, 'Không tìm thấy đánh giá trong khách sạn này.'],
];

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await discoveryRequest<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError) {
      const translated = MESSAGES.find(([pattern]) => pattern.test(error.message))?.[1];
      if (translated) throw new ApiError(translated, error.status);
    }
    throw error;
  }
}

// Cache điểm theo khách sạn trong phiên làm việc để không gọi lại khi đổi trang/bộ lọc.
const ratingCache = new Map<number, Promise<RatingSummary>>();
/** Lấy điểm của nhiều khách sạn; khách sạn lỗi được coi như chưa có đánh giá. */
export async function loadHotelRatings(hotelIds: number[]): Promise<Record<number, RatingSummary>> {
  const unique = [...new Set(hotelIds)];
  const entries = await Promise.all(unique.map(async (id) => {
    if (!ratingCache.has(id)) {
      ratingCache.set(id, reviewApi.hotelRating(id)
        .then((r) => ({ average: r.averageRating, count: r.totalReviews }))
        .catch(() => { ratingCache.delete(id); return { average: null, count: 0 }; }));
    }
    return [id, await ratingCache.get(id)!] as const;
  }));
  return Object.fromEntries(entries);
}
/** Gọi sau khi khách gửi/sửa đánh giá để lần hiển thị sau lấy điểm mới. */
export function invalidateHotelRating(hotelId?: number | null) { if (hotelId) ratingCache.delete(hotelId); else ratingCache.clear(); }

export interface ReviewHistoryDto { historyId: number; actorId: number; oldStatus: ReviewStatus; newStatus: ReviewStatus; action: string; reason: string | null; createdAt: string }

export const reviewApi = {
  /** Danh sách đánh giá của khách sạn để kiểm duyệt (cần quyền reviews.manage). */
  moderationList: (hotelId: number, status?: ReviewStatus, page = 1, pageSize = 20) =>
    call<ReviewPageDto<ReviewDto>>(`/api/admin/hotels/${hotelId}/reviews?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ''}`),
  /** Chỉ hiển thị hoặc ẩn; Backend từ chối xóa. Ẩn bắt buộc có lý do. */
  moderate: (hotelId: number, reviewId: number, status: 'Visible' | 'Hidden', reason?: string) =>
    call<ReviewDto>(`/api/admin/hotels/${hotelId}/reviews/${reviewId}/moderation`, { method: 'PATCH', body: JSON.stringify({ status, reason: reason?.trim() || null }) })
      .then((review) => { invalidateHotelRating(hotelId); return review; }),
  aiScan: (hotelId: number) => call<AiScanStatusDto>(`/api/admin/hotels/${hotelId}/reviews/ai-scan`, { method: 'POST' }),
  aiScanStatus: (hotelId: number, jobId: string) => call<AiScanStatusDto>(`/api/admin/hotels/${hotelId}/reviews/ai-scan/${jobId}`),
  aiSuggestions: (hotelId: number) => call<AiSuggestionDto[]>(`/api/admin/hotels/${hotelId}/reviews/ai-suggestions`),
  aiApply: (hotelId: number, minConfidence = 0.85) =>
    call<AiApplyResultDto>(`/api/admin/hotels/${hotelId}/reviews/ai-apply`, { method: 'POST', body: JSON.stringify({ minConfidence }) })
      .then((r) => { invalidateHotelRating(hotelId); return r; }),
  /** Tên hiển thị theo mã người dùng (khách viết đánh giá, người kiểm duyệt). */
  people: (hotelId: number, ids: number[]) =>
    call<Record<number, string>>(`/api/admin/hotels/${hotelId}/reviews/people?ids=${ids.join(',')}`),
  history: (hotelId: number, reviewId: number) =>
    call<ReviewHistoryDto[]>(`/api/admin/hotels/${hotelId}/reviews/${reviewId}/history`),
  /** Trả về null nếu booking chưa có đánh giá. */
  async forBooking(bookingId: number): Promise<ReviewDto | null> {
    try {
      const review = await call<ReviewDto>(`/api/bookings/${bookingId}/review`);
      return review.status === 'Deleted' ? null : review;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },
  create: (bookingId: number, rating: number, comment: string) =>
    call<ReviewDto>(`/api/bookings/${bookingId}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) })
      .then((review) => { invalidateHotelRating(review.hotelId); return review; }),
  update: (bookingId: number, rating: number, comment: string) =>
    call<ReviewDto>(`/api/bookings/${bookingId}/review`, { method: 'PUT', body: JSON.stringify({ rating, comment }) })
      .then((review) => { invalidateHotelRating(review.hotelId); return review; }),
  /** Khách tự xóa đánh giá của mình (xóa mềm; có thể viết lại sau). */
  removeOwn: (bookingId: number) =>
    call<void>(`/api/bookings/${bookingId}/review`, { method: 'DELETE' }).then(() => { invalidateHotelRating(); }),
  mine: (page = 1, pageSize = 100) => call<ReviewPageDto<ReviewDto>>(`/api/me/reviews?page=${page}&pageSize=${pageSize}`),
  publicList: (hotelId: number, page = 1, pageSize = 5) => call<ReviewPageDto<PublicReviewDto>>(`/api/hotels/${hotelId}/reviews?page=${page}&pageSize=${pageSize}`),
  hotelRating: (hotelId: number) => call<HotelRatingDto>(`/api/hotels/${hotelId}/rating`),
};
