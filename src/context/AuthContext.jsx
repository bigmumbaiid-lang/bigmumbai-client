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

            try {
                const res = await axios.get("/dashboard/me");
                setUser(res.data.user);
                setToken(savedToken);
            } catch {
                localStorage.removeItem("token");
                setUser(null);
                setToken(null);
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
