import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { WASTE_COLUMNS, MONTHS, daysInMonth, type WasteKey } from '../lib/waste-types';
import { Leaf, LogOut, Save, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type RecordsMap = Record<number, Partial<Record<WasteKey, number>>>;

export default function Dashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<RecordsMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchInstitution = async () => {
      try {
        const q = query(collection(db, 'institutions'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          setInstitution({ id: docData.id, ...docData.data() });
        }
      } catch (error) {
        console.error('Error fetching institution:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitution();
  }, [user]);

  useEffect(() => {
    if (!institution?.id) return;

    const fetchRecords = async () => {
      try {
        const q = query(
          collection(db, 'institutions', institution.id, 'wasteRecords'),
          where('year', '==', year),
          where('month', '==', month)
        );
        
        const snapshot = await getDocs(q);
        const map: RecordsMap = {};
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          map[data.day] = {
            aprovechablesOrganicos: Number(data.aprovechablesOrganicos ?? 0),
            aprovechables: Number(data.aprovechables ?? 0),
            noAprovechables: Number(data.noAprovechables ?? 0),
            biosanitarios: Number(data.biosanitarios ?? 0),
            anatomopatologicos: Number(data.anatomopatologicos ?? 0),
            cortopunzantes: Number(data.cortopunzantes ?? 0),
            deAnimales: Number(data.deAnimales ?? 0),
            farmacos: Number(data.farmacos ?? 0),
          };
        });
        
        setRecords(map);
      } catch (error) {
        console.error('Error fetching records:', error);
      }
    };

    fetchRecords();
  }, [institution?.id, year, month]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleChange = (day: number, key: WasteKey, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num) || num < 0) return;
    
    setRecords((prev) => ({
      ...prev,
      [day]: { ...prev[day], [key]: num }
    }));
  };

  const saveDay = async (day: number) => {
    if (!institution?.id) return;
    
    setSaving(true);
    try {
      const row = records[day] ?? {};
      const recordId = `${year}-${month}-${day}`;
      
      await setDoc(doc(db, 'institutions', institution.id, 'wasteRecords', recordId), {
        year,
        month,
        day,
        aprovechablesOrganicos: Number(row.aprovechablesOrganicos ?? 0),
        aprovechables: Number(row.aprovechables ?? 0),
        noAprovechables: Number(row.noAprovechables ?? 0),
        biosanitarios: Number(row.biosanitarios ?? 0),
        anatomopatologicos: Number(row.anatomopatologicos ?? 0),
        cortopunzantes: Number(row.cortopunzantes ?? 0),
        deAnimales: Number(row.deAnimales ?? 0),
        farmacos: Number(row.farmacos ?? 0),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      toast.success(`Día ${day} guardado`);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const days = daysInMonth(year, month);

  const totals = WASTE_COLUMNS.reduce((acc, col) => {
    acc[col.key] = Object.values(records).reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const totalNoPeligrosos = WASTE_COLUMNS.filter(c => c.group === 'no_peligrosos').reduce((s, c) => s + totals[c.key], 0);
  const totalInfecciosos = WASTE_COLUMNS.filter(c => c.group === 'infecciosos').reduce((s, c) => s + totals[c.key], 0);
  const totalFarmacos = totals['farmacos'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
                <Leaf className="h-5 w-5 text-green-600" />
              </div>
              <span className="font-semibold">EcoResiduos</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </header>
        <main className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Sin institución asignada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">El administrador aún no ha vinculado una institución a tu cuenta.</p>
            </CardContent>
          </Card>
        </main>
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
            <span className="font-semibold">EcoResiduos</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos de la institución</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={institution.name || ''} readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Dirección</label>
              <Input value={institution.address || ''} readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Teléfono</label>
              <Input value={institution.phone || ''} readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Responsable</label>
              <Input value={institution.responsiblePerson || ''} readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-lg">Registro mensual de residuos</CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className="p-2 border bg-gray-100 text-left">Día</th>
                    <th colSpan={3} className="p-2 border text-center bg-green-50">NO PELIGROSOS</th>
                    <th colSpan={4} className="p-2 border text-center bg-yellow-50">INFECCIOSOS</th>
                    <th className="p-2 border text-center bg-red-50">QUÍMICOS</th>
                    <th rowSpan={2} className="p-2 border bg-gray-100">Acción</th>
                  </tr>
                  <tr>
                    {WASTE_COLUMNS.map((c) => (
                      <th key={c.key} className="p-2 border bg-gray-50 text-center font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: days }, (_, i) => i + 1).map((day) => (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="p-1 border font-medium text-center">{day}</td>
                      {WASTE_COLUMNS.map((c) => (
                        <td key={c.key} className="p-1 border">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={records[day]?.[c.key] ?? ''}
                            onChange={(e) => handleChange(day, c.key, e.target.value)}
                            className="h-7 text-xs px-1"
                          />
                        </td>
                      ))}
                      <td className="p-1 border text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveDay(day)}
                          disabled={saving}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-green-50">
                    <td className="p-2 border text-center">TOTAL</td>
                    {WASTE_COLUMNS.map((c) => (
                      <td key={c.key} className="p-2 border text-center">{totals[c.key].toFixed(2)}</td>
                    ))}
                    <td className="border" />
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex gap-4 text-sm">
              <span className="font-medium">No peligrosos: {totalNoPeligrosos.toFixed(2)} Kg</span>
              <span className="font-medium">Infecciosos: {totalInfecciosos.toFixed(2)} Kg</span>
              <span className="font-medium">Fármacos: {totalFarmacos.toFixed(2)} Kg</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}