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
  hideInTable?: boolean;
}

interface ModuleConfig {
  key: Exclude<ModuleKey, "dashboard">;
  navLabel: string;
  title: string;
  singularTitle: string;
  table: string;
  description: string;
  stat: string;
  defaultEndpoint: string;
  fields: FieldConfig[];
}

const MODULES: ModuleConfig[] = [
  {
    key: "customers",
    navLabel: "Customers",
    title: "Customers",
    singularTitle: "Customer",
    table: "Customer",
    description: "A list of all customers stored in the backend.",
    stat: "Manage Customers",
    defaultEndpoint: CONFIG.ENDPOINTS.CUSTOMERS,
    fields: [
      {
        name: "customer_firstname",
        label: "First Name",
        placeholder: "Aaron",
      },
      {
        name: "customer_lastname",
        label: "Last Name",
        placeholder: "Bustamante",
      },
      {
        name: "customer_email",
        label: "Email",
        placeholder: "juan@example.com",
        type: "email",
      },
      {
        name: "customer_phone",
        label: "Phone Number",
        placeholder: "09123456789",
      },
      {
        name: "customer_address",
        label: "Delivery Address",
        placeholder: "Naga City, Camarines Sur",
      },
    ],
  },
  {
    key: "restaurants",
    navLabel: "Restaurants",
    title: "Restaurants",
    singularTitle: "Restaurant",
    table: "Restaurant",
    description: "A list of all restaurant branches stored in the backend.",
    stat: "Manage Restaurants",
    defaultEndpoint: CONFIG.ENDPOINTS.RESTAURANTS,
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
    singularTitle: "Food Item",
    table: "food_item",
    description: "A list of all menu food items stored in the backend.",
    stat: "Manage Menu",
    defaultEndpoint: CONFIG.ENDPOINTS.FOOD_ITEMS,
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
    singularTitle: "Order",
    table: "orders · order_item",
    description: "A list of all orders stored in the backend.",
    stat: "Manage Orders",
    defaultEndpoint: CONFIG.ENDPOINTS.ORDERS,
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
    singularTitle: "Payment",
    table: "payment",
    description: "A list of all payment transactions stored in the backend.",
    stat: "Manage Payments",
    defaultEndpoint: CONFIG.ENDPOINTS.PAYMENTS,
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

function normalizePath(path: string): string {
  return path.startsWith("/") ? path.trim() : `/${path.trim()}`;
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN)
      : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

function formatCreatedAt(record: Record<string, unknown>): string {
  const raw = record.created_at ?? record.createdAt;
  if (!raw) return "—";
  const parsed = new Date(String(raw));
  if (Number.isNaN(parsed.getTime())) return String(raw);
  return parsed.toLocaleDateString("en-US");
}

async function extractErrorMessage(res: Response, fallback: string) {
  try {
    const text = await res.text();
    if (!text) return fallback;
    try {
      const json = JSON.parse(text);
      const detail = json?.message || json?.error || json?.detail;
      if (Array.isArray(detail)) return `${fallback}: ${detail.join(", ")}`;
      if (detail) return `${fallback}: ${detail}`;
    } catch {
      const cleanText = text.replace(/<[^>]+>/g, " ").trim().slice(0, 140);
      if (cleanText) return `${fallback}: ${cleanText}`;
    }
  } catch {
    // ignore read error
  }
  return fallback;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ModuleKey>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking"
  );

  const [endpoints, setEndpoints] = useState<Record<string, string>>(() =>
    Object.fromEntries(MODULES.map((m) => [m.key, m.defaultEndpoint]))
  );

  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [viewRecord, setViewRecord] = useState<Record<string, unknown> | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<Record<
    string,
    unknown
  > | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { isChecking } = useAuthGuard({ requireAuth: true });

  const activeModule =
    activeTab === "dashboard"
      ? null
      : MODULES.find((m) => m.key === activeTab) ?? null;

  const activeEndpoint = activeModule
    ? endpoints[activeModule.key] || activeModule.defaultEndpoint
    : "";

  const visibleTableFields = activeModule
    ? activeModule.fields.filter((f) => !f.hideInTable)
    : [];

  useEffect(() => {
    if (isChecking) return;

    const controller = new AbortController();
    fetch(`${CONFIG.API_BASE_URL}/`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((res) => setApiStatus(res.status < 500 ? "online" : "offline"))
      .catch((err) => {
        if (err.name !== "AbortError") setApiStatus("offline");
      });

    return () => controller.abort();
  }, [isChecking]);

  // 1. GET — Fetch records
  const fetchRecords = useCallback(
    async (mod: ModuleConfig, overrideEndpoint?: string) => {
      const path = normalizePath(
        overrideEndpoint ?? endpoints[mod.key] ?? mod.defaultEndpoint
      );
      setLoading(true);
      setFeedback(null);
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
          method: "GET",
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          throw new Error(
            await extractErrorMessage(res, `GET ${path} failed (${res.status})`)
          );
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
    },
    [endpoints]
  );

  const resetFormFields = (mod: ModuleConfig) => {
    const blank: Record<string, string> = {};
    mod.fields.forEach((f) => {
      blank[f.name] = "";
    });
    setFormData(blank);
  };

  const handleSelectTab = (key: ModuleKey) => {
    setActiveTab(key);
    setMobileMenuOpen(false);
    setIsCreateModalOpen(false);
    setEditingId(null);
    setViewRecord(null);
    setDeleteTarget(null);
    setFeedback(null);

    if (key !== "dashboard") {
      const mod = MODULES.find((m) => m.key === key);
      if (mod) {
        resetFormFields(mod);
        fetchRecords(mod);
      }
    }
  };

  const handleOpenCreateModal = () => {
    if (!activeModule) return;
    resetFormFields(activeModule);
    setEditingId(null);
    setIsCreateModalOpen(true);
    setFeedback(null);
  };

  // 2. POST (Create) & 3. PUT (Update)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModule) return;

    const path = normalizePath(activeEndpoint);
    setSubmitting(true);
    setFeedback(null);

    const payload: Record<string, string | number> = {};
    activeModule.fields.forEach((field) => {
      const rawVal = (formData[field.name] ?? "").trim();
      if (rawVal !== "") {
        payload[field.name] =
          field.type === "number" ? Number(rawVal) : rawVal;
      }
    });

    const isUpdate = editingId !== null;
    const method = isUpdate ? "PUT" : "POST";
    const url = isUpdate
      ? `${CONFIG.API_BASE_URL}${path}/${editingId}`
      : `${CONFIG.API_BASE_URL}${path}`;

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(
            res,
            `${method} ${path} failed (${res.status})`
          )
        );
      }

      resetFormFields(activeModule);
      setEditingId(null);
      setIsCreateModalOpen(false);

      await fetchRecords(activeModule, path);
      setFeedback({
        type: "success",
        message: isUpdate
          ? `PUT request successful — Record #${editingId} updated.`
          : `POST request successful — New ${activeModule.singularTitle} created.`,
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
      populated[field.name] =
        val !== undefined && val !== null ? String(val) : "";
    });

    setIsCreateModalOpen(false);
    setEditingId(id);
    setFormData(populated);
    setFeedback(null);
  };

  // 4. DELETE — Remove record
  const handleConfirmDelete = async () => {
    if (!activeModule || !deleteTarget) return;
    const path = normalizePath(activeEndpoint);
    const id = getRecordId(deleteTarget);
    if (id === null) {
      setFeedback({
        type: "error",
        message: "Cannot delete: record has no recognizable ID field.",
      });
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}${path}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(
          await extractErrorMessage(
            res,
            `DELETE ${path}/${id} failed (${res.status})`
          )
        );
      }

      setRecords((prev) => prev.filter((item) => getRecordId(item) !== id));
      if (editingId === id) {
        setEditingId(null);
      }
      setDeleteTarget(null);
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
    } finally {
      setDeleting(false);
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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#15110f]/95 backdrop-blur">
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

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
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
          <div className="space-y-5">
            {/* Top Bar: Live Endpoint Tester + Back to All Tables */}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-300">
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-indigo-300">
                  {activeModule.table}
                </span>
                <span>Endpoint:</span>
                <code className="text-indigo-300">{CONFIG.API_BASE_URL}</code>
                <input
                  type="text"
                  value={activeEndpoint}
                  onChange={(e) =>
                    setEndpoints((prev) => ({
                      ...prev,
                      [activeModule.key]: e.target.value,
                    }))
                  }
                  className="rounded-md border border-white/15 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-indigo-300 focus:border-[#4338ca] focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSelectTab("dashboard")}
                className="self-start rounded-lg border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-stone-200 transition hover:bg-white/10 sm:self-auto"
              >
                ← All Tables
              </button>
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

            {/* Main Table Card */}
            <div className="w-full rounded-xl border border-white/15 bg-[#15110f]/90 p-6 shadow-sm">
              {/* Card Header */}
              <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    {activeModule.title}
                  </h1>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {activeModule.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fetchRecords(activeModule, activeEndpoint)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-stone-100 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    <svg
                      className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Read / Refresh
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#4338ca] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3730a3]"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create {activeModule.singularTitle}
                  </button>
                </div>
              </div>

              {/* Clean Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-t border-b border-white/15 text-stone-300">
                      <th className="py-3.5 pr-4 font-medium">ID</th>
                      {visibleTableFields.map((field) => (
                        <th key={field.name} className="px-4 py-3.5 font-medium">
                          {field.label}
                        </th>
                      ))}
                      <th className="px-4 py-3.5 font-medium">Created At</th>
                      <th className="py-3.5 pl-4 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10 text-stone-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={visibleTableFields.length + 3}
                          className="py-8 text-center text-stone-400"
                        >
                          Loading {activeModule.title.toLowerCase()}...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleTableFields.length + 3}
                          className="py-8 text-center text-stone-400"
                        >
                          No records found in{" "}
                          <code>{normalizePath(activeEndpoint)}</code>. Click{" "}
                          <span className="font-medium text-white">
                            + Create {activeModule.singularTitle}
                          </span>{" "}
                          to add one.
                        </td>
                      </tr>
                    ) : (
                      records.map((record, index) => {
                        const id = getRecordId(record);
                        return (
                          <tr
                            key={id ?? index}
                            className="transition hover:bg-white/[0.04]"
                          >
                            <td className="py-3.5 pr-4 font-mono text-stone-300">
                              {id ?? index + 1}
                            </td>

                            {visibleTableFields.map((field) => {
                              const val = record[field.name];
                              return (
                                <td
                                  key={field.name}
                                  className="max-w-[200px] truncate px-4 py-3.5"
                                >
                                  {val !== undefined &&
                                  val !== null &&
                                  val !== ""
                                    ? String(val)
                                    : "—"}
                                </td>
                              );
                            })}

                            <td className="px-4 py-3.5 text-stone-300">
                              {formatCreatedAt(record)}
                            </td>

                            <td className="py-3.5 pl-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewRecord(record)}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-stone-100 transition hover:bg-white/20"
                                >
                                  <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                  View
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(record)}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/30"
                                >
                                  <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(record)}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/30"
                                >
                                  <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* View Record Modal */}
        {viewRecord && activeModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#15110f] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-sm font-semibold text-white">
                  {activeModule.singularTitle} Details
                </h2>
                <button
                  type="button"
                  onClick={() => setViewRecord(null)}
                  className="text-xs text-stone-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto text-xs">
                {Object.entries(viewRecord).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 border-b border-white/5 pb-2"
                  >
                    <span className="font-mono text-stone-400">{key}</span>
                    <span className="text-right font-medium text-stone-100">
                      {val !== undefined && val !== null && val !== ""
                        ? typeof val === "object"
                          ? JSON.stringify(val)
                          : String(val)
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewRecord(null)}
                  className="rounded-lg bg-[#4338ca] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3730a3]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {(isCreateModalOpen || editingId !== null) && activeModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#15110f] p-6 shadow-xl">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-sm font-semibold text-white">
                  {editingId !== null
                    ? `Edit ${activeModule.singularTitle} #${editingId}`
                    : `Create ${activeModule.singularTitle}`}
                </h2>
                <p className="mt-0.5 text-xs text-stone-400">
                  {editingId !== null
                    ? `Send PUT request to ${normalizePath(activeEndpoint)}/${editingId}`
                    : `Send POST request to ${normalizePath(activeEndpoint)}`}
                </p>
              </div>

              <form onSubmit={handleSaveRecord} className="mt-4 space-y-3.5">
                {activeModule.fields.map((field) => (
                  <div key={field.name} className="space-y-1.5">
                    <label
                      htmlFor={`field-${field.name}`}
                      className="block text-xs font-medium text-stone-300"
                    >
                      {field.label}
                    </label>
                    <input
                      id={`field-${field.name}`}
                      type={field.type ?? "text"}
                      placeholder={field.placeholder}
                      value={formData[field.name] ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [field.name]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#4338ca] focus:outline-none"
                    />
                  </div>
                ))}

                <div className="flex justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingId(null);
                    }}
                    disabled={submitting}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-stone-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-[#4338ca] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3730a3] disabled:opacity-50"
                  >
                    {submitting
                      ? "Saving..."
                      : editingId !== null
                        ? "Save Changes"
                        : `Create ${activeModule.singularTitle}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && activeModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#15110f] p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-white">
                Delete {activeModule.singularTitle}?
              </h2>
              <p className="mt-2 text-xs text-stone-300">
                Are you sure you want to delete record{" "}
                <span className="font-mono font-semibold text-white">
                  #{getRecordId(deleteTarget) ?? "selected"}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-stone-200 hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}