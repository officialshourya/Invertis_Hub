
import express from 'express';
import mongoose from 'mongoose';

import {
  User,
  Material,
  Quiz,
  QuizAttempt,
  Bookmark,
  StudentNote,
  PlannerTask,
  Discussion,
  Announcement,
  Notification,
  Department,
  Course,
  Branch,
  Specialization,
  AcademicYear,
  Semester,
  Subject,
  Unit
} from '../models.js';

import { authenticate, requireAdmin } from '../middleware.js';

const router = express.Router();

router.use(authenticate);

// ==========================================
// COMMON HELPERS
// ==========================================

const validId = id => mongoose.isValidObjectId(id);
const getStudentId = req => req.user._id;

const safeText = (value, max = 5000) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const validSemester = value =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Number.isInteger(Number(value)) &&
    Number(value) >= 1 &&
    Number(value) <= 8);

const escapeRegex = value =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const handleError = (res, error, message = 'Request failed.') => {
  console.error(error);

  if (error.code === 11000) {
    return res.status(409).json({
      message: 'This record already exists.'
    });
  }

  if (
    error.name === 'ValidationError' ||
    error.name === 'CastError'
  ) {
    return res.status(400).json({
      message: error.message
    });
  }

  return res.status(500).json({ message });
};

const cleanQuiz = quiz => {
  const data = quiz.toObject ? quiz.toObject() : { ...quiz };

  data.questions = (data.questions || []).map(question => {
    const item = { ...question };
    delete item.correctAnswer;
    delete item.explanation;
    return item;
  });

  return data;
};

// ==========================================
// DYNAMIC ACADEMIC CATALOG
// ==========================================

const catalogModels = {
  departments: {
    Model: Department,
    fields: ['name', 'code', 'description', 'isActive', 'sortOrder'],
    required: ['name'],
    parents: [],
    populate: []
  },

  courses: {
    Model: Course,
    fields: [
      'department', 'name', 'code', 'description',
      'durationYears', 'isActive', 'sortOrder'
    ],
    required: ['department', 'name'],
    parents: [
      { field: 'department', Model: Department }
    ],
    populate: ['department']
  },

  branches: {
    Model: Branch,
    fields: [
      'department', 'course', 'name', 'code',
      'description', 'isActive', 'sortOrder'
    ],
    required: ['department', 'course', 'name'],
    parents: [
      { field: 'department', Model: Department },
      { field: 'course', Model: Course }
    ],
    populate: ['department', 'course']
  },

  specializations: {
    Model: Specialization,
    fields: [
      'department', 'course', 'branch', 'name',
      'code', 'description', 'isActive', 'sortOrder'
    ],
    required: ['department', 'course', 'name'],
    parents: [
      { field: 'department', Model: Department },
      { field: 'course', Model: Course },
      { field: 'branch', Model: Branch, optional: true }
    ],
    populate: ['department', 'course', 'branch']
  },

  'academic-years': {
    Model: AcademicYear,
    fields: [
      'department', 'course', 'branch', 'specialization',
      'name', 'yearNumber', 'isActive', 'sortOrder'
    ],
    required: ['department', 'course', 'name', 'yearNumber'],
    parents: [
      { field: 'department', Model: Department },
      { field: 'course', Model: Course },
      { field: 'branch', Model: Branch, optional: true },
      {
        field: 'specialization',
        Model: Specialization,
        optional: true
      }
    ],
    populate: ['department', 'course', 'branch', 'specialization']
  },

  semesters: {
    Model: Semester,
    fields: [
      'department', 'course', 'branch', 'specialization',
      'academicYear', 'name', 'semesterNumber',
      'isActive', 'sortOrder'
    ],
    required: [
      'department', 'course', 'academicYear',
      'name', 'semesterNumber'
    ],
    parents: [
      { field: 'department', Model: Department },
      { field: 'course', Model: Course },
      { field: 'branch', Model: Branch, optional: true },
      {
        field: 'specialization',
        Model: Specialization,
        optional: true
      },
      { field: 'academicYear', Model: AcademicYear }
    ],
    populate: [
      'department', 'course', 'branch',
      'specialization', 'academicYear'
    ]
  },

  subjects: {
    Model: Subject,
    fields: [
      'department', 'course', 'branch', 'specialization',
      'academicYear', 'semester', 'name', 'code',
      'description', 'credits', 'isActive', 'sortOrder'
    ],
    required: [
      'department', 'course', 'academicYear',
      'semester', 'name'
    ],
    parents: [
      { field: 'department', Model: Department },
      { field: 'course', Model: Course },
      { field: 'branch', Model: Branch, optional: true },
      {
        field: 'specialization',
        Model: Specialization,
        optional: true
      },
      { field: 'academicYear', Model: AcademicYear },
      { field: 'semester', Model: Semester }
    ],
    populate: [
      'department', 'course', 'branch',
      'specialization', 'academicYear', 'semester'
    ]
  },

  units: {
    Model: Unit,
    fields: [
      'department', 'course', 'branch', 'specialization',
      'academicYear', 'semester', 'subject', 'name',
      'description', 'unitNumber', 'topics',
      'isActive', 'sortOrder'
    ],
    required: [
      'department', 'course', 'academicYear',
      'semester', 'subject', 'name'
    ],
    parents: [
      { field: 'department', Model: Department },
      { field: 'course', Model: Course },
      { field: 'branch', Model: Branch, optional: true },
      {
        field: 'specialization',
        Model: Specialization,
        optional: true
      },
      { field: 'academicYear', Model: AcademicYear },
      { field: 'semester', Model: Semester },
      { field: 'subject', Model: Subject }
    ],
    populate: [
      'department', 'course', 'branch',
      'specialization', 'academicYear',
      'semester', 'subject'
    ]
  }
};

