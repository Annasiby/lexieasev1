export const apiFetch = (url, options = {}) => {
  const isFormData = options?.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  return fetch(`http://localhost:5001${url}`, {
    credentials: "include",
    headers,
    ...options,
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || data?.error || "Request failed");
    }
    return data;
  });
};
