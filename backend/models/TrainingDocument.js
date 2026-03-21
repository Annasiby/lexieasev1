import mongoose from "mongoose";

const trainingDocumentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerRole: {
      type: String,
      enum: ["student", "teacher", "parent"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    rawText: {
      type: String,
      required: true,
    },
    shareMode: {
      type: String,
      enum: ["private", "all-linked", "selected"],
      default: "private",
    },
    assignedStudentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isEnabledForTraining: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

const TrainingDocument = mongoose.model("TrainingDocument", trainingDocumentSchema);

export default TrainingDocument;
