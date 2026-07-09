import { createContext, useEffect, useState } from "react";
import axios from "../utils/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const login = async (loginData) => {
        const response = await axios.post("/dashboard/login", loginData);
        const { token, admin, user: u } = response.data;
        const adminUser = admin || u;

        localStorage.setItem("token", token);
        setToken(token);
        setUser(adminUser);

        return response.data;
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
    };

    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem("token");
            if (!savedToken) { setLoading(false); return; }

            const fetchMe = () => axios.get("/dashboard/me");

            try {
                let res;
                try {
                    res = await fetchMe();
                } catch (err) {
                    // One retry for transient failures (network blip, timeout) before
                    // giving up — avoids bouncing a validly-logged-in admin over a
                    // single dropped request.
                    if (err.response?.status === 401 || err.response?.status === 403) throw err;
                    await new Promise(r => setTimeout(r, 800));
                    res = await fetchMe();
                }
                setUser(res.data.user);
                setToken(savedToken);
            } catch (err) {
                // Only a genuine auth failure (invalid/expired token) should sign the
                // admin out — a network blip or transient server error must not wipe
                // it, since "token" is shared across same-origin tabs.
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    setUser(null);
                    setToken(null);
                } else {
                    setToken(savedToken);
                }
            }

            setLoading(false);
        };

        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
