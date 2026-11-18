export const CONFIG = {
  API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://backend-5-bwzt.onrender.com",
  STORAGE_KEYS: {
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
  },
  ROUTES: {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    DASHBOARD: "/dashboard",
    CUSTOMERS: "/customers",
    RESTAURANTS: "/restaurants",
    FOOD_ITEMS: "/food-items",
    ORDERS: "/orders",
    PAYMENTS: "/payments",
  },
  ENDPOINTS: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    CUSTOMERS: "/customers",
    RESTAURANTS: "/restaurants",
    FOOD_ITEMS: "/food-items",
    ORDERS: "/orders",
    PAYMENTS: "/payments",
  },
} as const;