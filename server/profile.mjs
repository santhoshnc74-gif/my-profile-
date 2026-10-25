import { z } from 'zod';

const text = (min, max) => z.string().trim().min(min).max(max)
  .refine((value) => !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(value), 'Unsupported control characters');

export const httpsUrl = z.string().max(2048).refine((value) => {
  if (value === '') return true;
  if (/[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && Boolean(url.hostname);
  } catch { return false; }
}, 'Use a complete HTTPS URL or leave blank');

export const profileSchema = z.object({
  name: text(1, 100),
  role: text(1, 180),
  headline: text(1, 200),
  bio: text(1, 2500),
  education: z.object({
    heading: text(1, 100).default('Education'),
    institution: text(1, 150),
    degree: text(1, 180),
    graduationYear: z.number().int().min(2000).max(2100),
    graduationLabel: text(1, 100).default('Expected graduation'),
    yearOfStudy: text(1, 50),
  }).strict(),
  futurePlansHeading: text(1, 100).default('Future plans'),
  goals: z.array(z.object({title: text(1, 120), description: text(1, 600)}).strict()).max(6),
  currentWork: z.object({
    name: text(1, 100),
    description: text(1, 1500),
    stack: z.array(text(1, 60)).min(1).max(16),
  }).strict(),
  links: z.object({
    github: httpsUrl,
    linkedin: httpsUrl,
    email: z.union([z.literal(''), z.string().max(254).email()]),
    website: httpsUrl,
    resume: httpsUrl,
  }).strict(),
  profiles: z.array(z.object({label: text(1, 60), url: httpsUrl.refine(Boolean, 'URL required')}).strict()).max(8),
  contact: z.object({heading: text(1, 100), description: text(1, 400)}).strict().default({heading: 'Connect', description: 'Let’s start a conversation.'}),
  stations: z.object({
    projects: z.object({heading: text(1, 100).default('Projects'), subtitle: text(1, 200).default('Garment & textile factory management system'), visible: z.boolean().default(true)}).strict().default({heading: 'Projects', subtitle: 'Garment & textile factory management system', visible: true}),
    learning: z.object({heading: text(1, 100).default('Learning'), subtitle: text(1, 200).default('Education & technical curiosity'), visible: z.boolean().default(true)}).strict().default({heading: 'Learning', subtitle: 'Education & technical curiosity', visible: true}),
    plans: z.object({heading: text(1, 100).default('Future plans'), subtitle: text(1, 200).default('Goals & entrepreneurial roadmap'), visible: z.boolean().default(true)}).strict().default({heading: 'Future plans', subtitle: 'Goals & entrepreneurial roadmap', visible: true}),
    connect: z.object({heading: text(1, 100).default('Connect'), subtitle: text(1, 200).default('Let’s start a conversation.'), visible: z.boolean().default(true)}).strict().default({heading: 'Connect', subtitle: 'Let’s start a conversation.', visible: true}),
  }).strict().default({
    projects: {heading: 'Projects', subtitle: 'Garment & textile factory management system', visible: true},
    learning: {heading: 'Learning', subtitle: 'Education & technical curiosity', visible: true},
    plans: {heading: 'Future plans', subtitle: 'Goals & entrepreneurial roadmap', visible: true},
    connect: {heading: 'Connect', subtitle: 'Let’s start a conversation.', visible: true},
  }),
  appearance: z.object({
    carColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#166069'),
    simpleViewDefault: z.boolean().default(false),
  }).strict().default({
    carColor: '#166069',
    simpleViewDefault: false,
  }),
  autoPublish: z.boolean().default(false),
}).strict();

export function seedProfile(username = 'santhoshnc74-gif') {
  return profileSchema.parse({
    name: 'SANTHOSH N C',
    role: 'B.Tech student in AI & Data Science',
    headline: 'Curiosity,\nput into practice.',
    bio: 'I’m Santhosh, a third-year B.Tech student in Artificial Intelligence & Data Science at Excel Engineering College. I learn through practical projects and aim to become an entrepreneur.',
    education: {institution: 'Excel Engineering College', degree: 'B.Tech · Artificial Intelligence & Data Science', graduationYear: 2028, yearOfStudy: 'Third year'},
    goals: [
      {title: 'Keep learning', description: 'Strengthen my technical knowledge through study and hands-on projects.'},
      {title: 'Become an entrepreneur', description: 'Build the knowledge and experience to create a venture of my own.'},
    ],
    currentWork: {
      name: 'TEXFLOW',
      description: 'A garment and textile factory management project for workforce attendance, orders, and production tracking.',
      stack: ['React', 'TypeScript', 'FastAPI', 'Python', 'PostgreSQL'],
    },
    links: {github: `https://github.com/${username}`, linkedin: '', email: '', website: '', resume: ''},
    profiles: [],
  });
}

export const PROJECTS = Object.freeze([
  {id: 'TEXAFLOW', name: 'TEXFLOW', description: 'Garment and textile factory management for workforce attendance, orders, and production.', stack: ['TypeScript'], image: '/assets/texflow.png'},
  {id: 'aids-study-assistant', name: 'aids-study-assistant', description: '', stack: ['HTML'], image: '/assets/study.png'},
  {id: 'scaler-openenv-sql-tuner', name: 'scaler-openenv-sql-tuner', description: '', stack: ['Python'], image: '/assets/sql.png'},
]);

export function seedProjects(username = 'santhoshnc74-gif') {
  return PROJECTS.map((project) => ({...project, githubUrl: `https://github.com/${username}/${project.id}`, liveUrl: '', stars: null, updatedAt: null}));
}