const getCatalogConfig = type => catalogModels[type] || null;

const prepareCatalogData = (config, body) => {
  const data = {};

  for (const field of config.fields) {
    if (body[field] === undefined) continue;

    const value = body[field];

    if (['name', 'code', 'description'].includes(field)) {
      data[field] = safeText(
        value,
        field === 'description' ? 3000 : 200
      );
    } else if (
      [
        'department', 'course', 'branch', 'specialization',
        'academicYear', 'semester', 'subject'
      ].includes(field)
    ) {
      data[field] = value || null;
    } else if (
      [
        'durationYears', 'yearNumber', 'semesterNumber',
        'unitNumber', 'credits', 'sortOrder'
      ].includes(field)
    ) {
      data[field] = Number(value);
    } else if (field === 'topics') {
      data[field] = Array.isArray(value)
        ? value.map(topic => safeText(topic, 300))
        : value;
    } else {
      data[field] = value;
    }
  }

  return data;
};

const validateCatalogData = async (config, data) => {
  for (const field of config.required) {
    if (
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ''
    ) {
      return `${field} is required.`;
    }
  }

  for (const parent of config.parents) {
    const value = data[parent.field];

    if (!value && parent.optional) continue;

    if (!value || !validId(value)) {
      return `Invalid ${parent.field}.`;
    }

    const exists = await parent.Model.exists({ _id: value });

    if (!exists) {
      return `${parent.field} was not found.`;
    }
  }

  const numericRules = {
    durationYears: [1, 10],
    yearNumber: [1, 10],
    semesterNumber: [1, 8],
    unitNumber: [1, 100],
    credits: [0, 100],
    sortOrder: [0, 100000]
  };

  for (const [field, range] of Object.entries(numericRules)) {
    if (data[field] === undefined) continue;

    const number = Number(data[field]);

    if (
      !Number.isFinite(number) ||
      number < range[0] ||
      number > range[1]
    ) {
      return `Invalid ${field}.`;
    }

    if (
      ['yearNumber', 'semesterNumber', 'unitNumber', 'sortOrder']
        .includes(field) &&
      !Number.isInteger(number)
    ) {
      return `${field} must be a whole number.`;
    }
  }

  if (
    data.isActive !== undefined &&
    typeof data.isActive !== 'boolean'
  ) {
    return 'isActive must be true or false.';
  }

  if (
    data.topics !== undefined &&
    (!Array.isArray(data.topics) || data.topics.length > 100)
  ) {
    return 'Invalid topics list.';
  }

  return null;
};

const populateCatalog = (query, config) => {
  for (const field of config.populate) {
    query = query.populate(field);
  }

  return query;
};

// Catalog overview
router.get('/catalog', async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : { isActive: true };

    const [
      departments,
      courses,
      branches,
      specializations,
      years,
      semesters,
      subjects,
      units
    ] = await Promise.all([
      Department.find(filter).sort({ sortOrder: 1, name: 1 }),
      Course.find(filter).populate('department').sort({ sortOrder: 1, name: 1 }),
      Branch.find(filter).populate('department course').sort({ sortOrder: 1, name: 1 }),
      Specialization.find(filter).populate('department course branch').sort({ sortOrder: 1, name: 1 }),
      AcademicYear.find(filter).populate('department course branch specialization').sort({ sortOrder: 1, yearNumber: 1 }),
      Semester.find(filter).populate('department course academicYear').sort({ sortOrder: 1, semesterNumber: 1 }),
      Subject.find(filter).populate('department course academicYear semester').sort({ sortOrder: 1, name: 1 }),
      Unit.find(filter).populate('department course academicYear semester subject').sort({ sortOrder: 1, unitNumber: 1 })
    ]);

    res.json({
      departments,
      courses,
      branches,
      specializations,
      years,
      semesters,
      subjects,
      units
    });
  } catch (error) {
    handleError(res, error, 'Could not load academic catalog.');
  }
});

