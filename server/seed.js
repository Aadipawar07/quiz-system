import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from './models/Question.js';

dotenv.config();

const questions = [
  {
    questionText: 'What does CPU stand for?',
    options: ['Central Processing Unit', 'Central Program Utility', 'Core Processing Unit', 'Central Peripheral Unit'],
    correctAnswer: 0,
    marks: 1
  },
  {
    questionText: 'Which data structure uses LIFO (Last In, First Out) order?',
    options: ['Queue', 'Stack', 'Linked List', 'Tree'],
    correctAnswer: 1,
    marks: 1
  },
  {
    questionText: 'What is the full form of HTTP?',
    options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'HyperText Transmission Protocol', 'Hybrid Text Transfer Protocol'],
    correctAnswer: 0,
    marks: 1
  },
  {
    questionText: 'Which of the following is NOT an object-oriented programming language?',
    options: ['Java', 'Python', 'C', 'C++'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'What does RAM stand for?',
    options: ['Read Access Memory', 'Random Access Memory', 'Rapid Access Module', 'Random Application Memory'],
    correctAnswer: 1,
    marks: 1
  },
  {
    questionText: 'Which layer of the OSI model is responsible for routing?',
    options: ['Data Link Layer', 'Transport Layer', 'Network Layer', 'Session Layer'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'What is the time complexity of binary search?',
    options: ['O(n)', 'O(n²)', 'O(log n)', 'O(n log n)'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'Which of the following is a NoSQL database?',
    options: ['MySQL', 'PostgreSQL', 'Oracle', 'MongoDB'],
    correctAnswer: 3,
    marks: 1
  },
  {
    questionText: 'What symbol is used for single-line comments in JavaScript?',
    options: ['#', '//', '/* */', '--'],
    correctAnswer: 1,
    marks: 1
  },
  {
    questionText: 'Which protocol is used to send emails?',
    options: ['FTP', 'SMTP', 'HTTP', 'SSH'],
    correctAnswer: 1,
    marks: 1
  },
  {
    questionText: 'What is the base of the hexadecimal number system?',
    options: ['2', '8', '10', '16'],
    correctAnswer: 3,
    marks: 1
  },
  {
    questionText: 'Which sorting algorithm has the best average-case time complexity?',
    options: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'What does SQL stand for?',
    options: ['Structured Query Language', 'Simple Query Language', 'Standard Query Logic', 'Structured Question Language'],
    correctAnswer: 0,
    marks: 1
  },
  {
    questionText: 'Which keyword is used to define a constant in JavaScript?',
    options: ['var', 'let', 'const', 'static'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'What is the default port for HTTPS?',
    options: ['80', '21', '443', '8080'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'Which of the following is a primary key property?',
    options: ['It can be NULL', 'It can have duplicate values', 'It must be unique and NOT NULL', 'It must be a number'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'What does DNS stand for?',
    options: ['Dynamic Naming Service', 'Domain Name System', 'Data Network Service', 'Distributed Name Server'],
    correctAnswer: 1,
    marks: 1
  },
  {
    questionText: 'Which of the following is used to find elements in an HTML page using JavaScript?',
    options: ['document.findById()', 'document.querySelector()', 'document.search()', 'document.locate()'],
    correctAnswer: 1,
    marks: 1
  },
  {
    questionText: 'What is the purpose of a firewall in networking?',
    options: ['To speed up internet connection', 'To store network data', 'To monitor and control incoming and outgoing traffic', 'To assign IP addresses'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'Which data structure is used in Breadth-First Search (BFS)?',
    options: ['Stack', 'Queue', 'Heap', 'Array'],
    correctAnswer: 1,
    marks: 1
  },
  {
    questionText: 'What does API stand for?',
    options: ['Application Programming Interface', 'Applied Protocol Integration', 'Automated Program Interaction', 'Application Process Integration'],
    correctAnswer: 0,
    marks: 1
  },
  {
    questionText: 'Which CSS property is used to change the text color?',
    options: ['font-color', 'text-color', 'color', 'foreground'],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'Which of the following is an example of an interpreted language?',
    options: ['C', 'C++', 'Java', 'Python'],
    correctAnswer: 3,
    marks: 1
  },
  {
    questionText: 'What is a foreign key in a relational database?',
    options: [
      'A key used for encryption',
      'A key that uniquely identifies a record in its own table',
      'A key that references the primary key of another table',
      'A key that can have NULL values only'
    ],
    correctAnswer: 2,
    marks: 1
  },
  {
    questionText: 'Which HTTP method is used to update an existing resource?',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
    correctAnswer: 2,
    marks: 1
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Clear existing questions to avoid duplicates on re-run
    await Question.deleteMany({});
    console.log('🗑️  Cleared existing questions');

    const inserted = await Question.insertMany(questions);
    console.log(`🌱 Seeded ${inserted.length} questions successfully`);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  }
};

seed();
