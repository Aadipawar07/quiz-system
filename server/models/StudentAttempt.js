import mongoose from 'mongoose';

const studentAttemptSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },

    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      index: true
    },

    answers: {
      type: [Number],
      default: [],
      validate: {
        validator: function (val) {
          return val.every((v) => v >= 0 && v <= 3 && Number.isInteger(v));
        },
        message: 'Each answer must be a valid option index between 0 and 3'
      }
    },

    attempted: {
      type: Number,
      default: 0
    },

    correct: {
      type: Number,
      default: 0
    },

    score: {
      type: Number,
      default: 0
    },

    violationCount: {
      type: Number,
      default: 0
    },

    terminated: {
      type: Boolean,
      default: false
    },

    isReset: {
      type: Boolean,
      default: false
    },

    roundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round'
    },

    startTime: {
      type: Date,
      required: [true, 'Start time is required']
    },

    submitTime: {
      type: Date
    },

    timeTaken: {
      type: Number  // seconds, computed server-side on submit
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('StudentAttempt', studentAttemptSchema);
