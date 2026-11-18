"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard"; // [Reconstructed]
import { clearTokens } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, Eye, Loader2, LogOut, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

interface Position {
  position_id: number;
  position_code: string;
  position_name: string;
  created_at?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard();

  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states (shared for Create and Update)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [positionCode, setPositionCode] = useState("");
  const [positionName, setPositionName] = useState("");

  // GET all positions
  const fetchPositions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiClient<Position[]>(CONFIG.ENDPOINTS.POSITIONS, {
        method: "GET",
        requiresAuth: true,
      });
      setPositions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch positions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isChecking) {
      fetchPositions();
    }
  }, [isChecking, fetchPositions]);

  // GET single position by ID
  const fetchSinglePosition = async (positionId: number) => {
    setError("");
    try {
      const data = await apiClient<Position>(
        `${CONFIG.ENDPOINTS.POSITIONS}/${positionId}`,
        {
          method: "GET",
          requiresAuth: true,
        }
      );
      setSelectedPosition(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch position details.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setPositionCode("");
    setPositionName("");
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setPositionCode("");
    setPositionName("");
    setSelectedPosition(null);
    setError("");
    setSuccess("");
    setIsFormOpen(true);
  };

  const openEditForm = (position: Position) => {
    setEditingId(position.position_id);
    setPositionCode(position.position_code);
    setPositionName(position.position_name);
    setSelectedPosition(null);
    setError("");
    setSuccess("");
    setIsFormOpen(true);
  };

  // CREATE (POST /positions) or UPDATE (PUT /positions/:id)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (editingId !== null) {
        await apiClient(`${CONFIG.ENDPOINTS.POSITIONS}/${editingId}`, {
          method: "PUT", // [Reconstructed: could be PATCH depending on backend]
          requiresAuth: true,
          body: JSON.stringify({
            position_code: positionCode,
            position_name: positionName,
          }),
        });
        setSuccess("Position updated successfully.");
      } else {
        await apiClient(CONFIG.ENDPOINTS.POSITIONS, {
          method: "POST",
          requiresAuth: true,
          body: JSON.stringify({
            position_code: positionCode,
            position_name: positionName,
          }),
        });
        setSuccess("Position created successfully.");
      }

      resetForm();
      await fetchPositions();
    } catch (err: any) {
      setError(err.message || "Failed to save position.");
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE (/positions/:id)
  const handleDelete = async (positionId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this position?"
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await apiClient(`${CONFIG.ENDPOINTS.POSITIONS}/${positionId}`, {
        method: "DELETE",
        requiresAuth: true,
      });
      setSuccess("Position deleted successfully.");
      if (selectedPosition?.position_id === positionId) {
        setSelectedPosition(null);
      }
      await fetchPositions();
    } catch (err: any) {
      setError(err.message || "Failed to delete position.");
    }
  };

  const handleLogout = () => {
    clearTokens();
    router.push(CONFIG.ROUTES.LOGIN);
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage organization positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateForm}>
            <Plus className="mr-2 h-4 w-4" />
            New Position
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          <Check className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Create / Update Form */}
      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId !== null ? "Edit Position" : "Create Position"}
            </CardTitle>
            <CardDescription>
              {editingId !== null
                ? `Updating position #${editingId}`
                : "Add a new position to the system."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position_code">Position Code</Label>
                  <Input
                    id="position_code"
                    placeholder="PRES"
                    value={positionCode}
                    onChange={(e) => setPositionCode(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position_name">Position Name</Label>
                  <Input
                    id="position_name"
                    placeholder="President"
                    value={positionName}
                    onChange={(e) => setPositionName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingId !== null ? "Update Position" : "Create Position"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Single Position Detail View */}
      {selectedPosition && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Position Details</CardTitle>
              <CardDescription>
                Fetched directly from GET {CONFIG.ENDPOINTS.POSITIONS}/
                {selectedPosition.position_id}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPosition(null)}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <strong>ID:</strong> {selectedPosition.position_id}
            </p>
            <p>
              <strong>Code:</strong> {selectedPosition.position_code}
            </p>
            <p>
              <strong>Name:</strong> {selectedPosition.position_name}
            </p>
            {selectedPosition.created_at && (
              <p>
                <strong>Created At:</strong>{" "}
                {new Date(selectedPosition.created_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Positions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Positions</CardTitle>
            <CardDescription>
              A list of all positions (Fetched directly from GET{" "}
              {CONFIG.ENDPOINTS.POSITIONS})
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPositions}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading positions...
                  </TableCell>
                </TableRow>
              ) : positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No positions found.
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((pos) => (
                  <TableRow key={pos.position_id}>
                    <TableCell className="font-medium">
                      {pos.position_id}
                    </TableCell>
                    <TableCell>{pos.position_code}</TableCell>
                    <TableCell>{pos.position_name}</TableCell>
                    <TableCell>
                      {pos.created_at
                        ? new Date(pos.created_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchSinglePosition(pos.position_id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditForm(pos)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(pos.position_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}