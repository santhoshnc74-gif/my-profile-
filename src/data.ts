import type {Portfolio} from './types';
const github = 'https://github.com/santhoshnc74-gif';
export const initialPortfolio: Portfolio = {
  profile: {
    name: 'SANTHOSH N C', role: 'B.Tech student in AI & Data Science', headline: 'Curiosity,\nput into practice.',
    bio: 'I’m Santhosh, a third-year B.Tech student in Artificial Intelligence & Data Science at Excel Engineering College. I learn through practical projects and aim to become an entrepreneur.',
    education: {heading:'Education', institution: 'Excel Engineering College', degree: 'B.Tech · Artificial Intelligence & Data Science', yearOfStudy: 'Third year', graduationYear: 2028, graduationLabel:'Expected graduation'},
    futurePlansHeading: 'Future plans',
    currentWork: {name: 'TEXFLOW', description: 'A garment and textile factory management project for workforce attendance, orders, and production tracking.', stack: ['React', 'TypeScript', 'FastAPI', 'Python', 'PostgreSQL']},
    goals: [{title: 'Keep learning', description: 'Strengthen my technical knowledge through study and hands-on projects.'}, {title: 'Become an entrepreneur', description: 'Build the knowledge and experience to create a venture of my own.'}],
    links: {github, linkedin: '', email: '', website: '', resume: ''}, profiles: [], contact: {heading:'Connect',description:'Let’s start a conversation.'},
    stations: {
      projects: { heading: 'Projects', subtitle: 'Garment & textile factory management system', visible: true },
      learning: { heading: 'Learning', subtitle: 'Education & technical curiosity', visible: true },
      plans: { heading: 'Future plans', subtitle: 'Goals & entrepreneurial roadmap', visible: true },
      connect: { heading: 'Connect', subtitle: 'Let’s start a conversation.', visible: true },
    },
    appearance: {
      carColor: '#166069',
      simpleViewDefault: false,
    },
    autoPublish: false,
  },
  projects: [
    {id:'TEXAFLOW', name:'TEXFLOW', description:'Garment and textile factory management', stack:['TypeScript'], image:'/assets/texflow.png', githubUrl:`${github}/TEXAFLOW`, liveUrl:'', stars:0, updatedAt:null},
    {id:'aids-study-assistant', name:'aids-study-assistant', description:'', stack:['HTML'], image:'/assets/study.png', githubUrl:`${github}/aids-study-assistant`, liveUrl:'', stars:0, updatedAt:null},
    {id:'scaler-openenv-sql-tuner', name:'scaler-openenv-sql-tuner', description:'', stack:['Python'], image:'/assets/sql.png', githubUrl:`${github}/scaler-openenv-sql-tuner`, liveUrl:'', stars:0, updatedAt:null},
  ], github: {syncedAt:null, status:'saved'},
};
