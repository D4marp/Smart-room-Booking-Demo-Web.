const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

function buildUrl(path, query) {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function request(path, { method = 'GET', token, body, query } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const apiError = payload?.error || payload?.message;
  if (!response.ok || payload?.success === false) {
    const error = new Error(apiError || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload?.data;
}

export function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function getMe(token) {
  return request('/api/auth/me', { token });
}

export function getStats(token) {
  return request('/api/admin/stats', { token });
}

export function getFeedbackStats(token, filters = {}) {
  return request('/api/feedbacks/stats', { token, query: filters });
}

export function getAdminBookings(token, filters = {}) {
  return request('/api/admin/bookings', { token, query: filters });
}

export function listRooms(filters = {}) {
  return request('/api/rooms', { query: filters });
}

export function listFacilities() {
  return request('/api/facilities');
}

export function createFacility(token, name) {
  return request('/api/facilities', {
    method: 'POST',
    token,
    body: { name },
  });
}

export function updateFacility(token, facilityId, name) {
  return request(`/api/facilities/${facilityId}`, {
    method: 'PUT',
    token,
    body: { name },
  });
}

export function deleteFacility(token, facilityId) {
  return request(`/api/facilities/${facilityId}`, {
    method: 'DELETE',
    token,
  });
}

export function createBooking(token, payload) {
  return request('/api/bookings', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function approveBooking(token, id, payload = {}) {
  return request(`/api/bookings/${id}/approve`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export function rejectBooking(token, id, reason) {
  return request(`/api/bookings/${id}/reject`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export function completeBooking(token, id) {
  return request(`/api/bookings/${id}/complete`, {
    method: 'PATCH',
    token,
  });
}

export function cancelBooking(token, id) {
  return request(`/api/bookings/${id}/cancel`, {
    method: 'PATCH',
    token,
  });
}

export function listUsers(token, filters = {}) {
  return request('/api/admin/users', { token, query: filters });
}

export function createUser(token, payload) {
  return request('/api/admin/users', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function changeUserRole(token, userId, role) {
  return request(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    token,
    body: { role },
  });
}

export function deleteUser(token, userId) {
  return request(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export function createRoom(token, payload) {
  return request('/api/rooms', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateRoom(token, roomId, payload) {
  return request(`/api/rooms/${roomId}`, {
    method: 'PUT',
    token,
    body: payload,
  });
}

export function deleteRoom(token, roomId) {
  return request(`/api/rooms/${roomId}`, {
    method: 'DELETE',
    token,
  });
}

export async function uploadRoomImage(token, roomId, file) {
  const formData = new FormData();
  formData.append('image', file);
  const url = new URL(`/api/rooms/${roomId}/images`, API_BASE_URL).toString();
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Upload failed with status ${response.status}`);
  }
  return payload?.data;
}

export async function deleteRoomImage(token, roomId, imageUrl) {
  const url = new URL(`/api/rooms/${roomId}/images`, API_BASE_URL).toString();
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageUrl }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Delete failed with status ${response.status}`);
  }
  return payload?.data;
}