// List catalog records
router.get('/catalog/:type', async (req, res) => {
  try {
    const config = getCatalogConfig(req.params.type);

    if (!config) {
      return res.status(404).json({
        message: 'Invalid catalog category.'
      });
    }

    const filter = {};

    if (req.user.role !== 'admin') {
      filter.isActive = true;
    } else if (req.query.isActive !== undefined) {
      if (!['true', 'false'].includes(req.query.isActive)) {
        return res.status(400).json({
          message: 'Invalid active filter.'
        });
      }

      filter.isActive = req.query.isActive === 'true';
    }

    for (const parent of config.parents) {
      const value = req.query[parent.field];

      if (value) {
        if (!validId(value)) {
          return res.status(400).json({
            message: `Invalid ${parent.field}.`
          });
        }

        filter[parent.field] = value;
      }
    }

    if (req.query.search) {
      const search = escapeRegex(safeText(req.query.search, 100));

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ];
      }
    }

    let query = config.Model.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(500);

    query = populateCatalog(query, config);

    res.json({ items: await query });
  } catch (error) {
    handleError(res, error, 'Could not load catalog.');
  }
});

// Create catalog record
router.post('/catalog/:type', requireAdmin, async (req, res) => {
  try {
    const config = getCatalogConfig(req.params.type);

    if (!config) {
      return res.status(404).json({
        message: 'Invalid catalog category.'
      });
    }

    const data = prepareCatalogData(config, req.body);
    const validationError = await validateCatalogData(config, data);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const item = await config.Model.create(data);

    res.status(201).json({
      message: 'Catalog entry created successfully.',
      item
    });
  } catch (error) {
    handleError(res, error, 'Could not create catalog entry.');
  }
});

// Update catalog record
router.put('/catalog/:type/:id', requireAdmin, async (req, res) => {
  try {
    const config = getCatalogConfig(req.params.type);

    if (!config) {
      return res.status(404).json({
        message: 'Invalid catalog category.'
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid catalog ID.'
      });
    }

    const item = await config.Model.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: 'Catalog entry not found.'
      });
    }

    const update = prepareCatalogData(config, req.body);
    const merged = { ...item.toObject(), ...update };

    const validationError = await validateCatalogData(config, merged);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    Object.assign(item, update);
    await item.save();

    res.json({
      message: 'Catalog entry updated successfully.',
      item
    });
  } catch (error) {
    handleError(res, error, 'Could not update catalog entry.');
  }
});

// Delete catalog record safely
router.delete('/catalog/:type/:id', requireAdmin, async (req, res) => {
  try {
    const config = getCatalogConfig(req.params.type);

    if (!config) {
      return res.status(404).json({
        message: 'Invalid catalog category.'
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid catalog ID.'
      });
    }

    const item = await config.Model.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: 'Catalog entry not found.'
      });
    }

    const dependencies = {
      departments: [
        [Course, 'department'],
        [Branch, 'department'],
        [Specialization, 'department'],
        [AcademicYear, 'department'],
        [Semester, 'department'],
        [Subject, 'department'],
        [Unit, 'department'],
        [Material, 'departmentRef']
      ],
      courses: [
        [Branch, 'course'],
        [Specialization, 'course'],
        [AcademicYear, 'course'],
        [Semester, 'course'],
        [Subject, 'course'],
        [Unit, 'course'],
        [Material, 'courseRef']
      ],
      branches: [
        [Specialization, 'branch'],
        [AcademicYear, 'branch'],
        [Semester, 'branch'],
        [Subject, 'branch'],
        [Unit, 'branch'],
        [Material, 'branchRef']
      ],
      specializations: [
        [AcademicYear, 'specialization'],
        [Semester, 'specialization'],
        [Subject, 'specialization'],
        [Unit, 'specialization'],
        [Material, 'specializationRef']
      ],
      'academic-years': [
        [Semester, 'academicYear'],
        [Subject, 'academicYear'],
        [Unit, 'academicYear'],
        [Material, 'academicYearRef']
      ],
      semesters: [
        [Subject, 'semester'],
        [Unit, 'semester'],
        [Material, 'semesterRef']
      ],
      subjects: [
        [Unit, 'subject'],
        [Material, 'subjectRef']
      ],
      units: [
        [Material, 'unitRef']
      ]
    };

    for (const [Model, field] of dependencies[req.params.type] || []) {
      const exists = await Model.exists({
        [field]: item._id
      });

      if (exists) {
        return res.status(409).json({
          message: 'This entry is linked to other academic records or study materials. Remove or update those links first.'
        });
      }
    }

    await config.Model.findByIdAndDelete(item._id);

    res.json({
      message: 'Catalog entry deleted successfully.'
    });
  } catch (error) {
    handleError(res, error, 'Could not delete catalog entry.');
  }
});

// ==========================================
// QUIZZES — ADMIN MANAGEMENT
// ==========================================

