import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { WASTE_COLUMNS, MONTHS } from "@/lib/waste-types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LineChart, Line } from "recharts";

export const Route = createFileRoute("/admin/stats")({ component: AdminStats });

function AdminStats() {
  const { user, role, loading } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    supabase.from("waste_records").select("*").then(({ data }) => {
      setData(data ?? []);
      setLoadingData(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (role !== "admin") return <Navigate to="/dashboard" />;

  // Totals por tipo (global)
  const totalsByType = WASTE_COLUMNS.map((c) => ({
    name: c.label.split(" ")[0],
    kg: data.reduce((s, r) => s + Number(r[c.key] ?? 0), 0),
  }));

  // Tendencia mensual (todos los tipos sumados) en el año actual
  const yearNow = new Date().getFullYear();
  const monthly = MONTHS.map((m, i) => {
    const total = data.filter((r) => r.year === yearNow && r.month === i + 1).reduce((s, r) => s + WASTE_COLUMNS.reduce((a, c) => a + Number(r[c.key] ?? 0), 0), 0);
    return { mes: m.slice(0, 3), kg: Number(total.toFixed(2)) };
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <Link to="/admin" className="text-sm text-primary inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Volver</Link>
        <h1 className="text-2xl font-bold">Estadísticas globales</h1>
        {loadingData ? <Loader2 className="h-6 w-6 animate-spin" /> : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Totales por tipo de residuo (Kg)</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer><BarChart data={totalsByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis /><Tooltip /><Legend />
                  <Bar dataKey="kg" fill="oklch(0.48 0.14 150)" />
                </BarChart></ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Residuos por mes ({yearNow})</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer><LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="kg" stroke="oklch(0.55 0.13 30)" strokeWidth={2} />
                </LineChart></ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}