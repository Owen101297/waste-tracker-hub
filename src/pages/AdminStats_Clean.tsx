import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { WASTE_COLUMNS, MONTHS } from '../lib/waste-types';
import * as XLSX from 'xlsx';
import { Leaf, LogOut, ArrowLeft, Loader2, Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';

export default function AdminStats() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const institutionsSnap = await getDocs(collection(db, 'institutions'));
        const instList: any[] = [];
        const allRecords: any[] = [];
        
        for (const instDoc of institutionsSnap.docs) {
          instList.push({ id: instDoc.id, ...instDoc.data() });
          const recordsSnap = await getDocs(
            collection(db, 'institutions', instDoc.id, 'wasteRecords')
          );
          recordsSnap.forEach((doc) => {
            allRecords.push({ ...doc.data(), institutionId: instDoc.id });
          });
        }
        
        setInstitutions(instList);
        setData(allRecords);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleExportExcel = async () => {
    if (data.length === 0) return;
    setExporting(true);
    try {
      const rows: any[] = [];
      const yearNow = new Date().getFullYear();
      
      institutions.forEach((inst) => {
        const instRecords = data.filter((r) => r.institutionId === inst.id);
        const totals: Record<string, number> = {};
        WASTE_COLUMNS.forEach((c) => (totals[c.key] = 0));
        
        instRecords.forEach((r) => {
          WASTE_COLUMNS.forEach((c) => {
            totals[c.key] += Number(r[c.key] ?? 0);
          });
        });

        const row: any = {
          'Institución': inst.name,
          'Responsable': inst.responsiblePerson || '',
          'Teléfono': inst.phone || '',
          'Total Registros': instRecords.length,
        };
        WASTE_COLUMNS.forEach((c) => {
          row[c.label] = totals[c.key];
        });
        rows.push(row);
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Resumen Global');
      XLSX.writeFile(wb, `residuos_resumen_global_${yearNow}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const totalsByType = WASTE_COLUMNS.map((c) => ({
    name: c.label.split(' ')[0],
    kg: data.reduce((s, r) => s + Number(r[c.key] ?? 0), 0),
  }));

  const yearNow = new Date().getFullYear();
  const monthly = MONTHS.map((m, i) => {
    const total = data
      .filter((r) => r.year === yearNow && r.month === i + 1)
      .reduce(
        (s, r) =>
          s +
          WASTE_COLUMNS.reduce(
            (a, c) => a + Number(r[c.key] ?? 0),
            0
          ),
        0
      );
    return { mes: m.slice(0, 3), kg: Number(total.toFixed(2)) };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <span className="font-semibold">EcoResiduos - Stats</span>
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
          <h1 className="text-2xl font-bold">Estadísticas globales</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting || data.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Totales por tipo de residuo (Kg)</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalsByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
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
              <CardTitle>Residuos por mes ({yearNow})</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="kg"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {institutions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cumplimiento por institución</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-2">Institución</th>
                      <th className="p-2">Días con registro</th>
                      <th className="p-2">Meses activos</th>
                      <th className="p-2">Total Kg</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.map((inst) => {
                      const instRecords = data.filter(
                        (r) => r.institutionId === inst.id
        
