import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { WasteMonthGrid, type RecordsMap } from "@/components/WasteMonthGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS } from "@/lib/waste-types";
import { exportToPDF, exportToExcel } from "@/lib/export-utils";
import { Download, FileSpreadsheet, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, role, loading } = useAuth();
  const [institution, setInstitution] = useState<any>(null);
  const [loadingInst, setLoadingInst] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<RecordsMap>({});
  const [savingHeader, setSavingHeader] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("institutions").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setInstitution(data);
      setLoadingInst(false);
    });
  }, [user]);

  if (loading || loadingInst) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (role === "admin") return <Navigate to="/admin" />;

  if (!institution) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader><CardTitle>Sin institución asignada</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">El administrador aún no ha vinculado una institución a tu cuenta. Contáctalo para activar tu acceso.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const updateInstitution = (field: string, value: string) => setInstitution({ ...institution, [field]: value });

  const saveHeader = async () => {
    setSavingHeader(true);
    const { error } = await supabase.from("institutions").update({
      name: institution.name,
      address: institution.address,
      phone: institution.phone,
      responsible_person: institution.responsible_person,
    }).eq("id", institution.id);
    setSavingHeader(false);
    if (error) toast.error(error.message); else toast.success("Datos actualizados");
  };

  const handleExportPDF = () => exportToPDF({ institution, year, month, records });
  const handleExportExcel = () => exportToExcel({ institution, year, month, records });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la institución</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nombre de la institución</Label><Input value={institution.name ?? ""} onChange={(e) => updateInstitution("name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={institution.address ?? ""} onChange={(e) => updateInstitution("address", e.target.value)} /></div>
            <div className="space-y-2"><Label>Celular</Label><Input value={institution.phone ?? ""} onChange={(e) => updateInstitution("phone", e.target.value)} /></div>
            <div className="space-y-2"><Label>Persona responsable</Label><Input value={institution.responsible_person ?? ""} onChange={(e) => updateInstitution("responsible_person", e.target.value)} /></div>
            <div className="md:col-span-2"><Button onClick={saveHeader} disabled={savingHeader}>{savingHeader ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Guardar datos</Button></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle>Registro mensual de residuos</CardTitle>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1"><Label className="text-xs">Mes</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Año</Label>
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24" />
              </div>
              <Button variant="outline" onClick={handleExportPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
              <Button variant="outline" onClick={handleExportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
            </div>
          </CardHeader>
          <CardContent>
            <WasteMonthGrid institutionId={institution.id} year={year} month={month} onLoaded={setRecords} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}