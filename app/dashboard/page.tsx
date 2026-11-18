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

  // Per-module editable endpoint paths so you can test /api/... vs /... live
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

  const normalizePath = (path: string) =>
    path.startsWith("/") ? path.trim() : `/${path.trim()}`;

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
      const rawVal = formData[field.name] ?? "";
      payload[field.name] =
        field.type === "number" && rawVal !== "" ? Number(rawVal) : rawVal;
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