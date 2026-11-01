
import { getDB } from "./db.js";
import { COLLECTIONS } from "./collections.js";

export const createIndexes = async () => {
  const db = getDB();

  // Studio indexes
  await db.collection(COLLECTIONS.STUDIOS).createIndexes([
    {
      key: { ownerId: 1 },
      name: "studio_owner_index",
    },
    {
      key: { category: 1, status: 1 },
      name: "studio_category_status_index",
    },
    {
      key: { hourlyRate: 1 },
      name: "studio_price_index",
    },
    {
      key: { "location.city": 1 },
      name: "studio_city_index",
    },
    {
      key: { createdAt: -1 },
      name: "studio_created_at_index",
    },
  ]);

  // Booking indexes
  await db.collection(COLLECTIONS.BOOKINGS).createIndexes([
    {
      key: { studioId: 1, status: 1, startAt: 1, endAt: 1 },
      name: "booking_conflict_index",
    },
    {
      key: { creatorId: 1, createdAt: -1 },
      name: "booking_creator_index",
    },
    {
      key: { hostId: 1, status: 1 },
      name: "booking_host_index",
    },
  ]);

  // Review indexes
  await db.collection(COLLECTIONS.REVIEWS).createIndexes([
    {
      key: { studioId: 1, createdAt: -1 },
      name: "review_studio_index",
    },
    {
      key: { bookingId: 1 },
      name: "review_booking_index",
      unique: true,
    },
  ]);

  // Wishlist indexes
  await db.collection(COLLECTIONS.WISHLISTS).createIndexes([
    {
      key: { userId: 1, studioId: 1 },
      name: "wishlist_unique_index",
      unique: true,
    },
  ]);

  console.log("MongoDB indexes created successfully!");
};
