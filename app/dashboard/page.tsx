"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiClient } from "@/lib/api"; // adjust path if named "@/lib/apiClient"
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Customer {
  id?: number;
  customer_id?: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function CustomersPage() {
  const { isChecking } = useAuthGuard({ requireAuth: true });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // POST form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // PUT inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const getRecordId = (c: Customer): number => Number(c.id ?? c.customer_id);

  // 1. GET — Fetch all customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient<Customer[] | { data: Customer[] }>(
        CONFIG.ENDPOINTS.CUSTOMERS,
        {
          method: "GET",
          requiresAuth: true,
        }
      );
      const list = Array.isArray(response) ? response : response.data ?? [];
      setCustomers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isChecking) {
      fetchCustomers();
    }
  }, [isChecking]);

  // 2. POST — Create a new customer
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    try {
      setSubmitting(true);
      await apiClient<Customer>(CONFIG.ENDPOINTS.CUSTOMERS, {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });

      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setSuccessMessage("Customer created successfully.");
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (customer: Customer) => {
    setEditingId(getRecordId(customer));
    setEditForm({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setError(null);
    setSuccessMessage(null);
  };

  // 3. PUT — Update an existing customer
  const handleUpdate = async (id: number) => {
    setError(null);
    setSuccessMessage(null);

    try {
      setSubmitting(true);
      await apiClient<Customer>(`${CONFIG.ENDPOINTS.CUSTOMERS}/${id}`, {
        method: "PUT",
        requiresAuth: true,
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          address: editForm.address.trim(),
        }),
      });

      setEditingId(null);
      setSuccessMessage("Customer updated successfully.");
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update customer.");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. DELETE — Remove a customer
  const handleDelete = async (id: number) => {
    setError(null);
    setSuccessMessage(null);

    try {
      setDeletingId(id);
      await apiClient(`${CONFIG.ENDPOINTS.CUSTOMERS}/${id}`, {
        method: "DELETE",
        requiresAuth: true,
      });

      setSuccessMessage("Customer deleted successfully.");
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isChecking) return null;

  return (
    <div className="min-h-screen bg-[#1c1714] font-sans text-white">
      <header className="border-b border-white/10 bg-[#15110f]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Customers Management
            </h1>
            <p className="text-xs text-stone-400">
              Create, view, update, and delete customer records
            </p>
          </div>
          <Link
            href={CONFIG.ROUTES.DASHBOARD}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-stone-200 hover:bg-white/10"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            {successMessage}
          </div>
        )}

        {/* POST: Create Customer Form */}
        <Card className="border border-white/15 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-base">Add New Customer</CardTitle>
            <CardDescription className="text-xs text-stone-400">
              Submits a POST request to {CONFIG.ENDPOINTS.CUSTOMERS}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreate}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-lg border border-white/15 bg-[#15110f] px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#4338ca] focus:outline-none"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg border border-white/15 bg-[#15110f] px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#4338ca] focus:outline-none"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#15110f] px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#4338ca] focus:outline-none"
              />
              <input
                type="text"
                placeholder="Delivery Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#15110f] px-3 py-2 text-xs text-white placeholder:text-stone-500 focus:border-[#4338ca] focus:outline-none"
              />
              <div className="sm:col-span-2 lg:col-span-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-[#4338ca] px-6 text-xs font-semibold text-white hover:bg-[#3730a3]"
                >
                  {submitting ? "Saving..." : "Create Customer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* GET / PUT / DELETE: Customer Records List */}
        <Card className="border border-white/15 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-base">
              Customer Records ({customers.length})
            </CardTitle>
            <CardDescription className="text-xs text-stone-400">
              Loaded via GET; edit inline (PUT) or remove (DELETE)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-xs text-stone-400">Loading customers...</p>
            ) : customers.length === 0 ? (
              <p className="text-xs text-stone-400">
                No customers found. Add one using the form above.
              </p>
            ) : (
              <div className="space-y-3">
                {customers.map((customer) => {
                  const id = getRecordId(customer);
                  const isEditing = editingId === id;

                  return (
                    <div
                      key={id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-[#15110f] p-4 md:flex-row md:items-center"
                    >
                      {isEditing ? (
                        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            className="rounded border border-white/20 bg-[#1c1714] px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({ ...editForm, email: e.target.value })
                            }
                            className="rounded border border-white/20 bg-[#1c1714] px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm({ ...editForm, phone: e.target.value })
                            }
                            className="rounded border border-white/20 bg-[#1c1714] px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={editForm.address}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                address: e.target.value,
                              })
                            }
                            className="rounded border border-white/20 bg-[#1c1714] px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{customer.name}</p>
                          <p className="text-xs text-stone-300">
                            {customer.email}
                            {customer.phone ? ` · ${customer.phone}` : ""}
                          </p>
                          {customer.address && (
                            <p className="text-xs text-stone-400">
                              {customer.address}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex shrink-0 items-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleUpdate(id)}
                              className="bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500"
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="bg-white/10 px-3 text-xs text-stone-200 hover:bg-white/20"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              onClick={() => startEditing(customer)}
                              className="bg-[#4338ca] px-3 text-xs text-white hover:bg-[#3730a3]"
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              disabled={deletingId === id}
                              onClick={() => handleDelete(id)}
                              className="bg-red-600/80 px-3 text-xs text-white hover:bg-red-600"
                            >
                              {deletingId === id ? "Deleting..." : "Delete"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}