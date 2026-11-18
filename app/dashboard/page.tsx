"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModuleKey =
  | "dashboard"
  | "customers"
  | "restaurants"
  | "food-items"
  | "orders"
  | "payments";

interface FieldConfig {
  name: string;
  label: string;
  placeholder: string;
  type?: "text" | "email" | "number";
}

interface ModuleConfig {
  key: Exclude<ModuleKey, "dashboard">;
  navLabel: string;
  title: string;
  table: string;
  description: string;
  stat: string;
  endpoint: string;
  fields: FieldConfig[];
}

const MODULES: ModuleConfig[] = [
  {
    key: "customers",
    navLabel: "Customers",
    title: "Customers",
    table: "Customer",
    description:
      "Manage customer profiles, emails, phone numbers, and delivery addresses.",
    stat: "Manage Customers",
    endpoint: CONFIG.ENDPOINTS.CUSTOMERS,
    fields: [
      { name: "name", label: "Full Name", placeholder: "Juan Dela Cruz" },
      {
        name: "email",
        label: "Email",
        placeholder: "juan@example.com",
        type: "email",
      },
      { name: "phone", label: "Phone Number", placeholder: "09171234567" },
      {
        name: "address",
        label: "Delivery Address",
        placeholder: "Naga City, Camarines Sur",
      },
    ],
  },
  {
    key: "restaurants",
    navLabel: "Restaurants",
    title: "Restaurants",
    table: "Restaurant",
    description:
      "Configure branch locations, contact info, and opening/closing schedules.",
    stat: "Manage Restaurants",
    endpoint: CONFIG.ENDPOINTS.RESTAURANTS,
    fields: [
      {
        name: "name",
        label: "Restaurant Name",
        placeholder: "Bicol Express Kitchen",
      },
      {
        name: "location",
        label: "Branch Location",
        placeholder: "Magsaysay Ave, Naga City",
      },
      {
        name: "contact_info",
        label: "Contact Info",
        placeholder: "054-472-1234",
      },
      {
        name: "schedule",
        label: "Opening/Closing Schedule",
        placeholder: "08:00 AM - 10:00 PM",
      },
    ],
  },
  {
    key: "food-items",
    navLabel: "Food Items",
    title: "Food Items",
    table: "food_item",
    description:
      "Maintain menu items, pricing, and restaurant menu assignments.",
    stat: "Manage Menu",
    endpoint: CONFIG.ENDPOINTS.FOOD_ITEMS,
    fields: [
      { name: "name", label: "Item Name", placeholder: "Laing Pasta" },
      {
        name: "price",
        label: "Price",
        placeholder: "185",
        type: "number",
      },
      {
        name: "restaurant_id",
        label: "Restaurant ID",
        placeholder: "1",
        type: "number",
      },
      {
        name: "category",
        label: "Category / Description",
        placeholder: "Main Course",
      },
    ],
  },
  {
    key: "orders",
    navLabel: "Orders",
    title: "Orders & Line Items",
    table: "orders · order_item",
    description:
      "Track order statuses, quantities, unit prices, subtotals, and grand totals.",
    stat: "Manage Orders",
    endpoint: CONFIG.ENDPOINTS.ORDERS,
    fields: [
      {
        name: "customer_id",
        label: "Customer ID",
        placeholder: "1",
        type: "number",
      },
      {
        name: "restaurant_id",
        label: "Restaurant ID",
        placeholder: "1",
        type: "number",
      },
      {
        name: "status",
        label: "Order Status",
        placeholder: "Pending / Preparing / Delivered",
      },
      {
        name: "total_amount",
        label: "Grand Total",
        placeholder: "370",
        type: "number",
      },
    ],
  },
  {
    key: "payments",
    navLabel: "Payments",
    title: "Payments",
    table: "payment",
    description:
      "Monitor payment methods, transaction dates, amounts, and settlement statuses.",
    stat: "Manage Payments",
    endpoint: CONFIG.ENDPOINTS.PAYMENTS,
    fields: [
      {
        name: "order_id",
        label: "Order ID",
        placeholder: "1",
        type: "number",
      },
      {
        name: "payment_method",
        label: "Payment Method",
        placeholder: "Cash / GCash / Card",
      },
      {
        name: "amount",
        label: "Amount",
        placeholder: "370",
        type: "number",
      },
      {
        name: "status",
        label: "Settlement Status",
        placeholder: "Paid / Pending",
      },
    ],
  },
];

