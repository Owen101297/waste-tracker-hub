import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Leaf, LogOut, ArrowLeft, Loader2, Shield, UserX, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUserManagement() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const userList: any[] = [];
      snapshot.forEach((doc) => {
        userList.push({ uid: doc.id, ...doc.data() });
      });
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const setUserRole = httpsCallable(functions, 'setUserRole');
      await setUserRole({ userId, role: newRole });
      toast.success(`Rol actualizado a ${newRole}`);
      loadUsers();
    } catch (error: any) {
      console.error('Error changing role:', error);
      toast.error(error.message || 'Error al cambiar rol');
    } finally {
      setUpdating(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`¿Enviar correo de recuperación a ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Correo de recuperación enviado a ${email}`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Error al enviar correo');
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(searchLower) ||
      u.fullName?.toLowerCase().includes(searchLower) ||
      u.role?.toLowerCase().includes(searchLower)
    );
  });

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
            <span className="font-semibold">EcoResiduos - Usuarios</span>
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
            <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-500">Administra roles y accesos de usuarios</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <Input
          placeholder="Buscar por email, nombre o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Usuarios</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{users.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Admins</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Clientes</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {users.filter(u => u.role === 'client').length}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Rol</th>
                    <th className="p-2">Creado</th>
                    <th className="p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{u.fullName || '-'}</td>
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role || 'Sin rol'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {u.createdAt ? new Date(u.createdAt.toDate ? u.createdAt.toDate() : u.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <select
                            value={u.role || 'client'}
                            onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                            disabled={updating === u.uid || u.uid === user?.uid}
                            className="text-xs px-2 py-1 border rounded"
                          >
                            <option value="client">Cliente</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResetPassword(u.email)}
                            title="Resetear contraseña"
                          >
                            <Shield className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-500">
                        No se encontraron usuarios.
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
