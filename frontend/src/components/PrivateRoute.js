import React, { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchUserInfo } from "../store/authSlice";

const PrivateRoute = ({ children }) => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // Reset the ref when token changes (new login) or user is loaded
    if (!token) {
      hasAttemptedRef.current = false;
      return;
    }
    
    if (user) {
      hasAttemptedRef.current = false;
      return;
    }

    // Only fetch once per token - don't retry if it fails
    if (token && !user && !loading && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true;
      dispatch(fetchUserInfo());
    }
  }, [token, user, loading, dispatch]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;

