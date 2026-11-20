
import mongoose from 'mongoose';

// ==========================================
// USER MODEL
// ==========================================

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },

  profile: {
    type: new mongoose.Schema({
      photoUrl: { type: String, default: '' },
      fullName: { type: String, default: '' },
      mobile: { type: String, default: '' },
      studentId: { type: String, default: '' },
      course: { type: String, default: '' },
      branch: { type: String, default: '' },
      specialization: { type: String, default: '' },
      department: { type: String, default: '' },
      year: { type: String, default: '' },
      semester: { type: String, default: '' }
    }, { _id: false }),
    default: () => ({})
  }
}, { timestamps: true });

// ==========================================
// ACADEMIC MATERIAL MODEL
// ==========================================

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: [
      'Notes',
      'PYQ',
      'Assignment',
      'Practical',
      'Question Bank',
      'Syllabus',
      'Other'
    ],
    required: true
  },
  department: {
    type: String,
    default: 'Computer Science & Engineering'
  },
  semester: { type: Number, min: 1, max: 8, required: true },
  subject: { type: String, required: true, trim: true },
  unit: { type: String, default: '' },
  year: { type: String, default: '' },
  originalName: String,
  storedName: String,
  mimeType: String,
  size: Number,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// ==========================================
// QUIZ MODEL
// ==========================================

const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [{
      type: String,
      trim: true
    }],
    validate: {
      validator: value => value.length >= 2 && value.length <= 6,
      message: 'A question must have 2 to 6 options.'
    }
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0
  },
  explanation: {
    type: String,
    default: ''
  },
  marks: {
    type: Number,
    default: 1,
    min: 0
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: { type: String, default: '' },
  department: { type: String, default: 'All' },
  course: { type: String, default: 'All' },
  semester: { type: Number, min: 1, max: 8, default: null },
  subject: { type: String, default: '' },
  topic: { type: String, default: '' },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1,
    max: 300
  },
  questions: {
    type: [quizQuestionSchema],
    validate: {
      validator: value => value.length > 0,
      message: 'A quiz must contain at least one question.'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// ==========================================
// QUIZ ATTEMPT MODEL
// ==========================================

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedOption: {
      type: Number,
      min: 0
    }
  }],
  score: { type: Number, default: 0, min: 0 },
  totalMarks: { type: Number, default: 0, min: 0 },
  correctCount: { type: Number, default: 0, min: 0 },
  wrongCount: { type: Number, default: 0, min: 0 },
  unansweredCount: { type: Number, default: 0, min: 0 },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['in-progress', 'submitted', 'expired'],
    default: 'in-progress'
  }
}, { timestamps: true });

quizAttemptSchema.index({ quiz: 1, student: 1, createdAt: -1 });

// ==========================================
// BOOKMARK MODEL
// ==========================================

const bookmarkSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true
  }
}, { timestamps: true });

bookmarkSchema.index(
  { student: 1, material: 1 },
  { unique: true }
);

// ==========================================
// PERSONAL NOTES MODEL
// ==========================================

const studentNoteSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  content: {
    type: String,
    default: '',
    maxlength: 20000
  },
  subject: { type: String, default: '' },
  department: { type: String, default: '' },
  semester: { type: Number, min: 1, max: 8, default: null },
  isPinned: { type: Boolean, default: false }
}, { timestamps: true });

studentNoteSchema.index({ student: 1, updatedAt: -1 });

// ==========================================
// STUDY PLANNER / TASK MODEL
// ==========================================

const plannerTaskSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000
  },
  subject: { type: String, default: '' },
  dueDate: { type: Date, default: null },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, { timestamps: true });

plannerTaskSchema.index({ student: 1, dueDate: 1 });

// ==========================================
// DISCUSSION FORUM MODEL
// ==========================================

const discussionReplySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  createdAt: { type: Date, default: Date.now }
});

const discussionSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10000
  },
  department: { type: String, default: '' },
  course: { type: String, default: '' },
  semester: { type: Number, min: 1, max: 8, default: null },
  subject: { type: String, default: '' },
  replies: {
    type: [discussionReplySchema],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'reported', 'removed'],
    default: 'open'
  }
}, { timestamps: true });

discussionSchema.index({ createdAt: -1 });

// ==========================================
// ANNOUNCEMENTS MODEL
// ==========================================

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  targetDepartment: { type: String, default: 'All' },
  targetCourse: { type: String, default: 'All' },
  targetSemester: { type: Number, min: 1, max: 8, default: null },
  category: {
    type: String,
    enum: ['general', 'academic', 'exam', 'deadline', 'event'],
    default: 'general'
  },
  published: { type: Boolean, default: false },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// ==========================================
// NOTIFICATION MODEL
// ==========================================

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: [
      'material',
      'quiz',
      'announcement',
      'deadline',
      'system'
    ],
    default: 'system'
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// ==========================================
// SAFE MODEL EXPORTS
// ==========================================

// Existing models remain unchanged.
export const User =
  mongoose.models.User || mongoose.model('User', userSchema);

export const Material =
  mongoose.models.Material || mongoose.model('Material', materialSchema);

// New academic feature models.
export const Quiz =
  mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);

export const QuizAttempt =
  mongoose.models.QuizAttempt ||
  mongoose.model('QuizAttempt', quizAttemptSchema);

export const Bookmark =
  mongoose.models.Bookmark ||
  mongoose.model('Bookmark', bookmarkSchema);

export const StudentNote =
  mongoose.models.StudentNote ||
  mongoose.model('StudentNote', studentNoteSchema);

export const PlannerTask =
  mongoose.models.PlannerTask ||
  mongoose.model('PlannerTask', plannerTaskSchema);

export const Discussion =
  mongoose.models.Discussion ||
  mongoose.model('Discussion', discussionSchema);

export const Announcement =
  mongoose.models.Announcement ||
  mongoose.model('Announcement', announcementSchema);

export const Notification =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);
