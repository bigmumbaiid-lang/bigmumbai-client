import axios from "axios";

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config.url || '';
    const isLoginPage = url.includes("/login");
    const isPasswordCheck = url.includes("/transfer-balance") || url.includes("/db/import");
    if (error.response?.status === 401 && !isLoginPage && !isPasswordCheck) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default instance;
