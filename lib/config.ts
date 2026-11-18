const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://backend-5-bwzt.onrender.com";

export const CONFIG = {
  API_BASE_URL: rawApiBaseUrl.replace(/\/+$/, ""),
  STORAGE_KEYS: {
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
  },
  ROUTES: {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    DASHBOARD: "/dashboard",
  },
  // Change "/api/customers" to "/customers" or "/customer" to match your backend router
  ENDPOINTS: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    CUSTOMERS: "/api/customers",
    RESTAURANTS: "/api/restaurants",
    FOOD_ITEMS: "/api/food-items",
    ORDERS: "/api/orders",
    PAYMENTS: "/api/payments",
  },
} as const;