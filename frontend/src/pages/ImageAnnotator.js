import React, { useEffect, useState, useRef } from "react";
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
  const [annotations, setAnnotationsState] = useState([]);
  const [saving, setSaving] = useState(false);
  const annotationsRef = useRef([]);
  
  // Wrapper function that updates both state and ref
  const setAnnotations = React.useCallback((updater) => {
    if (typeof updater === 'function') {
      setAnnotationsState((prev) => {
        const updated = updater(prev);
        annotationsRef.current = updated;
        return updated;
      });
    } else {
      setAnnotationsState(updater);
      annotationsRef.current = updater;
    }
  }, []);
  
  // Keep ref in sync with state (fallback)
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Default colors for annotations
  const defaultColors = [
    0x00ff00, 0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
    0xff8800, 0x8800ff, 0x00ff88, 0xff0088
  ];

  const previousImageId = useRef(null);

  useEffect(() => {
    // Always fetch when id changes
    dispatch(fetchImage(id));
    
    // If this is a different image, clear annotations
    if (previousImageId.current !== id) {
      setAnnotations([]);
      annotationsRef.current = [];
      previousImageId.current = id;
    }
  }, [id, dispatch]);

  useEffect(() => {
    // Load annotations whenever current image data is available and matches the current id
    if (current && current._id === id) {
      const annotationsFromCurrent = current.annotations || [];
      
      // Always process and set annotations when current matches id
      const annotationsWithColors = annotationsFromCurrent.map((annotation, index) => {
        if (annotation.color === undefined || annotation.color === null) {
          return {
            ...annotation,
            color: defaultColors[index % defaultColors.length]
          };
        }
        return annotation;
      });
      
      // Always update to ensure annotations are loaded
      setAnnotations(annotationsWithColors);
      annotationsRef.current = annotationsWithColors;
    } else if (current && current._id !== id) {
      // If current is for a different image, clear annotations
      setAnnotations([]);
      annotationsRef.current = [];
    }
  }, [current, id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use ref to get the absolute latest annotations state (including any pending updates)
      const annotationsToSave = annotationsRef.current;
      
      console.log('Saving annotations:', JSON.stringify(annotationsToSave, null, 2));
      
      const result = await dispatch(updateAnnotations({ id, annotations: annotationsToSave })).unwrap();
      
      // Update local annotations with the saved data (which includes colors)
      if (result && result.annotations) {
        setAnnotations(result.annotations);
        annotationsRef.current = result.annotations;
      }
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
            key={`${id}-${current?._id || ''}`}
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
            Click and drag to create boxes • Click to select • Drag to move • Drag handles to resize • Double-click or press Delete to remove
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