router.post('/quizzes', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      course,
      semester,
      subject,
      topic,
      durationMinutes,
      questions,
      status
    } = req.body;

    if (
      !safeText(title, 200) ||
      !Array.isArray(questions) ||
      questions.length < 1 ||
      questions.length > 100
    ) {
      return res.status(400).json({
        message: 'Title and 1 to 100 questions are required.'
      });
    }

    if (
      !validSemester(semester) ||
      !Number.isInteger(Number(durationMinutes)) ||
      Number(durationMinutes) < 1 ||
      Number(durationMinutes) > 300
    ) {
      return res.status(400).json({
        message: 'Invalid semester or quiz duration.'
      });
    }

    for (const question of questions) {
      if (
        !safeText(question.question, 2000) ||
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        question.options.length > 6 ||
        question.options.some(option => !safeText(option, 500)) ||
        !Number.isInteger(Number(question.correctAnswer)) ||
        Number(question.correctAnswer) < 0 ||
        Number(question.correctAnswer) >= question.options.length
      ) {
        return res.status(400).json({
          message: 'One or more questions have invalid options or answers.'
        });
      }
    }

    const quiz = await Quiz.create({
      title: safeText(title, 200),
      description: safeText(description, 3000),
      department: safeText(department, 150) || 'All',
      course: safeText(course, 150) || 'All',
      semester: semester ? Number(semester) : null,
      subject: safeText(subject, 150),
      topic: safeText(topic, 150),
      durationMinutes: Number(durationMinutes),
      questions: questions.map(question => ({
        question: safeText(question.question, 2000),
        options: question.options.map(option => safeText(option, 500)),
        correctAnswer: Number(question.correctAnswer),
        explanation: safeText(question.explanation, 2000),
        marks: Math.min(100, Math.max(0, Number(question.marks) || 1))
      })),
      status: ['draft', 'published', 'archived'].includes(status)
        ? status
        : 'draft',
      createdBy: req.user._id
    });

    res.status(201).json({
      message: 'Quiz created successfully.',
      quiz: cleanQuiz(quiz)
    });
  } catch (error) {
    handleError(res, error, 'Could not create quiz.');
  }
});

router.get('/quizzes', async (req, res) => {
  try {
    const filter = {};

    if (req.user.role !== 'admin') {
      filter.status = 'published';
    } else if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.department) {
      filter.department = { $in: ['All', req.query.department] };
    }

    if (req.query.course) {
      filter.course = { $in: ['All', req.query.course] };
    }

    if (req.query.semester && validSemester(req.query.semester)) {
      filter.$or = [
        { semester: Number(req.query.semester) },
        { semester: null }
      ];
    }

    if (req.query.subject) {
      filter.subject = {
        $regex: escapeRegex(safeText(req.query.subject, 100)),
        $options: 'i'
      };
    }

    const quizzes = await Quiz.find(filter)
      .select('-questions.correctAnswer -questions.explanation')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ quizzes });
  } catch (error) {
    handleError(res, error, 'Could not load quizzes.');
  }
});

router.get('/quizzes/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid quiz ID.' });
    }

    const quiz = await Quiz.findById(req.params.id);

    if (!quiz || (req.user.role !== 'admin' && quiz.status !== 'published')) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    res.json({ quiz: cleanQuiz(quiz) });
  } catch (error) {
    handleError(res, error, 'Could not load quiz.');
  }
});

router.put('/quizzes/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid quiz ID.' });
    }

    const allowed = [
      'title', 'description', 'department', 'course',
      'semester', 'subject', 'topic', 'durationMinutes',
      'questions', 'status'
    ];

    const update = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    if (update.semester !== undefined && !validSemester(update.semester)) {
      return res.status(400).json({ message: 'Invalid semester.' });
    }

    if (
      update.durationMinutes !== undefined &&
      (!Number.isInteger(Number(update.durationMinutes)) ||
        Number(update.durationMinutes) < 1 ||
        Number(update.durationMinutes) > 300)
    ) {
      return res.status(400).json({ message: 'Invalid quiz duration.' });
    }

    if (update.questions !== undefined) {
      if (
        !Array.isArray(update.questions) ||
        update.questions.length < 1 ||
        update.questions.length > 100
      ) {
        return res.status(400).json({ message: 'Invalid question list.' });
      }

      for (const question of update.questions) {
        if (
          !safeText(question.question, 2000) ||
          !Array.isArray(question.options) ||
          question.options.length < 2 ||
          question.options.length > 6 ||
          question.options.some(option => !safeText(option, 500)) ||
          !Number.isInteger(Number(question.correctAnswer)) ||
          Number(question.correctAnswer) < 0 ||
          Number(question.correctAnswer) >= question.options.length
        ) {
          return res.status(400).json({
            message: 'One or more questions are invalid.'
          });
        }
      }

      update.questions = update.questions.map(question => ({
        question: safeText(question.question, 2000),
        options: question.options.map(option => safeText(option, 500)),
        correctAnswer: Number(question.correctAnswer),
        explanation: safeText(question.explanation, 2000),
        marks: Math.min(100, Math.max(0, Number(question.marks) || 1))
      }));
    }

    if (
      update.status !== undefined &&
      !['draft', 'published', 'archived'].includes(update.status)
    ) {
      return res.status(400).json({ message: 'Invalid quiz status.' });
    }

    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    res.json({
      message: 'Quiz updated.',
      quiz: cleanQuiz(quiz)
    });
  } catch (error) {
    handleError(res, error, 'Could not update quiz.');
  }
});

