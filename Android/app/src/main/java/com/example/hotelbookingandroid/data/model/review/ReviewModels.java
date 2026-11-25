package com.example.hotelbookingandroid.data.model.review;

/** DTO cho ReviewsController. */
public final class ReviewModels {
    private ReviewModels() {}

    public static class Review {
        public long reviewId;
        public long bookingId;
        public Integer hotelId;
        public int rating;
        public String comment;
        /** "Visible" | "Hidden" | "Deleted" */
        public String status;
        public String createdAt;
    }

    public static class ReviewRequest {
        public final int rating;
        public final String comment;

        public ReviewRequest(int rating, String comment) {
            this.rating = rating;
            this.comment = comment;
        }
    }
}
