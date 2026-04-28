// Helper to check if user is admin
async function checkIsAdmin(context) {
  if (!context.auth) return false;
  
  // Try from token claim first
  if (context.auth.token.role === 'admin') return true;
  
  // Fallback: check Firestore
  const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  return userDoc.exists && userDoc.data().role === 'admin';
}

// Crear cliente (admin crea usuario + institución)
exports.createClient = functions.https.onCall(async (data, context) => {
  // Verificar que es admin
  if (!(await checkIsAdmin(context))) {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden crear clientes');
  }

  const { email, password, fullName, institutionName, address, phone, responsiblePerson } = data;

  // Validar datos
  if (!email || !password || !institutionName || !fullName) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
  }

  try {
    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    // Set custom claims para el nuevo cliente (opcional pero recomendado)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'client' });

    // Crear documento de usuario
    await db.collection('users').doc(userRecord.uid).set({
      email,
      fullName,
      role: 'client',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Crear institución
    const institutionRef = db.collection('institutions').doc();
    await institutionRef.set({
      userId: userRecord.uid,
      name: institutionName,
      address: address || '',
      phone: phone || '',
      responsiblePerson: responsiblePerson || '',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, userId: userRecord.uid };
  } catch (error) {
    console.error('Error creating client:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Bootstrap - crear admin inicial
exports.bootstrap = functions.https.onCall(async (data, context) => {
  const { adminEmail, adminPassword, adminName } = data;

  try {
    // Verificar si ya hay admin
    const usersSnapshot = await db.collection('users').where('role', '==', 'admin').limit(1).get();
    
    if (!usersSnapshot.empty) {
      return { success: false, message: 'Ya existe un admin' };
    }

    // Crear usuario admin
    const userRecord = await admin.auth().createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: adminName,
    });

    // Set custom claims para rol admin
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

    // Crear documento de usuario
    await db.collection('users').doc(userRecord.uid).set({
      email: adminEmail,
      fullName: adminName,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, adminId: userRecord.uid };
  } catch (error) {
    console.error('Error bootstrap:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Set role - cambiar rol de usuario
exports.setUserRole = functions.https.onCall(async (data, context) => {
  if (!(await checkIsAdmin(context))) {
    throw new functions.https.HttpsError('permission-denied', 'Solo admins pueden cambiar roles');
  }

  const { userId, role } = data;

  try {
    await admin.auth().setCustomUserClaims(userId, { role });
    await db.collection('users').doc(userId).update({ role });
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Integers de Firestore
exports.onUserCreate = functions.firestore.document('users/{userId}')
  .onCreate(async (snap, context) => {
    console.log('User created:', context.params.userId);
  });