router.delete('/quizzes/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid quiz ID.' });
    }

    const quiz = await Quiz.findByIdAndDelete(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    await QuizAttempt.deleteMany({ quiz: quiz._id });

    res.json({ message: 'Quiz and its attempts deleted.' });
  } catch (error) {
    handleError(res, error, 'Could not delete quiz.');
  }
});

// ==========================================
// QUIZ ATTEMPTS
// ==========================================

router.post('/quizzes/:id/start', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid quiz ID.' });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      status: 'published'
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: getStudentId(req),
      startedAt: new Date(),
      status: 'in-progress'
    });

    res.status(201).json({
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      durationMinutes: quiz.durationMinutes,
      quiz: cleanQuiz(quiz)
    });
  } catch (error) {
    handleError(res, error, 'Could not start quiz.');
  }
});

router.post('/attempts/:id/submit', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid attempt ID.' });
    }

    const attempt = await QuizAttempt.findOne({
      _id: req.params.id,
      student: getStudentId(req)
    });

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(409).json({
        message: 'This attempt has already been submitted.'
      });
    }

    const quiz = await Quiz.findById(attempt.quiz);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const elapsed = Date.now() - new Date(attempt.startedAt).getTime();
    const timeLimit = quiz.durationMinutes * 60 * 1000;

    if (elapsed > timeLimit + 5000) {
      attempt.status = 'expired';
      attempt.submittedAt = new Date();
      await attempt.save();

      return res.status(400).json({
        message: 'Quiz time has expired.'
      });
    }

    const submittedAnswers = Array.isArray(req.body.answers)
      ? req.body.answers
      : [];

    const answerMap = new Map();

    for (const answer of submittedAnswers) {
      if (
        answer.questionId &&
        validId(answer.questionId) &&
        Number.isInteger(Number(answer.selectedOption))
      ) {
        answerMap.set(
          String(answer.questionId),
          Number(answer.selectedOption)
        );
      }
    }

    let score = 0;
    let totalMarks = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const savedAnswers = [];

    for (const question of quiz.questions) {
      const questionId = String(question._id);
      const selected = answerMap.get(questionId);

      const hasAnswer =
        selected !== undefined &&
        selected >= 0 &&
        selected < question.options.length;

      totalMarks += question.marks;

      if (!hasAnswer) {
        unansweredCount++;
        continue;
      }

      savedAnswers.push({
        questionId: question._id,
        selectedOption: selected
      });

      if (selected === question.correctAnswer) {
        score += question.marks;
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    attempt.answers = savedAnswers;
    attempt.score = score;
    attempt.totalMarks = totalMarks;
    attempt.correctCount = correctCount;
    attempt.wrongCount = wrongCount;
    attempt.unansweredCount = unansweredCount;
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();

    await attempt.save();

    res.json({
      message: 'Quiz submitted successfully.',
      result: {
        attemptId: attempt._id,
        score,
        totalMarks,
        correctCount,
        wrongCount,
        unansweredCount,
        percentage: totalMarks
          ? Math.round((score / totalMarks) * 100)
          : 0,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (error) {
    handleError(res, error, 'Could not submit quiz.');
  }
});

router.get('/my/quiz-history', async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      student: getStudentId(req)
    })
      .populate('quiz', 'title subject topic durationMinutes')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ attempts });
  } catch (error) {
    handleError(res, error, 'Could not load quiz history.');
  }
});

router.get('/attempts/:id/result', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid attempt ID.' });
    }

    const attempt = await QuizAttempt.findOne({
      _id: req.params.id,
      student: getStudentId(req),
      status: 'submitted'
    }).populate('quiz');

    if (!attempt || !attempt.quiz) {
      return res.status(404).json({ message: 'Result not found.' });
    }

    const answers = attempt.quiz.questions.map(question => {
      const selected = attempt.answers.find(
        answer => String(answer.questionId) === String(question._id)
      );

      return {
        questionId: question._id,
        question: question.question,
        options: question.options,
        selectedOption: selected?.selectedOption ?? null,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        marks: question.marks
      };
    });

    res.json({
      result: {
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        unansweredCount: attempt.unansweredCount,
        submittedAt: attempt.submittedAt,
        answers
      }
    });
  } catch (error) {
    handleError(res, error, 'Could not load quiz result.');
  }
});

router.get('/quizzes/:id/leaderboard', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid quiz ID.' });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      status: 'published'
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const attempts = await QuizAttempt.find({
      quiz: quiz._id,
      status: 'submitted'
    })
      .populate('student', 'name')
      .sort({ score: -1, submittedAt: 1 })
      .limit(50)
      .select('student score totalMarks submittedAt');

    res.json({
      leaderboard: attempts
        .filter(item => item.student)
        .map((item, index) => ({
          rank: index + 1,
          name: item.student.name,
          score: item.score,
          totalMarks: item.totalMarks,
          submittedAt: item.submittedAt
        }))
    });
  } catch (error) {
    handleError(res, error, 'Could not load leaderboard.');
  }
});

// ==========================================
// BOOKMARKS
// ==========================================

