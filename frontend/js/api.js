// ===========================================
// API Client - LUXE Store Backend
// ===========================================

const API_URL = 'http://localhost:5000/api';

async function getToken() {
  const { auth } = await import('./firebase-config.js');
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken();
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

export const api = {
  auth: {
    me: () => request('/auth/me'),
    updateProfile: (body) => request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },
  products: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/products${qs ? '?' + qs : ''}`);
    },
    getById: (id) => request(`/products/${id}`),
    getFeatured: () => request('/products/featured')
  },
  orders: {
    create: (body) => request('/orders', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
    getMyOrders: () => request('/orders/my'),
    getById: (id) => request(`/orders/${id}`),
    track: (trackingId) => request(`/orders/track/${trackingId}`),
    cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' })
  },
  admin: {
    getStats: () => request('/admin/stats'),
    addProduct: (body) => request('/admin/products', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
    updateProduct: (id, body) => request(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
    deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
    getAllOrders: () => request('/admin/orders'),
    updateOrderStatus: (id, body) => request(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
    getAllUsers: () => request('/admin/users'),
    updateUserRole: (uid, role) => request(`/admin/users/${uid}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    })
  }
};

// Auth helpers
export async function registerWithEmail(email, password, name) {
  const { auth, createUserWithEmailAndPassword, updateProfile } = await import('./firebase-config.js');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const { auth, signInWithEmailAndPassword } = await import('./firebase-config.js');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  const { auth, signOut } = await import('./firebase-config.js');
  await signOut(auth);
}

export async function getCurrentUser() {
  const { auth, onAuthStateChanged } = await import('./firebase-config.js');
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function requireLogin(redirect = 'login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirect;
    return null;
  }
  return user;
} 
