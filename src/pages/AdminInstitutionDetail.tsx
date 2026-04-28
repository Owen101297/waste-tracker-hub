import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { WASTE_COLUMNS, MONTHS } from '../lib/waste-types';
import { exportToPDF, exportToExcel } from '../lib/export-utils';
import { Leaf, LogOut, ArrowLeft, Loader2, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';

export default function AdminInstitutionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const instDoc = await getDoc(doc(db, 'institutions', id!));
      if (instDoc.exists()) {
        setInstitution({ id: instDoc.id, ...instDoc.data() });
      }
      const recordsSnap = await getDocs(collection(db, 'institutions', id!, 'wasteRecords'));
      const recs: any[] = [];
      recordsSnap.forEach((doc) => recs.push(doc.data()));
      setRecords(recs);
    } catch (error) {
      console.error('Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleExportPDF = async () => {
    if (!institution || records.length === 0) return;
    setExporting(true);
    try {
      const year = records[0]?.year || new Date().getFullYear();
      const month = records[0]?.month || new Date().getMonth() + 1;
      const recordsMap: Record<number, any> = {};
      records.forEach((r) => { recordsMap[r.day] = r; });
      exportToPDF({
        institution: {
          name: institution.name,
          address: institution.address,
          phone: institution.phone,
          responsible_person: institution.responsiblePerson,
        },
        year,
        month,
        records: recordsMap,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!institution || records.length === 0) return;
    setExporting(true);
    try {
      const year = records[0]?.year || new Date().getFullYear();
      const month = records[0]?.month || new Date().getMonth() + 1;
      const recordsMap: Record<number, any> = {};
      records.forEach((r) => { recordsMap[r.day] = r; });
      exportToExcel({
        institution: {
          name: institution.name,
          address: institution.address,
          phone: institution.phone,
          responsible_person: institution.responsiblePerson,
        },
        year,
        month,
        records: recordsMap,
      });
    } finally {
      setExporting(false);
    }
  };

  const totalsByType = WASTE_COLUMNS.map((c) => ({
    name: c.label.split(' ')[0],
    kg: records.reduce((s, r) => s + Number(r[c.key] ?? 0), 0),
  }));

  const monthlyData = MONTHS.map((m, i) => {
    const total = records
      .filter((r) => r.month === i + 1)
      .reduce((s, r) => s + WASTE_COLUMNS.reduce((a, c) => a + Number(r[c.key] ?? 0), 0), 0);
    return { mes: m.slice(0, 3), kg: Number(total.toFixed(2)) };
  });

  const pieData = totalsByType.filter((d) => d.kg > 0);
  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const uniqueDays = new Set(records.map((r) => `${r.year}-${r.month}-${r.day}`)).size;
  const totalMonths = new Set(records.map((r) => `${r.year}-${r.month}`)).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Institución no encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <span className="font-semibold">EcoResiduos - Detalle</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{institution.name}</h1>
            <p className="text-sm text-gray-500">
              {institution.responsiblePerson || 'Sin responsable'} • {institution.phone || 'Sin teléfono'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting || records.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting || records.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={institution.isActive ? 'default' : 'secondary'}>
                {institution.isActive ? 'Activa' : 'Inactiva'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Registros</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{records.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Días con registro</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{uniqueDays}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Meses activos</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{totalMonths}</CardContent>
          </Card>
        </div>

        {records.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Totales por tipo (Kg)</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={totalsByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="kg" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Residuos por mes</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="kg" stroke="#22c55e" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Distribución por tipo</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="kg"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry: any) => `${entry.name} ${((entry.percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No hay registros de residuos para esta institución.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Dirección:</strong> {institution.address || 'No registrada'}</p>
            <p><strong>Teléfono:</strong> {institution.phone || 'No registrado'}</p>
            <p><strong>Responsable:</strong> {institution.responsiblePerson || 'No registrado'}</p>
            <p><strong>Creado:</strong> {institution.createdAt ? new Date(institution.createdAt.toDate ? institution.createdAt.toDate() : institution.createdAt).toLocaleDateString() : 'N/A'}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
