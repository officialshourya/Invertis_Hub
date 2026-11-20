
import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

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
// DEPARTMENT MODEL
// ==========================================

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

departmentSchema.index({ name: 1 }, { unique: true });

// ==========================================
// COURSE MODEL
// ==========================================

const courseSchema = new mongoose.Schema({
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  description: { type: String, default: '' },
  durationYears: { type: Number, min: 1, max: 10, default: 4 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

courseSchema.index({ department: 1, name: 1 }, { unique: true });

// ==========================================
// BRANCH MODEL
// ==========================================

const branchSchema = new mongoose.Schema({
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  course: {
    type: ObjectId,
    ref: 'Course',
    required: true
  },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

branchSchema.index(
  { course: 1, name: 1 },
  { unique: true }
);

// ==========================================
// SPECIALIZATION MODEL
// ==========================================

const specializationSchema = new mongoose.Schema({
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  course: {
    type: ObjectId,
    ref: 'Course',
    required: true
  },
  branch: {
    type: ObjectId,
    ref: 'Branch',
    default: null
  },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

specializationSchema.index(
  { course: 1, branch: 1, name: 1 },
  { unique: true }
);

// ==========================================
// ACADEMIC YEAR MODEL
// ==========================================

const academicYearSchema = new mongoose.Schema({
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  course: {
    type: ObjectId,
    ref: 'Course',
    required: true
  },
  branch: {
    type: ObjectId,
    ref: 'Branch',
    default: null
  },
  specialization: {
    type: ObjectId,
    ref: 'Specialization',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  yearNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

academicYearSchema.index(
  { course: 1, branch: 1, specialization: 1, yearNumber: 1 },
  { unique: true }
);

// ==========================================
// SEMESTER MODEL
// ==========================================

const semesterSchema = new mongoose.Schema({
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  course: {
    type: ObjectId,
    ref: 'Course',
    required: true
  },
  branch: {
    type: ObjectId,
    ref: 'Branch',
    default: null
  },
  specialization: {
    type: ObjectId,
    ref: 'Specialization',
    default: null
  },
  academicYear: {
    type: ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  semesterNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

semesterSchema.index(
  { academicYear: 1, semesterNumber: 1 },
  { unique: true }
);

// ==========================================
// SUBJECT MODEL
// ==========================================

const subjectSchema = new mongoose.Schema({
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  course: {
    type: ObjectId,
    ref: 'Course',
    required: true
  },
  branch: {
    type: ObjectId,
    ref: 'Branch',
    default: null
  },
  specialization: {
    type: ObjectId,
    ref: 'Specialization',
    default: null
  },
  academicYear: {
    type: ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  semester: {
    type: ObjectId,
    ref: 'Semester',
    required: true
  },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true, default: '' },
  description: { type: String, default: '' },
  credits: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

subjectSchema.index(
  { semester: 1, name: 1 },
  { unique: true }
);

// ==========================================
// UNIT / TOPIC MODEL
// ==========================================

const unitSchema = new mongoose.Schema({
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  course: {
    type: ObjectId,
    ref: 'Course',
    required: true
  },
  branch: {
    type: ObjectId,
    ref: 'Branch',
    default: null
  },
  specialization: {
    type: ObjectId,
    ref: 'Specialization',
    default: null
  },
  academicYear: {
    type: ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  semester: {
    type: ObjectId,
    ref: 'Semester',
    required: true
  },
  subject: {
    type: ObjectId,
    ref: 'Subject',
    required: true
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  unitNumber: { type: Number, min: 1, default: 1 },
  topics: [{
    type: String,
    trim: true
  }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' }
}, { timestamps: true });

unitSchema.index(
  { subject: 1, unitNumber: 1 },
  { unique: true }
);

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

  // Legacy fields preserved
  department: {
    type: String,
    default: 'Computer Science & Engineering'
  },
  semester: { type: Number, min: 1, max: 8, required: true },
  subject: { type: String, required: true, trim: true },
  unit: { type: String, default: '' },
  year: { type: String, default: '' },

  // New dynamic catalog references
  departmentRef: { type: ObjectId, ref: 'Department', default: null },
  courseRef: { type: ObjectId, ref: 'Course', default: null },
  branchRef: { type: ObjectId, ref: 'Branch', default: null },
  specializationRef: {
    type: ObjectId,
    ref: 'Specialization',
    default: null
  },
  academicYearRef: {
    type: ObjectId,
    ref: 'AcademicYear',
    default: null
  },
  semesterRef: { type: ObjectId, ref: 'Semester', default: null },
  subjectRef: { type: ObjectId, ref: 'Subject', default: null },
  unitRef: { type: ObjectId, ref: 'Unit', default: null },

  originalName: String,
  storedName: String,
  mimeType: String,
  size: Number,
  uploadedBy: {
    type: ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

materialSchema.index({ departmentRef: 1, courseRef: 1, semesterRef: 1 });
materialSchema.index({ subjectRef: 1, unitRef: 1 });

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
    type: ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// ==========================================
// QUIZ ATTEMPT MODEL
// ==========================================

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionId: ObjectId,
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
    type: ObjectId,
    ref: 'User',
    required: true
  },
  material: {
    type: ObjectId,
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
    type: ObjectId,
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
    type: ObjectId,
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
    type: ObjectId,
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
    type: ObjectId,
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
    type: ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// ==========================================
// NOTIFICATION MODEL
// ==========================================

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: ObjectId,
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
    type: ObjectId,
    default: null
  },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// ==========================================
// SAFE MODEL EXPORTS
// ==========================================

export const User =
  mongoose.models.User || mongoose.model('User', userSchema);

export const Department =
  mongoose.models.Department ||
  mongoose.model('Department', departmentSchema);

export const Course =
  mongoose.models.Course ||
  mongoose.model('Course', courseSchema);

export const Branch =
  mongoose.models.Branch ||
  mongoose.model('Branch', branchSchema);

export const Specialization =
  mongoose.models.Specialization ||
  mongoose.model('Specialization', specializationSchema);

export const AcademicYear =
  mongoose.models.AcademicYear ||
  mongoose.model('AcademicYear', academicYearSchema);

export const Semester =
  mongoose.models.Semester ||
  mongoose.model('Semester', semesterSchema);

export const Subject =
  mongoose.models.Subject ||
  mongoose.model('Subject', subjectSchema);

export const Unit =
  mongoose.models.Unit ||
  mongoose.model('Unit', unitSchema);

export const Material =
  mongoose.models.Material || mongoose.model('Material', materialSchema);

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
