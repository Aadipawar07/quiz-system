import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    roundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Round',
      required: [true, 'Round ID is required']
    },

    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },

    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: function (val) {
          return val.length === 4;
        },
        message: 'Exactly 4 options are required'
      }
    },

    correctAnswer: {
      type: String,
      required: true,
    },

    marks: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Question', questionSchema);
