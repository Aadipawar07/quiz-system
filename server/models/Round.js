import mongoose from 'mongoose';

const roundSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Round name is required'],
      trim: true
    },

    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least 1 minute']
    },

    totalQuestions: {
      type: Number,
      required: [true, 'Total questions count is required'],
      min: [1, 'Total questions must be at least 1']
    },

    isPublished: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Round', roundSchema);
