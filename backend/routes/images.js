import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import auth from "../middleware/auth.js";
import Image from "../models/Image.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Upload image
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const image = await Image.create({
      userId: req.user.id,
      imageUrl: `/uploads/${req.file.filename}`,
      annotations: [],
    });

    res.status(201).json(image);
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all images for user
router.get("/", auth, async (req, res) => {
  try {
    const images = await Image.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(images);
  } catch (error) {
    console.error("Get images error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single image
router.get("/:id", auth, async (req, res) => {
  try {
    const image = await Image.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json(image);
  } catch (error) {
    console.error("Get image error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update annotations
router.put("/:id/annotations", auth, async (req, res) => {
  try {
    const { annotations } = req.body;

    const image = await Image.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { annotations },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json(image);
  } catch (error) {
    console.error("Update annotations error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete image
router.delete("/:id", auth, async (req, res) => {
  try {
    const image = await Image.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;

