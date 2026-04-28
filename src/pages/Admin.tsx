import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, query, orderBy, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Leaf, LogOut, Plus, BarChart3, Users, Trash2, Loader2, Power, Pencil, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function Admin() {
  console.log('[Admin] Rendering');
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    institutionName: '',
    address: '',
    phone: '',
    responsiblePerson: ''
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editingInst, setEditingInst] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    phone: '',
    responsiblePerson: ''
  });
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [inactiveAlerts, setInactiveAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      const q = query(collection(db, 'institutions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setInstitutions(list);
      
      // Check for inactive institutions (no records in last 7 days)
      checkInactiveAlerts(list);
    } catch (error) {
      console.error('Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkInactiveAlerts = async (insts: any[]) => {
    const alerts: any[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const inst of insts) {
      try {
        const recordsSnap = await getDocs(collection(db, 'institutions', inst.id, 'wasteRecords'));
        let hasRecent = false;
        recordsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.year && data.month && data.day) {
            const recordDate = new Date(data.year, data.month - 1, data.day);
            if (recordDate >= sevenDaysAgo) {
              hasRecent = true;
            }
          }
        });
        if (!hasRecent && inst.isActive) {
          alerts.push(inst);
        }
      } catch (error) {
        console.error(`Error checking ${inst.name}:`, error);
      }
    }
    setInactiveAlerts(alerts);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Configuración para instancia secundaria
    const firebaseConfig = {
      apiKey: "AIzaSyBhQi4chNLrS3ITIADiDFUPyGf72Sao9BI",
      authDomain: "milan-store-e3eb2.firebaseapp.com",
      projectId: "milan-store-e3eb2",
      storageBucket: "milan-store-e3eb2.firebasestorage.app",
      messagingSenderId: "974131508802",
      appId: "1:974131508802:web:fa3b9836c71891c1d71fdb"
    };

    try {
      // 1. Crear instancia secundaria para no cerrar sesión del admin
      const secondaryApp = initializeApp(firebaseConfig, "secondary");
      const secondaryAuth = getAuth(secondaryApp);
      
      // 2. Crear usuario
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, form.email, form.password);
      const newUser = userCredential.user;
      
      // 3. Actualizar perfil
      await updateProfile(newUser, { displayName: form.fullName });
      
      // 4. Guardar en Firestore (usando la instancia principal de DB)
      await setDoc(doc(db, "users", newUser.uid), {
        email: form.email,
        fullName: form.fullName,
        role: "client",
        createdAt: serverTimestamp(),
      });
      
      await setDoc(doc(db, "institutions", doc(collection(db, "institutions")).id), {
        userId: newUser.uid,
        name: form.institutionName,
        address: form.address || '',
        phone: form.phone || '',
        responsiblePerson: form.responsiblePerson || '',
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // 5. Limpiar y cerrar
      toast.success('Institución creada exitosamente');
      setOpen(false);
      setForm({
        email: '',
        password: '',
        fullName: '',
        institutionName: '',
        address: '',
        phone: '',
        responsiblePerson: ''
      });
      loadInstitutions();
    } catch (error: any) {
      console.error('Error creating:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este correo ya está registrado en el sistema');
      } else {
        toast.error(error.message || 'Error al crear institución');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (inst: any) => {
    try {
      await updateDoc(doc(db, 'institutions', inst.id), {
        isActive: !inst.isActive,
        updatedAt: new Date().toISOString(),
      });
      toast.success(inst.isActive ? 'Institución desactivada' : 'Institución activada');
      loadInstitutions();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const openEdit = (inst: any) => {
    setEditingInst(inst);
    setEditForm({
      name: inst.name || '',
      address: inst.address || '',
      phone: inst.phone || '',
      responsiblePerson: inst.responsiblePerson || ''
    });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInst) return;
    setEditSubmitting(true);
    try {
      await updateDoc(doc(db, 'institutions', editingInst.id), {
        name: editForm.name,
        address: editForm.address,
        phone: editForm.phone,
        responsiblePerson: editForm.responsiblePerson,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Institución actualizada');
      setEditOpen(false);
      setEditingInst(null);
      loadInstitutions();
    } catch (error) {
      toast.error('Error al actualizar');
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const matchesSearch = search === '' || 
      inst.name?.toLowerCase().includes(search.toLowerCase()) ||
      inst.responsiblePerson?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterActive === 'all' || 
      (filterActive === 'active' && inst.isActive) ||
      (filterActive === 'inactive' && !inst.isActive);
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta institución?')) return;
    
    try {
      await deleteDoc(doc(db, 'institutions', id));
      toast.success('Institución eliminada');
      loadInstitutions();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
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
            <span className="font-semibold">EcoResiduos - Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Panel administrador</h1>
            <p className="text-sm text-gray-500">Gestiona instituciones y consulta sus registros.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nueva institución</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear cliente / institución</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contraseña</label>
                    <Input type="text" required minLength={6} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Responsable</label>
                  <Input required value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Institución</label>
                  <Input required value={form.institutionName} onChange={(e) => setForm({...form, institutionName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cargo / Rol</label>
                    <Input value={form.responsiblePerson} onChange={(e) => setForm({...form, responsiblePerson: e.target.value})} placeholder="Ej: Rector, Administrador" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear
                  </Button>
                </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Editar institución</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEdit} className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Nombre</label>
                    <Input required value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Responsable</label>
                    <Input value={editForm.responsiblePerson} onChange={(e) => setEditForm({...editForm, responsiblePerson: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Teléfono</label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Dirección</label>
                      <Input value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditingInst(null); }}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={editSubmitting}>
                      {editSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Guardar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Instituciones</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{institutions.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Activas</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{institutions.filter(i => i.isActive).length}</CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md"
            onClick={() => navigate('/admin/stats')}
          >
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-500">Gráficos por tipo de residuo</CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md"
            onClick={() => navigate('/admin/users')}
          >
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-500">Gestionar roles y accesos</CardContent>
          </Card>
        </div>

        {inactiveAlerts.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">⚠️ Alertas de Inactividad</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-yellow-700 mb-3">
                Las siguientes instituciones no han registrado residuos en los últimos 7 días:
              </p>
              <ul className="space-y-1">
                {inactiveAlerts.map((inst) => (
                  <li key={inst.id} className="text-sm text-yellow-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
                    <button
                      onClick={() => navigate(`/admin/institution/${inst.id}`)}
                      className="hover:underline"
                    >
                      {inst.name}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Buscar por nombre o responsable..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instituciones registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Responsable</th>
                    <th className="p-2">Celular</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstitutions.map((inst) => (
                    <tr key={inst.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">
                        <button
                          onClick={() => navigate(`/admin/institution/${inst.id}`)}
                          className="text-left hover:text-green-600 hover:underline"
                        >
                          {inst.name}
                        </button>
                      </td>
                      <td className="p-2">{inst.responsiblePerson || '-'}</td>
                      <td className="p-2">{inst.phone || '-'}</td>
                      <td className="p-2">
                        <Badge variant={inst.isActive ? 'default' : 'secondary'}>
                          {inst.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => openEdit(inst)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => toggleActive(inst)}
                            title={inst.isActive ? 'Desactivar' : 'Activar'}
                          >
                            <Power className={`h-4 w-4 ${inst.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(inst.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInstitutions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500">
                        No se encontraron instituciones.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}