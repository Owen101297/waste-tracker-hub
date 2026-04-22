import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, BarChart3, Users, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, role, loading, session } = useAuth();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", institution_name: "", address: "", phone: "", responsible_person: "" });

  const loadList = async () => {
    setLoadingList(true);
    const { data } = await supabase.from("institutions").select("*").order("created_at", { ascending: false });
    setInstitutions(data ?? []);
    setLoadingList(false);
  };

  useEffect(() => { if (role === "admin") loadList(); }, [role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (role !== "admin") return <Navigate to="/dashboard" />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/admin/create-client", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error("Error: " + (err.error ?? res.statusText));
      return;
    }
    toast.success("Cliente creado");
    setOpen(false);
    setForm({ email: "", password: "", full_name: "", institution_name: "", address: "", phone: "", responsible_person: "" });
    loadList();
  };

  const toggleActive = async (inst: any) => {
    await supabase.from("institutions").update({ is_active: !inst.is_active }).eq("id", inst.id);
    loadList();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Panel administrador</h1>
            <p className="text-sm text-muted-foreground">Gestiona instituciones y consulta sus registros.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nueva institución</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Crear cliente / institución</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email de acceso</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Contraseña</Label><Input type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                </div>
                <div><Label>Nombre del responsable</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Nombre de la institución</Label><Input required value={form.institution_name} onChange={(e) => setForm({ ...form, institution_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div><Label>Celular</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div><Label>Persona responsable (en formato)</Label><Input value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Crear</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="flex-row items-center gap-3 pb-2"><Users className="h-5 w-5 text-primary" /><CardTitle className="text-base">Instituciones</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{institutions.length}</CardContent></Card>
          <Card><CardHeader className="flex-row items-center gap-3 pb-2"><Users className="h-5 w-5 text-primary" /><CardTitle className="text-base">Activas</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{institutions.filter(i => i.is_active).length}</CardContent></Card>
          <Link to="/admin/stats"><Card className="hover:shadow-md transition cursor-pointer h-full"><CardHeader className="flex-row items-center gap-3 pb-2"><BarChart3 className="h-5 w-5 text-primary" /><CardTitle className="text-base">Ver estadísticas globales</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Gráficos por tipo de residuo</CardContent></Card></Link>
        </div>

        <Card>
          <CardHeader><CardTitle>Instituciones registradas</CardTitle></CardHeader>
          <CardContent>
            {loadingList ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left border-b"><th className="p-2">Nombre</th><th className="p-2">Responsable</th><th className="p-2">Celular</th><th className="p-2">Estado</th><th className="p-2">Acciones</th></tr></thead>
                  <tbody>
                    {institutions.map((inst) => (
                      <tr key={inst.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{inst.name}</td>
                        <td className="p-2">{inst.responsible_person ?? "-"}</td>
                        <td className="p-2">{inst.phone ?? "-"}</td>
                        <td className="p-2"><Badge variant={inst.is_active ? "default" : "secondary"}>{inst.is_active ? "Activa" : "Inactiva"}</Badge></td>
                        <td className="p-2 flex gap-2">
                          <Link to="/admin/institution/$id" params={{ id: inst.id }}><Button size="sm" variant="outline"><Eye className="h-3 w-3 mr-1" />Ver</Button></Link>
                          <Button size="sm" variant="ghost" onClick={() => toggleActive(inst)}>{inst.is_active ? <Trash2 className="h-3 w-3" /> : "Activar"}</Button>
                        </td>
                      </tr>
                    ))}
                    {institutions.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aún no hay instituciones. Crea la primera.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}