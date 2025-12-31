import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import "./Annotator.css";

const Annotator = ({ imageUrl, annotations, setAnnotations }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const spriteRef = useRef(null);
  const graphicsRef = useRef([]);
  const annotationMapRef = useRef(new Map()); // Map graphics to annotation indices
  const startRef = useRef(null);
  const isDrawingRef = useRef(false);
  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState(null);
  const [labelInput, setLabelInput] = useState("object");
  const [resizeTrigger, setResizeTrigger] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanupFunctions = [];
    let app = null;
    let isUpdatingSize = false; // Track if we're currently updating to prevent ResizeObserver loops

    // Function to get container dimensions
    const getContainerSize = () => {
      if (!containerRef.current) return { width: 800, height: 600 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        width: Math.max(400, rect.width || 800),
        height: Math.max(300, rect.height || 600)
      };
    };
    
    // Function to update image and canvas size
    const updateImageSize = () => {
      if (!app || !spriteRef.current || !app.stage || isUpdatingSize) return;

      const { width: containerWidth, height: containerHeight } = getContainerSize();
      
      // Only resize if dimensions actually changed
      const currentWidth = app.renderer.width;
      const currentHeight = app.renderer.height;
      
      if (Math.abs(currentWidth - containerWidth) < 1 && Math.abs(currentHeight - containerHeight) < 1) {
        // Dimensions haven't changed significantly, just update sprite position if needed
        const sprite = spriteRef.current;
        const originalWidth = sprite.texture.originalWidth || sprite.texture.width;
        const originalHeight = sprite.texture.originalHeight || sprite.texture.height;
        
        if (!originalWidth || !originalHeight) return;

        const scale = Math.min(
          containerWidth / originalWidth,
          containerHeight / originalHeight
        );
        
        sprite.scale.set(scale);
        sprite.x = (containerWidth - originalWidth * scale) / 2;
        sprite.y = (containerHeight - originalHeight * scale) / 2;
        
        scaleRef.current = scale;
        offsetXRef.current = sprite.x;
        offsetYRef.current = sprite.y;
        return;
      }

      isUpdatingSize = true;
      
      // Resize renderer
      app.renderer.resize(containerWidth, containerHeight);
      
      const sprite = spriteRef.current;
      const originalWidth = sprite.texture.originalWidth || sprite.texture.width;
      const originalHeight = sprite.texture.originalHeight || sprite.texture.height;
      
      if (!originalWidth || !originalHeight) {
        isUpdatingSize = false;
        return;
      }

      // Calculate scale to fit image within container while maintaining aspect ratio
      const scale = Math.min(
        containerWidth / originalWidth,
        containerHeight / originalHeight
      );
      
      sprite.scale.set(scale);
      sprite.x = (containerWidth - originalWidth * scale) / 2;
      sprite.y = (containerHeight - originalHeight * scale) / 2;
      
      // Store scale and offset for coordinate conversion
      scaleRef.current = scale;
      offsetXRef.current = sprite.x;
      offsetYRef.current = sprite.y;
      
      // Use requestAnimationFrame to reset the flag after render
      requestAnimationFrame(() => {
        isUpdatingSize = false;
      });
    };

    const initApp = async () => {
      const { width: appWidth, height: appHeight } = getContainerSize();
      
      try {
        // Create PIXI Application (v7 API)
        app = new PIXI.Application({
          width: appWidth,
          height: appHeight,
          backgroundColor: 0x2c2c2c,
          antialias: true,
        });
        
        // Verify app was created successfully
        if (!app) {
          console.error('Failed to create PIXI Application');
          return;
        }

        appRef.current = app;

        // Verify view exists first
        if (!app.view) {
          console.error('PIXI Application view is not available');
          return;
        }
        
        // Add view to container before accessing stage
        containerRef.current.appendChild(app.view);
        
        // Wait a frame to ensure app is fully initialized
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Verify stage exists (should always exist in PIXI)
        const stage = app.stage;
        if (!stage) {
          console.error('PIXI Application stage is not available');
          return;
        }

        // Load and add image sprite
        const texture = PIXI.Texture.from(imageUrl);
        const sprite = new PIXI.Sprite(texture);
        spriteRef.current = sprite;
        
        // Wait for texture to load if needed
        if (texture.baseTexture && !texture.baseTexture.valid) {
          await new Promise((resolve, reject) => {
            texture.baseTexture.once('loaded', resolve);
            texture.baseTexture.once('error', reject);
          });
        }

        // Add sprite to stage first (before sizing)
        try {
          if (stage && typeof stage.addChild === 'function') {
            stage.addChild(sprite);
          } else {
            console.error('Stage is not valid or addChild is not a function', { stage, hasAddChild: stage && typeof stage.addChild });
            return;
          }
        } catch (error) {
          console.error('Error adding sprite to stage:', error, { stage, sprite });
          return;
        }

        // Initial image sizing after sprite is added
        updateImageSize();

        // Handle window resize with debouncing - avoid ResizeObserver to prevent loops
        let resizeTimeout = null;
        let lastWidth = appWidth;
        let lastHeight = appHeight;
        
        const handleResize = () => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }
          resizeTimeout = setTimeout(() => {
            if (!app || !app.stage || !spriteRef.current || isUpdatingSize) return;
            
            const { width: containerWidth, height: containerHeight } = getContainerSize();
            
            // Only update if size actually changed significantly
            if (Math.abs(containerWidth - lastWidth) > 5 || Math.abs(containerHeight - lastHeight) > 5) {
              lastWidth = containerWidth;
              lastHeight = containerHeight;
              updateImageSize();
              // Trigger annotation re-render by updating resize trigger
              setResizeTrigger(prev => prev + 1);
            }
          }, 200);
        };
        
        // Only use window resize - avoid ResizeObserver to prevent loops when canvas resizes
        window.addEventListener('resize', handleResize);
        
        cleanupFunctions.push(() => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }
          window.removeEventListener('resize', handleResize);
        });

        // Annotations will be drawn by the useEffect that watches the annotations prop
        // This ensures they're drawn after the sprite is positioned and scaled

        // Helper to convert canvas coordinates to image coordinates
        const canvasToImageCoords = (canvasX, canvasY) => {
          const imageX = (canvasX - offsetXRef.current) / scaleRef.current;
          const imageY = (canvasY - offsetYRef.current) / scaleRef.current;
          return { x: imageX, y: imageY };
        };

        // Helper to convert image coordinates to canvas coordinates
        const imageToCanvasCoords = (imageX, imageY) => {
          const canvasX = offsetXRef.current + imageX * scaleRef.current;
          const canvasY = offsetYRef.current + imageY * scaleRef.current;
          return { x: canvasX, y: canvasY };
        };

        // Mouse event handlers
        const handleMouseDown = (event) => {
          // Check if clicking on an existing annotation
          const clickedAnnotation = graphicsRef.current.find(graphic => {
            if (!graphic.interactive) return false;
            const bounds = graphic.getBounds();
            const point = { x: event.clientX - app.view.getBoundingClientRect().left, 
                           y: event.clientY - app.view.getBoundingClientRect().top };
            return bounds.contains(point.x, point.y);
          });

          if (clickedAnnotation) {
            // Clicked on annotation - could be used for editing/deleting
            return;
          }

          // Start drawing new annotation
          const rect = app.view.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          
          // Check if click is on the image
          if (spriteRef.current) {
            const spriteBounds = spriteRef.current.getBounds();
            if (spriteBounds.contains(x, y)) {
              startRef.current = { x, y };
              isDrawingRef.current = true;
            }
          }
        };

        const handleMouseMove = (event) => {
          if (!isDrawingRef.current || !startRef.current) return;

          const rect = app.view.getBoundingClientRect();
          const point = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };
          const width = point.x - startRef.current.x;
          const height = point.y - startRef.current.y;

          // Remove temporary drawing graphic if exists
          const tempIndex = graphicsRef.current.findIndex(g => g.isTemporary);
          if (tempIndex !== -1) {
            const tempGraphic = graphicsRef.current[tempIndex];
            tempGraphic.destroy();
            graphicsRef.current.splice(tempIndex, 1);
          }

          // Draw temporary rectangle while dragging
          const tempRect = new PIXI.Graphics();
          tempRect.lineStyle(2, 0xff0000);
          tempRect.drawRect(
            startRef.current.x,
            startRef.current.y,
            width,
            height
          );
          tempRect.isTemporary = true;
          app.stage.addChild(tempRect);
          graphicsRef.current.push(tempRect);
        };

        const handleMouseUp = (event) => {
          if (!isDrawingRef.current || !startRef.current) return;

          const rect = app.view.getBoundingClientRect();
          const point = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };
          const width = point.x - startRef.current.x;
          const height = point.y - startRef.current.y;

          // Remove temporary drawing graphic
          const tempIndex = graphicsRef.current.findIndex(g => g.isTemporary);
          if (tempIndex !== -1) {
            const tempGraphic = graphicsRef.current[tempIndex];
            tempGraphic.destroy();
            graphicsRef.current.splice(tempIndex, 1);
          }

          // Only create annotation if box has meaningful size
          if (Math.abs(width) > 10 && Math.abs(height) > 10) {
            // Convert canvas coordinates to image coordinates
            const startImageCoords = canvasToImageCoords(
              Math.min(startRef.current.x, point.x),
              Math.min(startRef.current.y, point.y)
            );
            
            const box = {
              x: startImageCoords.x,
              y: startImageCoords.y,
              width: Math.abs(width) / scaleRef.current,
              height: Math.abs(height) / scaleRef.current,
              label: "object",
            };

            // Show label input
            setPendingAnnotation(box);
            setShowLabelInput(true);
            setLabelInput("object");
          }

          startRef.current = null;
          isDrawingRef.current = false;
        };

        // Double-click to delete annotation
        const handleDoubleClick = (event) => {
          const rect = app.view.getBoundingClientRect();
          const point = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };

          const clickedAnnotation = graphicsRef.current.find(graphic => {
            if (!graphic.interactive || graphic.isTemporary) return false;
            const bounds = graphic.getBounds();
            return bounds.contains(point.x, point.y);
          });

          if (clickedAnnotation && clickedAnnotation.annotationIndex !== undefined) {
            const index = clickedAnnotation.annotationIndex;
            // Remove from graphics
            clickedAnnotation.destroy();
            graphicsRef.current = graphicsRef.current.filter(g => g !== clickedAnnotation);
            annotationMapRef.current.delete(clickedAnnotation);
            
            // Remove from annotations array
            setAnnotations((prev) => prev.filter((_, i) => i !== index));
          }
        };

        app.view.addEventListener("mousedown", handleMouseDown);
        app.view.addEventListener("mousemove", handleMouseMove);
        app.view.addEventListener("mouseup", handleMouseUp);
        app.view.addEventListener("dblclick", handleDoubleClick);
        
        // Store cleanup function
        cleanupFunctions.push(() => {
          app.view.removeEventListener("mousedown", handleMouseDown);
          app.view.removeEventListener("mousemove", handleMouseMove);
          app.view.removeEventListener("mouseup", handleMouseUp);
          app.view.removeEventListener("dblclick", handleDoubleClick);
        });
      } catch (error) {
        console.error('Error initializing PIXI:', error);
      }
    };

    initApp();

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions = [];
      if (appRef.current) {
        appRef.current.destroy(true, {
          children: true,
          texture: true,
          baseTexture: true,
        });
      }
    };
  }, [imageUrl]); // Only re-init when imageUrl changes

  // Handle label input confirmation
  const handleLabelConfirm = () => {
    if (pendingAnnotation) {
      const annotationWithLabel = {
        ...pendingAnnotation,
        label: labelInput || "object",
      };
      setAnnotations((prev) => [...prev, annotationWithLabel]);
      setShowLabelInput(false);
      setPendingAnnotation(null);
      setLabelInput("object");
    }
  };

  const handleLabelCancel = () => {
    setShowLabelInput(false);
    setPendingAnnotation(null);
    setLabelInput("object");
  };

  // Update annotations display when annotations prop changes or on resize
  useEffect(() => {
    if (!appRef.current || !containerRef.current || !spriteRef.current) return;
    if (!appRef.current.stage) return;

    const app = appRef.current;
    
    // Wait a bit to ensure sprite is positioned
    const timeoutId = setTimeout(() => {
      // Clear existing annotation graphics (except sprite and temporary)
      graphicsRef.current.forEach((graphic) => {
        if (!graphic.isTemporary && graphic.annotationIndex !== undefined) {
          graphic.destroy();
        }
      });
      graphicsRef.current = graphicsRef.current.filter(g => g.isTemporary || g.annotationIndex === undefined);
      annotationMapRef.current.clear();

      // Re-draw all annotations
      annotations.forEach((annotation, index) => {
        if (!app.stage || scaleRef.current === 0) return;
        
        // Convert annotation coordinates (image space) to canvas space
        const canvasX = offsetXRef.current + annotation.x * scaleRef.current;
        const canvasY = offsetYRef.current + annotation.y * scaleRef.current;
        const canvasWidth = annotation.width * scaleRef.current;
        const canvasHeight = annotation.height * scaleRef.current;
        
        // Only draw if coordinates are valid
        if (isNaN(canvasX) || isNaN(canvasY) || isNaN(canvasWidth) || isNaN(canvasHeight)) {
          return;
        }
        
        const rect = new PIXI.Graphics();
        rect.lineStyle(2, 0x00ff00);
        rect.drawRect(canvasX, canvasY, canvasWidth, canvasHeight);
        
        // Add label text with background for better visibility
        const labelText = new PIXI.Text(annotation.label || "object", {
          fontSize: 12,
          fill: 0x00ff00,
          fontWeight: 'bold',
          stroke: 0x000000,
          strokeThickness: 2,
        });
        labelText.x = canvasX;
        labelText.y = Math.max(0, canvasY - 18);
        labelText.resolution = 2;
        
        const container = new PIXI.Container();
        container.addChild(rect);
        container.addChild(labelText);
        container.eventMode = 'static';
        container.cursor = 'pointer';
        container.annotationIndex = index;
        annotationMapRef.current.set(container, index);
        
        app.stage.addChild(container);
        graphicsRef.current.push(container);
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [annotations, resizeTrigger]);

  return (
    <div className="annotator-wrapper">
      <div ref={containerRef} className="annotator-canvas"></div>
      {showLabelInput && (
        <div className="label-input-overlay">
          <div className="label-input-box">
            <h3>Enter Label</h3>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleLabelConfirm();
                if (e.key === 'Escape') handleLabelCancel();
              }}
              autoFocus
              placeholder="Enter annotation label"
            />
            <div className="label-input-buttons">
              <button onClick={handleLabelConfirm} className="btn-confirm">
                Confirm
              </button>
              <button onClick={handleLabelCancel} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Annotator;
