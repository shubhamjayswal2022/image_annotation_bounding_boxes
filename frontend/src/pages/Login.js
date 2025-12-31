import React, { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { setToken, setUser } from "../store/authSlice";
import api from "../utils/api";
import "./Auth.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Prevent double submission
    if (isSubmittingRef.current || loading) {
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const response = await api.post("/auth/login", formData);
      dispatch(setToken(response.data.token));
      dispatch(setUser(response.data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Login</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

