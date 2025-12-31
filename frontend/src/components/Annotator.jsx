import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import "./Annotator.css";

const Annotator = ({ imageUrl, annotations, setAnnotations }) => {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const spriteRef = useRef(null);
  const graphicsRef = useRef([]);
  const annotationMapRef = useRef(new Map());
  const startRef = useRef(null);
  const isDrawingRef = useRef(false);
  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState(null);
  const [labelInput, setLabelInput] = useState("object");
  const [resizeTrigger, setResizeTrigger] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const annotationsRef = useRef(annotations);
  
  // Interaction state
  const interactionStateRef = useRef({
    mode: null, // 'drawing', 'moving', 'resizing', null
    selectedAnnotation: null,
    resizeHandle: null, // which handle is being dragged
    dragStart: null,
    annotationStart: null
  });

  // Keep annotations ref in sync
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Default colors for annotations
  const defaultColors = [
    0x00ff00, 0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
    0xff8800, 0x8800ff, 0x00ff88, 0xff0088
  ];

  const getAnnotationColor = (index) => {
    const annotation = annotations[index];
    if (annotation && annotation.color !== undefined && annotation.color !== null) {
      return annotation.color;
    }
    return defaultColors[index % defaultColors.length];
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanupFunctions = [];
    let app = null;
    let isUpdatingSize = false;

    const getContainerSize = () => {
      if (!containerRef.current) return { width: 800, height: 600 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        width: Math.max(400, rect.width || 800),
        height: Math.max(300, rect.height || 600)
      };
    };
    
    const updateImageSize = () => {
      if (!app || !spriteRef.current || !app.stage || isUpdatingSize) return;

      const { width: containerWidth, height: containerHeight } = getContainerSize();
      
      const currentWidth = app.renderer.width;
      const currentHeight = app.renderer.height;
      
      if (Math.abs(currentWidth - containerWidth) < 1 && Math.abs(currentHeight - containerHeight) < 1) {
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
      
      app.renderer.resize(containerWidth, containerHeight);
      
      const sprite = spriteRef.current;
      const originalWidth = sprite.texture.originalWidth || sprite.texture.width;
      const originalHeight = sprite.texture.originalHeight || sprite.texture.height;
      
      if (!originalWidth || !originalHeight) {
        isUpdatingSize = false;
        return;
      }

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
      
      requestAnimationFrame(() => {
        isUpdatingSize = false;
      });
    };

    const initApp = async () => {
      const { width: appWidth, height: appHeight } = getContainerSize();
      
      try {
        app = new PIXI.Application({
          width: appWidth,
          height: appHeight,
          backgroundColor: 0x2c2c2c,
          antialias: true,
        });
        
        if (!app) {
          console.error('Failed to create PIXI Application');
          return;
        }

        appRef.current = app;

        if (!app.view) {
          console.error('PIXI Application view is not available');
          return;
        }
        
        containerRef.current.appendChild(app.view);
        
        await new Promise(resolve => requestAnimationFrame(resolve));

        const stage = app.stage;
        if (!stage) {
          console.error('PIXI Application stage is not available');
          return;
        }

        const texture = PIXI.Texture.from(imageUrl);
        const sprite = new PIXI.Sprite(texture);
        spriteRef.current = sprite;
        
        if (texture.baseTexture && !texture.baseTexture.valid) {
          await new Promise((resolve, reject) => {
            texture.baseTexture.once('loaded', resolve);
            texture.baseTexture.once('error', reject);
          });
        }

        try {
          if (stage && typeof stage.addChild === 'function') {
            stage.addChild(sprite);
          } else {
            console.error('Stage is not valid or addChild is not a function');
            return;
          }
        } catch (error) {
          console.error('Error adding sprite to stage:', error);
          return;
        }

        updateImageSize();

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
            
            if (Math.abs(containerWidth - lastWidth) > 5 || Math.abs(containerHeight - lastHeight) > 5) {
              lastWidth = containerWidth;
              lastHeight = containerHeight;
              updateImageSize();
              setResizeTrigger(prev => prev + 1);
            }
          }, 200);
        };
        
        window.addEventListener('resize', handleResize);
        
        cleanupFunctions.push(() => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }
          window.removeEventListener('resize', handleResize);
        });

        const canvasToImageCoords = (canvasX, canvasY) => {
          const imageX = (canvasX - offsetXRef.current) / scaleRef.current;
          const imageY = (canvasY - offsetYRef.current) / scaleRef.current;
          return { x: imageX, y: imageY };
        };

        const imageToCanvasCoords = (imageX, imageY) => {
          const canvasX = offsetXRef.current + imageX * scaleRef.current;
          const canvasY = offsetYRef.current + imageY * scaleRef.current;
          return { x: canvasX, y: canvasY };
        };

        const getPointFromEvent = (event) => {
          const rect = app.view.getBoundingClientRect();
          return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
          };
        };

        const findAnnotationAtPoint = (point) => {
          // Check resize handles first
          for (let i = 0; i < graphicsRef.current.length; i++) {
            const graphic = graphicsRef.current[i];
            if (graphic.isResizeHandle && graphic.handleIndex !== undefined) {
              const bounds = graphic.getBounds();
              if (bounds.contains(point.x, point.y)) {
                return {
                  type: 'handle',
                  annotationIndex: graphic.annotationIndex,
                  handleIndex: graphic.handleIndex,
                  graphic: graphic
                };
              }
            }
          }
          
          // Check annotation boxes
          for (let i = 0; i < graphicsRef.current.length; i++) {
            const graphic = graphicsRef.current[i];
            if (graphic.isAnnotationBox && graphic.annotationIndex !== undefined) {
              const bounds = graphic.getBounds();
              if (bounds.contains(point.x, point.y)) {
                return {
                  type: 'box',
                  annotationIndex: graphic.annotationIndex,
                  graphic: graphic
                };
              }
            }
          }
          
          return null;
        };

        const handleMouseDown = (event) => {
          const point = getPointFromEvent(event);
          const hit = findAnnotationAtPoint(point);

          if (hit) {
            if (hit.type === 'handle') {
              // Start resizing
              interactionStateRef.current.mode = 'resizing';
              interactionStateRef.current.selectedAnnotation = hit.annotationIndex;
              interactionStateRef.current.resizeHandle = hit.handleIndex;
              interactionStateRef.current.dragStart = point;
              const annotation = annotationsRef.current[hit.annotationIndex];
              interactionStateRef.current.annotationStart = {
                x: annotation.x,
                y: annotation.y,
                width: annotation.width,
                height: annotation.height
              };
              setSelectedIndex(hit.annotationIndex);
            } else if (hit.type === 'box') {
              // Select annotation and prepare for moving
              setSelectedIndex(hit.annotationIndex);
              interactionStateRef.current.selectedAnnotation = hit.annotationIndex;
              interactionStateRef.current.dragStart = point;
              const annotation = annotationsRef.current[hit.annotationIndex];
              interactionStateRef.current.annotationStart = {
                x: annotation.x,
                y: annotation.y
              };
              // Don't set mode yet - wait for mouse move to start moving
            }
            return;
          }

          // Check if clicking on image to start drawing
          if (spriteRef.current) {
            const spriteBounds = spriteRef.current.getBounds();
            if (spriteBounds.contains(point.x, point.y)) {
              startRef.current = point;
              isDrawingRef.current = true;
              interactionStateRef.current.mode = 'drawing';
              setSelectedIndex(null);
            } else {
              // Clicked outside image - deselect
              setSelectedIndex(null);
            }
          } else {
            // Clicked outside - deselect
            setSelectedIndex(null);
          }
        };

        const handleMouseMove = (event) => {
          const point = getPointFromEvent(event);
          const state = interactionStateRef.current;

          if (state.mode === 'drawing' && startRef.current) {
            const width = point.x - startRef.current.x;
            const height = point.y - startRef.current.y;

            const tempIndex = graphicsRef.current.findIndex(g => g.isTemporary);
            if (tempIndex !== -1) {
              const tempGraphic = graphicsRef.current[tempIndex];
              tempGraphic.destroy();
              graphicsRef.current.splice(tempIndex, 1);
            }

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
          } else if (state.mode === 'resizing' && state.dragStart && state.selectedAnnotation !== null) {
            const dx = (point.x - state.dragStart.x) / scaleRef.current;
            const dy = (point.y - state.dragStart.y) / scaleRef.current;
            
            const start = state.annotationStart;
            let newX = start.x;
            let newY = start.y;
            let newWidth = start.width;
            let newHeight = start.height;
            
            const handle = state.resizeHandle;
            
            // Handle different resize handles
            if (handle === 0) { // Top-left
              newX = start.x + dx;
              newY = start.y + dy;
              newWidth = start.width - dx;
              newHeight = start.height - dy;
            } else if (handle === 1) { // Top
              newY = start.y + dy;
              newHeight = start.height - dy;
            } else if (handle === 2) { // Top-right
              newY = start.y + dy;
              newWidth = start.width + dx;
              newHeight = start.height - dy;
            } else if (handle === 3) { // Right
              newWidth = start.width + dx;
            } else if (handle === 4) { // Bottom-right
              newWidth = start.width + dx;
              newHeight = start.height + dy;
            } else if (handle === 5) { // Bottom
              newHeight = start.height + dy;
            } else if (handle === 6) { // Bottom-left
              newX = start.x + dx;
              newWidth = start.width - dx;
              newHeight = start.height + dy;
            } else if (handle === 7) { // Left
              newX = start.x + dx;
              newWidth = start.width - dx;
            }
            
            // Ensure minimum size and positive values
            if (newWidth < 10) {
              newWidth = 10;
              if (handle === 0 || handle === 6 || handle === 7) {
                newX = start.x + start.width - 10;
              }
            }
            if (newHeight < 10) {
              newHeight = 10;
              if (handle === 0 || handle === 1 || handle === 2) {
                newY = start.y + start.height - 10;
              }
            }
            
            // Ensure coordinates stay within image bounds
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);
            
            setAnnotations((prev) => {
              const updated = [...prev];
              if (updated[state.selectedAnnotation]) {
                updated[state.selectedAnnotation] = {
                  ...updated[state.selectedAnnotation],
                  x: newX,
                  y: newY,
                  width: newWidth,
                  height: newHeight
                };
              }
              return updated;
            });
          } else if (state.selectedAnnotation !== null && state.dragStart) {
            // Check if user has moved enough to start dragging
            const dx = Math.abs(point.x - state.dragStart.x);
            const dy = Math.abs(point.y - state.dragStart.y);
            
            // Start moving if moved more than 3 pixels and not already in another mode
            if (state.mode !== 'moving' && state.mode !== 'resizing' && (dx > 3 || dy > 3)) {
              state.mode = 'moving';
            }
            
            if (state.mode === 'moving') {
              const dx = (point.x - state.dragStart.x) / scaleRef.current;
              const dy = (point.y - state.dragStart.y) / scaleRef.current;
              
              const newX = state.annotationStart.x + dx;
              const newY = state.annotationStart.y + dy;
              
              // Update annotation
              setAnnotations((prev) => {
                const updated = [...prev];
                if (updated[state.selectedAnnotation]) {
                  updated[state.selectedAnnotation] = {
                    ...updated[state.selectedAnnotation],
                    x: Math.max(0, newX),
                    y: Math.max(0, newY)
                  };
                }
                return updated;
              });
            }
          }
        };

        const handleMouseUp = (event) => {
          const state = interactionStateRef.current;

          if (state.mode === 'drawing' && startRef.current) {
            const point = getPointFromEvent(event);
            const width = point.x - startRef.current.x;
            const height = point.y - startRef.current.y;

            const tempIndex = graphicsRef.current.findIndex(g => g.isTemporary);
            if (tempIndex !== -1) {
              const tempGraphic = graphicsRef.current[tempIndex];
              tempGraphic.destroy();
              graphicsRef.current.splice(tempIndex, 1);
            }

            if (Math.abs(width) > 10 && Math.abs(height) > 10) {
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
                color: defaultColors[annotationsRef.current.length % defaultColors.length]
              };

              setPendingAnnotation(box);
              setShowLabelInput(true);
              setLabelInput("object");
            }

            startRef.current = null;
            isDrawingRef.current = false;
          }

          // Reset interaction state
          interactionStateRef.current.mode = null;
          interactionStateRef.current.dragStart = null;
        };

        const handleDoubleClick = (event) => {
          const point = getPointFromEvent(event);
          const hit = findAnnotationAtPoint(point);

          if (hit && hit.type === 'box') {
            const index = hit.annotationIndex;
            setAnnotations((prev) => prev.filter((_, i) => i !== index));
            setSelectedIndex(null);
          }
        };

        const handleKeyDown = (event) => {
          if (selectedIndex !== null) {
            if (event.key === 'Delete' || event.key === 'Backspace') {
              setAnnotations((prev) => prev.filter((_, i) => i !== selectedIndex));
              setSelectedIndex(null);
            }
          }
        };

        app.view.addEventListener("mousedown", handleMouseDown);
        app.view.addEventListener("mousemove", handleMouseMove);
        app.view.addEventListener("mouseup", handleMouseUp);
        app.view.addEventListener("dblclick", handleDoubleClick);
        window.addEventListener("keydown", handleKeyDown);
        
        cleanupFunctions.push(() => {
          app.view.removeEventListener("mousedown", handleMouseDown);
          app.view.removeEventListener("mousemove", handleMouseMove);
          app.view.removeEventListener("mouseup", handleMouseUp);
          app.view.removeEventListener("dblclick", handleDoubleClick);
          window.removeEventListener("keydown", handleKeyDown);
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
  }, [imageUrl]);

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

  const createResizeHandles = (container, canvasX, canvasY, canvasWidth, canvasHeight, annotationIndex) => {
    const handleSize = 8;
    const handles = [];
    
    // 8 handles: top-left, top, top-right, right, bottom-right, bottom, bottom-left, left
    const positions = [
      { x: canvasX, y: canvasY }, // 0: top-left
      { x: canvasX + canvasWidth / 2, y: canvasY }, // 1: top
      { x: canvasX + canvasWidth, y: canvasY }, // 2: top-right
      { x: canvasX + canvasWidth, y: canvasY + canvasHeight / 2 }, // 3: right
      { x: canvasX + canvasWidth, y: canvasY + canvasHeight }, // 4: bottom-right
      { x: canvasX + canvasWidth / 2, y: canvasY + canvasHeight }, // 5: bottom
      { x: canvasX, y: canvasY + canvasHeight }, // 6: bottom-left
      { x: canvasX, y: canvasY + canvasHeight / 2 } // 7: left
    ];
    
    positions.forEach((pos, index) => {
      const handle = new PIXI.Graphics();
      handle.beginFill(0xffffff);
      handle.lineStyle(2, 0x000000);
      handle.drawRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize);
      handle.endFill();
      handle.x = pos.x;
      handle.y = pos.y;
      handle.eventMode = 'static';
      handle.cursor = 'pointer';
      handle.isResizeHandle = true;
      handle.annotationIndex = annotationIndex;
      handle.handleIndex = index;
      
      // Set cursor based on handle position
      const cursors = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 
                       'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'];
      handle.cursor = cursors[index];
      
      container.addChild(handle);
      handles.push(handle);
      graphicsRef.current.push(handle);
    });
    
    return handles;
  };

  useEffect(() => {
    if (!appRef.current || !containerRef.current || !spriteRef.current) return;
    if (!appRef.current.stage) return;

    const app = appRef.current;
    
    const timeoutId = setTimeout(() => {
      // Clear existing annotation graphics
      graphicsRef.current.forEach((graphic) => {
        if (!graphic.isTemporary && (graphic.isAnnotationBox || graphic.isResizeHandle)) {
          graphic.destroy();
        }
      });
      graphicsRef.current = graphicsRef.current.filter(g => g.isTemporary);
      annotationMapRef.current.clear();

      // Re-draw all annotations
      annotations.forEach((annotation, index) => {
        if (!app.stage || scaleRef.current === 0) return;
        
        const canvasX = offsetXRef.current + annotation.x * scaleRef.current;
        const canvasY = offsetYRef.current + annotation.y * scaleRef.current;
        const canvasWidth = annotation.width * scaleRef.current;
        const canvasHeight = annotation.height * scaleRef.current;
        
        if (isNaN(canvasX) || isNaN(canvasY) || isNaN(canvasWidth) || isNaN(canvasHeight)) {
          return;
        }
        
        const color = getAnnotationColor(index);
        const isSelected = selectedIndex === index;
        const lineWidth = isSelected ? 3 : 2;
        
        const rect = new PIXI.Graphics();
        rect.lineStyle(lineWidth, color);
        rect.drawRect(canvasX, canvasY, canvasWidth, canvasHeight);
        rect.isAnnotationBox = true;
        rect.annotationIndex = index;
        
        const labelText = new PIXI.Text(annotation.label || "object", {
          fontSize: 12,
          fill: color,
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
        container.cursor = 'move';
        container.isAnnotationBox = true;
        container.annotationIndex = index;
        annotationMapRef.current.set(container, index);
        
        // Add resize handles if selected
        if (isSelected) {
          createResizeHandles(container, canvasX, canvasY, canvasWidth, canvasHeight, index);
        }
        
        app.stage.addChild(container);
        graphicsRef.current.push(container);
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [annotations, resizeTrigger, selectedIndex]);


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
