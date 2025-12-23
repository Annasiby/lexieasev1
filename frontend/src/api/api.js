export const apiFetch = (url, options = {}) => {
  return fetch(`http://localhost:5001${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  }).then((res) => res.json());
};