router.get('/bookmarks', async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({
      student: getStudentId(req)
    })
      .populate('material')
      .sort({ createdAt: -1 });

    res.json({
      bookmarks: bookmarks.filter(item => item.material)
    });
  } catch (error) {
    handleError(res, error, 'Could not load bookmarks.');
  }
});

router.post('/bookmarks/:materialId', async (req, res) => {
  try {
    if (!validId(req.params.materialId)) {
      return res.status(400).json({ message: 'Invalid material ID.' });
    }

    const material = await Material.findById(req.params.materialId);

    if (!material) {
      return res.status(404).json({ message: 'Material not found.' });
    }

    const bookmark = await Bookmark.findOneAndUpdate(
      {
        student: getStudentId(req),
        material: material._id
      },
      {
        $setOnInsert: {
          student: getStudentId(req),
          material: material._id
        }
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: 'Material bookmarked.',
      bookmark
    });
  } catch (error) {
    handleError(res, error, 'Could not bookmark material.');
  }
});

router.delete('/bookmarks/:materialId', async (req, res) => {
  try {
    if (!validId(req.params.materialId)) {
      return res.status(400).json({ message: 'Invalid material ID.' });
    }

    await Bookmark.findOneAndDelete({
      student: getStudentId(req),
      material: req.params.materialId
    });

    res.json({ message: 'Bookmark removed.' });
  } catch (error) {
    handleError(res, error, 'Could not remove bookmark.');
  }
});

// ==========================================
// PERSONAL NOTES
// ==========================================

router.get('/notes', async (req, res) => {
  try {
    const notes = await StudentNote.find({
      student: getStudentId(req)
    }).sort({ isPinned: -1, updatedAt: -1 });

    res.json({ notes });
  } catch (error) {
    handleError(res, error, 'Could not load notes.');
  }
});

router.post('/notes', async (req, res) => {
  try {
    const title = safeText(req.body.title, 150);

    if (!title) {
      return res.status(400).json({ message: 'Note title is required.' });
    }

    const note = await StudentNote.create({
      student: getStudentId(req),
      title,
      content: safeText(req.body.content, 20000),
      subject: safeText(req.body.subject, 150),
      department: safeText(req.body.department, 150),
      semester: req.body.semester ? Number(req.body.semester) : null
    });

    res.status(201).json({
      message: 'Note created.',
      note
    });
  } catch (error) {
    handleError(res, error, 'Could not create note.');
  }
});

router.put('/notes/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID.' });
    }

    const update = {};

    if (req.body.title !== undefined) {
      update.title = safeText(req.body.title, 150);

      if (!update.title) {
        return res.status(400).json({ message: 'Title is required.' });
      }
    }

    if (req.body.content !== undefined) {
      update.content = safeText(req.body.content, 20000);
    }

    if (req.body.subject !== undefined) {
      update.subject = safeText(req.body.subject, 150);
    }

    if (req.body.department !== undefined) {
      update.department = safeText(req.body.department, 150);
    }

    if (req.body.semester !== undefined) {
      if (!validSemester(req.body.semester)) {
        return res.status(400).json({ message: 'Invalid semester.' });
      }

      update.semester = req.body.semester
        ? Number(req.body.semester)
        : null;
    }

    if (req.body.isPinned !== undefined) {
      update.isPinned = req.body.isPinned === true;
    }

    const note = await StudentNote.findOneAndUpdate(
      {
        _id: req.params.id,
        student: getStudentId(req)
      },
      update,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    res.json({ message: 'Note updated.', note });
  } catch (error) {
    handleError(res, error, 'Could not update note.');
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID.' });
    }

    const note = await StudentNote.findOneAndDelete({
      _id: req.params.id,
      student: getStudentId(req)
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found.' });
    }

    res.json({ message: 'Note deleted.' });
  } catch (error) {
    handleError(res, error, 'Could not delete note.');
  }
});

// ==========================================
// STUDY PLANNER
// ==========================================

router.get('/planner', async (req, res) => {
  try {
    const tasks = await PlannerTask.find({
      student: getStudentId(req)
    }).sort({ dueDate: 1, createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    handleError(res, error, 'Could not load planner.');
  }
});

router.post('/planner', async (req, res) => {
  try {
    const title = safeText(req.body.title, 200);

    if (!title) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    const priority = ['low', 'medium', 'high'].includes(req.body.priority)
      ? req.body.priority
      : 'medium';

    const dueDate = req.body.dueDate
      ? new Date(req.body.dueDate)
      : null;

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ message: 'Invalid due date.' });
    }

    const task = await PlannerTask.create({
      student: getStudentId(req),
      title,
      description: safeText(req.body.description, 2000),
      subject: safeText(req.body.subject, 150),
      dueDate,
      priority
    });

    res.status(201).json({
      message: 'Task created.',
      task
    });
  } catch (error) {
    handleError(res, error, 'Could not create task.');
  }
});

