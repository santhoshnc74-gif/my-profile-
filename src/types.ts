export interface Profile {
  name: string; role: string; headline: string; bio: string;
  education: { heading: string; institution: string; degree: string; graduationYear: number; graduationLabel: string; yearOfStudy: string };
  futurePlansHeading: string;
  goals: {title: string; description: string}[];
  currentWork: {name: string; description: string; stack: string[]};
  links: {github: string; linkedin: string; email: string; website: string; resume: string};
  profiles: {label: string; url: string}[];
  contact: {heading: string; description: string};
  stations?: {
    projects: { heading: string; subtitle: string; visible: boolean };
    learning: { heading: string; subtitle: string; visible: boolean };
    plans: { heading: string; subtitle: string; visible: boolean };
    connect: { heading: string; subtitle: string; visible: boolean };
  };
  appearance?: {
    carColor: string;
    simpleViewDefault: boolean;
  };
  autoPublish?: boolean;
}
export interface Project {id: string; name: string; description: string; stack: string[]; image: string; githubUrl: string; liveUrl: string; stars: number | null; updatedAt: string | null; hidden?: boolean; stationId?: string}
export interface Portfolio {profile: Profile; projects: Project[]; github: {syncedAt: string | null; status: string}}
export interface Session {authenticated: boolean; configured: boolean; csrfToken?: string}
