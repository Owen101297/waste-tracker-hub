import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS, WASTE_COLUMNS } from "@/lib/waste-types";
import { WasteMonthGrid, type RecordsMap } from "@/components/WasteMonthGrid";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { ArrowLeft, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/institution/$id")({ component: AdminInstitution });

function AdminInstitution() {
  const { id } = Route.useParams();
  const { user, role, loading } = useAuth();
  const [institution, setInstitution] = useState<any>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<RecordsMap>({});

  useEffect(() => {
    supabase.from("institutions").select("*").eq("id", id).maybeSingle().then(({ data }) => setInstitution(data));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (role !== "admin") return <Navigate to="/dashboard" />;
  if (!institution) return <div className="min-h-screen bg-background"><AppHeader /><div className="p-6">Cargando...</div></div>;

  const totals = WASTE_COLUMNS.map((c) => ({
    name: c.label.split(" ")[0],
    valor: Object.values(records).reduce((s, r) => s + Number(r[c.key] ?? 0), 0),
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <Link to="/admin" className="text-sm text-primary inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Volver</Link>
        <Card>
          <CardHeader>
            <CardTitle>{institution.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{institution.address} · {institution.phone} · Resp.: {institution.responsible_person}</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1"><Label className="text-xs">Mes</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Año</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" />
            </div>
            <Button variant="outline" onClick={() => exportToPDF({ institution, year, month, records })}><Download className="h-4 w-4 mr-2" />PDF</Button>
            <Button variant="outline" onClick={() => exportToExcel({ institution, year, month, records })}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Totales del mes (Kg)</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="valor" fill="oklch(0.48 0.14 150)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Detalle diario</CardTitle></CardHeader>
          <CardContent>
            <WasteMonthGrid institutionId={institution.id} year={year} month={month} onLoaded={setRecords} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}