router.put('/planner/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }

    const update = {};

    if (req.body.title !== undefined) {
      update.title = safeText(req.body.title, 200);

      if (!update.title) {
        return res.status(400).json({ message: 'Task title is required.' });
      }
    }

    if (req.body.description !== undefined) {
      update.description = safeText(req.body.description, 2000);
    }

    if (req.body.subject !== undefined) {
      update.subject = safeText(req.body.subject, 150);
    }

    if (req.body.dueDate !== undefined) {
      update.dueDate = req.body.dueDate
        ? new Date(req.body.dueDate)
        : null;

      if (
        update.dueDate &&
        Number.isNaN(update.dueDate.getTime())
      ) {
        return res.status(400).json({ message: 'Invalid due date.' });
      }
    }

    if (req.body.priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(req.body.priority)) {
        return res.status(400).json({ message: 'Invalid priority.' });
      }

      update.priority = req.body.priority;
    }

    if (req.body.status !== undefined) {
      if (!['pending', 'completed'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid task status.' });
      }

      update.status = req.body.status;
    }

    const task = await PlannerTask.findOneAndUpdate(
      {
        _id: req.params.id,
        student: getStudentId(req)
      },
      update,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json({ message: 'Task updated.', task });
  } catch (error) {
    handleError(res, error, 'Could not update task.');
  }
});

router.delete('/planner/:id', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }

    const task = await PlannerTask.findOneAndDelete({
      _id: req.params.id,
      student: getStudentId(req)
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    res.json({ message: 'Task deleted.' });
  } catch (error) {
    handleError(res, error, 'Could not delete task.');
  }
});

// ==========================================
// DISCUSSION FORUM
// ==========================================

router.get('/discussions', async (req, res) => {
  try {
    const filter = { status: 'open' };

    if (req.query.department) {
      filter.department = safeText(req.query.department, 150);
    }

    if (req.query.subject) {
      filter.subject = {
        $regex: escapeRegex(safeText(req.query.subject, 100)),
        $options: 'i'
      };
    }

    const discussions = await Discussion.find(filter)
      .populate('author', 'name profile.photoUrl')
      .populate('replies.author', 'name profile.photoUrl')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ discussions });
  } catch (error) {
    handleError(res, error, 'Could not load discussions.');
  }
});

router.post('/discussions', async (req, res) => {
  try {
    const title = safeText(req.body.title, 200);
    const content = safeText(req.body.content, 10000);

    if (!title || !content) {
      return res.status(400).json({
        message: 'Discussion title and content are required.'
      });
    }

    if (!validSemester(req.body.semester)) {
      return res.status(400).json({ message: 'Invalid semester.' });
    }

    const discussion = await Discussion.create({
      author: getStudentId(req),
      title,
      content,
      department: safeText(req.body.department, 150),
      course: safeText(req.body.course, 150),
      semester: req.body.semester
        ? Number(req.body.semester)
        : null,
      subject: safeText(req.body.subject, 150)
    });

    await discussion.populate('author', 'name profile.photoUrl');

    res.status(201).json({
      message: 'Discussion posted.',
      discussion
    });
  } catch (error) {
    handleError(res, error, 'Could not create discussion.');
  }
});

router.post('/discussions/:id/replies', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid discussion ID.' });
    }

    const content = safeText(req.body.content, 5000);

    if (!content) {
      return res.status(400).json({ message: 'Reply cannot be empty.' });
    }

    const discussion = await Discussion.findOne({
      _id: req.params.id,
      status: 'open'
    });

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found.' });
    }

    discussion.replies.push({
      author: getStudentId(req),
      content
    });

    await discussion.save();
    await discussion.populate('replies.author', 'name profile.photoUrl');

    res.status(201).json({
      message: 'Reply added.',
      discussion
    });
  } catch (error) {
    handleError(res, error, 'Could not add reply.');
  }
});

router.post('/discussions/:id/report', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid discussion ID.' });
    }

    const discussion = await Discussion.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'open',
        author: { $ne: getStudentId(req) }
      },
      { status: 'reported' },
      { new: true }
    );

    if (!discussion) {
      return res.status(404).json({
        message: 'Discussion not found or cannot be reported.'
      });
    }

    res.json({ message: 'Discussion reported.' });
  } catch (error) {
    handleError(res, error, 'Could not report discussion.');
  }
});

router.patch('/admin/discussions/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid discussion ID.' });
    }

    if (!['open', 'closed', 'removed'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid moderation status.' });
    }

    const discussion = await Discussion.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found.' });
    }

    res.json({ message: 'Discussion moderated.', discussion });
  } catch (error) {
    handleError(res, error, 'Could not moderate discussion.');
  }
});

router.get('/admin/reported-discussions', requireAdmin, async (_req, res) => {
  try {
    const discussions = await Discussion.find({ status: 'reported' })
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    res.json({ discussions });
  } catch (error) {
    handleError(res, error, 'Could not load reported discussions.');
  }
});

// ==========================================
// ANNOUNCEMENTS
// ==========================================

