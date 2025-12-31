import mongoose from "mongoose";

const annotationSchema = new mongoose.Schema({
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  label: {
    type: String,
    default: "object",
  },
});

const imageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    annotations: [annotationSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);