const NAV_ITEMS: { label: string; key: ModuleKey }[] = [
  { label: "Dashboard", key: "dashboard" },
  ...MODULES.map((m) => ({ label: m.navLabel, key: m.key })),
];

function getRecordId(record: Record<string, unknown>): string | number | null {
  const idKeys = [
    "id",
    "_id",
    "customer_id",
    "restaurant_id",
    "food_item_id",
    "food_id",
    "order_id",
    "payment_id",
  ];
  for (const key of idKeys) {
    const val = record[key];
    if (typeof val === "string" || typeof val === "number") {
      return val;
    }
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ModuleKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Backend health status for overview card
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking"
  );

  // CRUD states for whichever table is selected
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { isChecking } = useAuthGuard({ requireAuth: true });

  const activeModule =
    activeTab === "dashboard"
      ? null
      : MODULES.find((m) => m.key === activeTab) ?? null;

  const getAuthHeaders = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN)
        : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Initial backend connection check
  useEffect(() => {
    if (isChecking) return;

    const controller = new AbortController();
    fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.CUSTOMERS}`, {
      method: "GET",
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
      .then((res) => setApiStatus(res.status < 500 ? "online" : "offline"))
      .catch((err) => {
        if (err.name !== "AbortError") setApiStatus("offline");
      });

    return () => controller.abort();
  }, [isChecking]);

  // 1. GET — Fetch records whenever a table module is opened
  const fetchRecords = useCallback(async (mod: ModuleConfig) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}${mod.endpoint}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`GET ${mod.endpoint} failed (${res.status})`);
      }
      const json = await res.json();
      const list = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];
      setRecords(list);
    } catch (err) {
      setRecords([]);
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to fetch records.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectTab = (key: ModuleKey) => {
    setActiveTab(key);
    setMobileMenuOpen(false);
    setEditingId(null);
    setFeedback(null);

    if (key !== "dashboard") {
      const mod = MODULES.find((m) => m.key === key);
      if (mod) {
        const initialForm: Record<string, string> = {};
        mod.fields.forEach((f) => {
          initialForm[f.name] = "";
        });
        setFormData(initialForm);
        fetchRecords(mod);
      }
    }
  };

  // 2. POST (Create) & 3. PUT (Update)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModule) return;

    setSubmitting(true);
    setFeedback(null);

    const payload: Record<string, string | number> = {};
    activeModule.fields.forEach((field) => {
      const rawVal = formData[field.name] ?? "";
      payload[field.name] =
        field.type === "number" && rawVal !== "" ? Number(rawVal) : rawVal;
    });

    const isUpdate = editingId !== null;
    const method = isUpdate ? "PUT" : "POST";
    const url = isUpdate
      ? `${CONFIG.API_BASE_URL}${activeModule.endpoint}/${editingId}`
      : `${CONFIG.API_BASE_URL}${activeModule.endpoint}`;

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`${method} ${activeModule.endpoint} failed (${res.status})`);
      }

      const resetForm: Record<string, string> = {};
      activeModule.fields.forEach((f) => {
        resetForm[f.name] = "";
      });
      setFormData(resetForm);
      setEditingId(null);

      await fetchRecords(activeModule);
      setFeedback({
        type: "success",
        message: isUpdate
          ? `PUT request successful — Record #${editingId} updated.`
          : `POST request successful — New ${activeModule.title} record created.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : `Failed to execute ${method} request.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Populate form for PUT update
  const handleStartEdit = (record: Record<string, unknown>) => {
    if (!activeModule) return;
    const id = getRecordId(record);
    if (id === null) {
      setFeedback({
        type: "error",
        message: "Cannot edit: record has no recognizable ID field.",
      });
      return;
    }

    const populated: Record<string, string> = {};
    activeModule.fields.forEach((field) => {
      const val = record[field.name];
      populated[field.name] = val !== undefined && val !== null ? String(val) : "";
    });

    setEditingId(id);
    setFormData(populated);
    setFeedback(null);
  };

  // 4. DELETE — Remove record
  const handleDeleteRecord = async (record: Record<string, unknown>) => {
    if (!activeModule) return;
    const id = getRecordId(record);
    if (id === null) {
      setFeedback({
        type: "error",
        message: "Cannot delete: record has no recognizable ID field.",
      });
      return;
    }

    setFeedback(null);
    try {
      const res = await fetch(
        `${CONFIG.API_BASE_URL}${activeModule.endpoint}/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error(
          `DELETE ${activeModule.endpoint}/${id} failed (${res.status})`
        );
      }

      setRecords((prev) => prev.filter((item) => getRecordId(item) !== id));
      if (editingId === id) {
        setEditingId(null);
      }
      setFeedback({
        type: "success",
        message: `DELETE request successful — Record #${id} removed.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to execute DELETE request.",
      });
    }
  };

  if (isChecking) return null;

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    }
    router.replace(CONFIG.ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-[#1c1714] font-sans text-white">
      {/* Top Navigation Bar (Preserved for Desktop & Mobile) */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#15110f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => handleSelectTab("dashboard")}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4338ca] text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight">
              Ordering Dashboard
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSelectTab(item.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#4338ca] text-white"
                      : "text-stone-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleLogout}
              className="rounded-full bg-[#4338ca] px-5 text-xs font-semibold text-white hover:bg-[#3730a3]"
            >
              Sign Out
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 p-2 text-stone-300 hover:bg-white/10 hover:text-white md:hidden"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-white/10 bg-[#15110f] px-6 py-3 md:hidden">
            <div className="flex flex-col gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectTab(item.key)}
                    className={`rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#4338ca] text-white"
                        : "text-stone-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {activeTab === "dashboard" || !activeModule ? (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                RESTAURANT ORDERING SYSTEM
              </h1>
              <p className="mt-1 text-xs text-stone-300">
                Database-driven platform designed to manage customers, restaurant
                branches, food items, orders, order line items, and payments.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <Card className="border border-white/15 bg-white/10 text-white backdrop-blur-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-stone-300">
                    Database Schema
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">6 Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-indigo-300">
                    Customer, Restaurant, Food, Orders, Items, Payment
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-white/15 bg-white/10 text-white backdrop-blur-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-stone-300">
                    Active Modules
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">5 Routes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-stone-300">
                    Full CRUD management ready
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-white/15 bg-white/10 text-white backdrop-blur-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs text-stone-300">
                    System Status
                  </CardDescription>
                  <CardTitle
                    className={`text-3xl font-bold ${
                      apiStatus === "online"
                        ? "text-emerald-400"
                        : apiStatus === "checking"
                          ? "text-amber-300"
                          : "text-rose-400"
                    }`}
                  >
                    {apiStatus === "online"
                      ? "Online"
                      : apiStatus === "checking"
                        ? "Checking..."
                        : "Offline"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-stone-300">
                    {apiStatus === "online"
                      ? "Connected"
                      : apiStatus === "checking"
                        ? "Connecting to API..."
                        : "Backend unreachable"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Database Tables
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MODULES.map((mod) => (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => handleSelectTab(mod.key)}
                    className="group block text-left"
                  >
                    <Card className="h-full border border-white/15 bg-white/5 text-white transition-colors group-hover:border-[#4338ca] group-hover:bg-white/10">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base font-semibold">
                            {mod.title}
                          </CardTitle>
                          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-indigo-300">
                            {mod.table}
                          </span>
                        </div>
                        <CardDescription className="pt-1 text-xs text-stone-300">
                          {mod.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-xs font-medium text-indigo-300 group-hover:underline">
                          {mod.stat} →
                        </span>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* Direct Interactive GET / POST / PUT / DELETE View for Selected Table */
          <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {activeModule.title}
                  </h1>
                  <span className="rounded bg-white/10 px-2.5 py-0.5 font-mono text-xs text-indigo-300">
                    {activeModule.table}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-300">
                  Endpoint:{" "}
                  <code className="text-indigo-300">
                    {CONFIG.API_BASE_URL}
                    {activeModule.endpoint}
                  </code>{" "}
                  · Methods: <strong>GET</strong>, <strong>POST</strong>,{" "}
                  <strong>PUT</strong>, <strong>DELETE</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => fetchRecords(activeModule)}
                  className="rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Refresh (GET)
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSelectTab("dashboard")}
                  variant="outline"
                  className="rounded-full border-white/20 bg-transparent px-4 text-xs text-stone-200 hover:bg-white/10"
                >
                  ← All Tables
                </Button>
              </div>
            </div>

            {feedback && (
              <div
                className={`rounded-lg border px-4 py-3 text-xs ${
                  feedback.type === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {feedback.message}
              </div>
            )}

            {/* POST (Create) & PUT (Update) Form */}
            <Card className="border border-white/15 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-base">
                  {editingId !== null
                    ? `Update Record #${editingId} (PUT)`
                    : `Create New ${activeModule.title} Record (POST)`}
                </CardTitle>
                <CardDescription className="text-xs text-stone-300">
                  {editingId !== null
                    ? `Sends a PUT request to ${activeModule.endpoint}/${editingId}`
                    : `Sends a POST request to ${activeModule.endpoint}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSaveRecord}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {activeModule.fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <label className="block text-xs font-medium text-stone-300">
                        {field.label}
                      </label>
                      <input
                        required
                        type={field.type ?? "text"}
                        step={field.type === "number" ? "any" : undefined}
                        placeholder={field.placeholder}
                        value={formData[field.name] ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#4338ca] focus:outline-none"
                      />
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1 sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full bg-[#4338ca] px-5 text-xs font-semibold text-white hover:bg-[#3730a3]"
                    >
                      {submitting
                        ? "Saving..."
                        : editingId !== null
                          ? "Save Changes (PUT)"
                          : "Create Record (POST)"}
                    </Button>

                    {editingId !== null && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          const cleared: Record<string, string> = {};
                          activeModule.fields.forEach((f) => {
                            cleared[f.name] = "";
                          });
                          setFormData(cleared);
                        }}
                        className="rounded-full border-white/20 bg-transparent px-4 text-xs text-stone-200 hover:bg-white/10"
                      >
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* GET Records List with PUT & DELETE Actions */}
            <Card className="border border-white/15 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-base">
                  Records List (GET) — {records.length} item
                  {records.length === 1 ? "" : "s"}
                </CardTitle>
                <CardDescription className="text-xs text-stone-300">
                  Fetched from <code>GET {activeModule.endpoint}</code>. Select{" "}
                  <strong>Edit (PUT)</strong> to modify or{" "}
                  <strong>Delete (DELETE)</strong> to remove.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="py-4 text-xs text-stone-400">
                    Loading records via GET...
                  </p>
                ) : records.length === 0 ? (
                  <p className="py-4 text-xs text-stone-400">
                    No records returned from{" "}
                    <code>GET {activeModule.endpoint}</code>. Use the{" "}
                    <strong>POST</strong> form above to add one.
                  </p>
                ) : (
                  records.map((record, index) => {
                    const id = getRecordId(record);
                    return (
                      <div
                        key={id ?? index}
                        className="flex flex-col justify-between gap-4 rounded-lg border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="grid flex-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                          {Object.entries(record).map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="font-mono text-[11px] text-stone-400">
                                {key}:{" "}
                              </span>
                              <span className="text-stone-100">
                                {typeof value === "object" && value !== null
                                  ? JSON.stringify(value)
                                  : String(value ?? "—")}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStartEdit(record)}
                            className="bg-amber-600 text-xs text-white hover:bg-amber-500"
                          >
                            Edit (PUT)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDeleteRecord(record)}
                            className="bg-rose-600 text-xs text-white hover:bg-rose-500"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}