router.get('/announcements', async (req, res) => {
  try {
    const user = await User.findById(getStudentId(req)).select('profile');

    const department = user?.profile?.department || '';
    const course = user?.profile?.course || '';
    const semester = Number(user?.profile?.semester) || null;

    const announcements = await Announcement.find({
      published: true,
      targetDepartment: { $in: ['All', department] },
      targetCourse: { $in: ['All', course] },
      $or: [
        { targetSemester: null },
        ...(semester ? [{ targetSemester: semester }] : [])
      ]
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ announcements });
  } catch (error) {
    handleError(res, error, 'Could not load announcements.');
  }
});

router.post('/announcements', requireAdmin, async (req, res) => {
  try {
    const title = safeText(req.body.title, 200);
    const message = safeText(req.body.message, 5000);

    if (!title || !message) {
      return res.status(400).json({
        message: 'Announcement title and message are required.'
      });
    }

    const category = [
      'general', 'academic', 'exam', 'deadline', 'event'
    ].includes(req.body.category)
      ? req.body.category
      : 'general';

    if (!validSemester(req.body.targetSemester)) {
      return res.status(400).json({ message: 'Invalid target semester.' });
    }

    const published = req.body.published === true;

    const announcement = await Announcement.create({
      title,
      message,
      targetDepartment: safeText(req.body.targetDepartment, 150) || 'All',
      targetCourse: safeText(req.body.targetCourse, 150) || 'All',
      targetSemester: req.body.targetSemester
        ? Number(req.body.targetSemester)
        : null,
      category,
      published,
      createdBy: req.user._id
    });

    if (published) {
      const userFilter = { role: 'student' };

      if (announcement.targetDepartment !== 'All') {
        userFilter['profile.department'] =
          announcement.targetDepartment;
      }

      if (announcement.targetCourse !== 'All') {
        userFilter['profile.course'] =
          announcement.targetCourse;
      }

      if (announcement.targetSemester !== null) {
        userFilter['profile.semester'] =
          String(announcement.targetSemester);
      }

      const students = await User.find(userFilter).select('_id');

      if (students.length) {
        await Notification.insertMany(
          students.map(student => ({
            recipient: student._id,
            title,
            message,
            category: 'announcement',
            relatedId: announcement._id
          }))
        );
      }
    }

    res.status(201).json({
      message: 'Announcement created.',
      announcement
    });
  } catch (error) {
    handleError(res, error, 'Could not create announcement.');
  }
});

router.get('/admin/announcements', requireAdmin, async (_req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ announcements });
  } catch (error) {
    handleError(res, error, 'Could not load announcements.');
  }
});

router.put('/announcements/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid announcement ID.' });
    }

    const allowed = [
      'title', 'message', 'targetDepartment',
      'targetCourse', 'targetSemester', 'category', 'published'
    ];

    const update = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    if (update.title !== undefined) {
      update.title = safeText(update.title, 200);

      if (!update.title) {
        return res.status(400).json({ message: 'Title is required.' });
      }
    }

    if (update.message !== undefined) {
      update.message = safeText(update.message, 5000);

      if (!update.message) {
        return res.status(400).json({ message: 'Message is required.' });
      }
    }

    if (
      update.targetSemester !== undefined &&
      !validSemester(update.targetSemester)
    ) {
      return res.status(400).json({ message: 'Invalid semester.' });
    }

    if (
      update.category !== undefined &&
      ![
        'general', 'academic', 'exam', 'deadline', 'event'
      ].includes(update.category)
    ) {
      return res.status(400).json({ message: 'Invalid category.' });
    }

    if (update.targetDepartment !== undefined) {
      update.targetDepartment =
        safeText(update.targetDepartment, 150) || 'All';
    }

    if (update.targetCourse !== undefined) {
      update.targetCourse =
        safeText(update.targetCourse, 150) || 'All';
    }

    if (update.targetSemester !== undefined) {
      update.targetSemester = update.targetSemester
        ? Number(update.targetSemester)
        : null;
    }

    if (
      update.published !== undefined &&
      typeof update.published !== 'boolean'
    ) {
      return res.status(400).json({ message: 'Invalid published value.' });
    }

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    res.json({ message: 'Announcement updated.', announcement });
  } catch (error) {
    handleError(res, error, 'Could not update announcement.');
  }
});

router.delete('/announcements/:id', requireAdmin, async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid announcement ID.' });
    }

    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }

    await Notification.deleteMany({
      relatedId: announcement._id
    });

    res.json({ message: 'Announcement deleted.' });
  } catch (error) {
    handleError(res, error, 'Could not delete announcement.');
  }
});

// ==========================================
// NOTIFICATIONS
// ==========================================

router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: getStudentId(req)
    })
      .sort({ createdAt: -1 })
      .limit(100);

    const unreadCount = await Notification.countDocuments({
      recipient: getStudentId(req),
      isRead: false
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    handleError(res, error, 'Could not load notifications.');
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification ID.' });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: getStudentId(req)
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({
      message: 'Notification marked as read.',
      notification
    });
  } catch (error) {
    handleError(res, error, 'Could not update notification.');
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: getStudentId(req),
        isRead: false
      },
      { isRead: true }
    );

    res.json({
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    handleError(res, error, 'Could not update notifications.');
  }
});

export default router;
