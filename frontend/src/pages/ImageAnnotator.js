import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchImage, updateAnnotations } from "../store/imageSlice";
import Annotator from "../components/Annotator";
import "./ImageAnnotator.css";

const ImageAnnotator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { current, loading } = useSelector((state) => state.images);
  const [annotations, setAnnotations] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchImage(id));
  }, [id, dispatch]);

  useEffect(() => {
    if (current) {
      setAnnotations(current.annotations || []);
    }
  }, [current]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await dispatch(updateAnnotations({ id, annotations })).unwrap();
      alert("Annotations saved successfully!");
    } catch (error) {
      alert("Failed to save annotations: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return <div className="annotator-loading">Loading image...</div>;
  }

  if (!current) {
    return <div className="annotator-error">Image not found</div>;
  }

  const imageUrl = `http://localhost:5000${current.imageUrl}`;

  return (
    <div className="annotator-page">
      <div className="annotator-header">
        <button onClick={handleBack} className="btn-back">
          ← Back to Dashboard
        </button>
        <h2>Image Annotator</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-save"
        >
          {saving ? "Saving..." : "Save Annotations"}
        </button>
      </div>

      <div className="annotator-main-content">
        <div className="annotator-container">
          <Annotator
            imageUrl={imageUrl}
            annotations={annotations}
            setAnnotations={setAnnotations}
          />
        </div>

        <div className="annotations-info">
        <div className="annotations-header">
          <p>
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
          </p>
          <p className="hint">
            Click and drag to create boxes • Double-click to delete • Labels shown on boxes
          </p>
        </div>
        {annotations.length > 0 && (
          <div className="annotations-list">
            <h3>Annotations:</h3>
            <div className="annotation-items">
              {annotations.map((annotation, index) => (
                <div key={index} className="annotation-item">
                  <span className="annotation-label">
                    {index + 1}. {annotation.label || "object"}
                  </span>
                  <span className="annotation-coords">
                    ({Math.round(annotation.x)}, {Math.round(annotation.y)}) - {Math.round(annotation.width)}×{Math.round(annotation.height)}
                  </span>
                  <button
                    onClick={() => {
                      setAnnotations((prev) => prev.filter((_, i) => i !== index));
                    }}
                    className="btn-delete-annotation"
                    title="Delete annotation"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ImageAnnotator;

