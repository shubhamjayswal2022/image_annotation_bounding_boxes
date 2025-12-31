import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";
import { fetchImages, uploadImage } from "../store/imageSlice";
import "./Dashboard.css";

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading } = useSelector((state) => state.images);
  const { user, loading: authLoading } = useSelector((state) => state.auth);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    dispatch(fetchImages());
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await dispatch(uploadImage(file)).unwrap();
      dispatch(fetchImages());
    } catch (error) {
      alert("Failed to upload image: " + error.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleImageClick = (id) => {
    navigate(`/annotate/${id}`);
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>Image Annotation Tool</h1>
        <div className="navbar-right">
          <span className="user-name">
            Welcome, {user?.name || (authLoading ? "Loading..." : "User")}
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="upload-section">
          <label className="upload-button">
            {uploading ? "Uploading..." : "Upload Image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {loading ? (
          <div className="loading">Loading images...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>No images uploaded yet. Upload your first image to get started!</p>
          </div>
        ) : (
          <div className="image-grid">
            {items.map((image) => (
              <div
                key={image._id}
                className="image-card"
                onClick={() => handleImageClick(image._id)}
              >
                <div className="image-preview">
                  <img
                    src={`http://localhost:5000${image.imageUrl}`}
                    alt="Uploaded"
                  />
                </div>
                <div className="image-info">
                  <p className="image-date">
                    {new Date(image.createdAt).toLocaleDateString()}
                  </p>
                  <p className="annotation-count">
                    {image.annotations?.length || 0} annotation(s)
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

