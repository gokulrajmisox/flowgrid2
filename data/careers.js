/**
 * Flowgrid Careers Data & Official Google Form Configuration
 *
 * Update INTERNSHIP_ROLES below to add, pause, or edit open roles.
 * formRoleValue must match the exact option string in Flowgrid's Google Form.
 */

export const CAREERS_FORM_CONFIG = {
  baseUrl:
    'https://docs.google.com/forms/d/e/1FAIpQLSdpA1JWJPKQ3Fh8nWovSmpqoH_-CWusEacPisZ41zYlB-Zk1w/viewform',
  entries: {
    role: 'entry.2093271691',
    duration: 'entry.1269789187',
    workMode: 'entry.744171680',
  },
  durations: ['1 month', '2 months'],
  workModes: ['Remote', 'Hybrid'],
  terms: {
    compensation: 'Unpaid project-based learning internship',
    selectionNote: 'Submitting this application does not guarantee selection.',
    feePolicy:
      'If selected, the internship is free of cost. If not selected, a fee of Rs. 500 applies.',
    certificate: 'A completion certificate is provided upon successful completion.',
  },
  contact: {
    email: 'flowgrid.buisness@gmail.com',
    phoneDisplay: '+91 94893 68104',
    phoneHref: 'tel:+919489368104',
    whatsappHref: 'https://wa.me/919489368104',
  },
};

export const INTERNSHIP_ROLES = [
  {
    id: 'tile-1',
    indexNumber: '01',
    slug: 'web-development',
    title: 'Web Development Intern',
    heroLines: ['WEB', 'DEVELOPMENT', 'INTERN'],
    visualType: 'web',
    formRoleValue: 'Web Development',
    department: 'Engineering',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/web-development.jpg',
    summary:
      'Build responsive, high-clarity websites and connected web interfaces for Flowgrid studio builds and client systems.',
    overview:
      'As a Web Development Intern at Flowgrid, you will turn structured design direction into clean, dependable web experiences. You will work across semantic markup, modular stylesheets, and interactive client-side scripting for studio web builds and connected business portals.',
    workOn: [
      'Responsive studio websites and multi-page digital experiences built with modern web standards',
      'Connected client interfaces linking forms, operational views, and content workflows',
      'Cross-device layout refinement across desktop, tablet, and mobile viewports',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'BUILD',
        title: 'Create responsive and accessible web interfaces',
        detail:
          'Author semantic HTML and structured CSS grids that adapt smoothly from 1440px studio viewports down to mobile screens without layout drift.',
      },
      {
        index: '02',
        verb: 'DESIGN',
        title: 'Translate visual direction into functional layouts',
        detail:
          'Partner closely with Flowgrid designers to preserve typographic hierarchy, spacing rhythm, and intentional motion across every page.',
      },
      {
        index: '03',
        verb: 'OPTIMIZE',
        title: 'Improve performance and cross-browser compatibility',
        detail:
          'Audit asset loading, clean up DOM bottlenecks, and verify keyboard navigation and rendering consistency across modern browsers.',
      },
    ],
    skills: ['HTML & CSS', 'JavaScript', 'Responsive Layout', 'Git & Web Standards'],
    skillsDevelop: [
      'Production CSS architecture and responsive grid engineering',
      'Interactive DOM scripting and clean Git pull-request workflows',
      'Accessibility audits, SEO structure, and asset optimization',
    ],
    whoShouldApply:
      'Students or early-career builders comfortable with core HTML, CSS, and JavaScript fundamentals who want hands-on experience shipping structured studio websites instead of toy tutorials.',
  },
  {
    id: 'tile-2',
    indexNumber: '02',
    slug: 'frontend-development',
    title: 'Frontend Development Intern',
    heroLines: ['FRONTEND', 'DEVELOPMENT', 'INTERN'],
    visualType: 'frontend',
    formRoleValue: 'Frontend Development',
    department: 'Engineering',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/frontend-development.jpg',
    summary:
      'Craft motion-led interfaces, interactive UI systems, and experimental web experiences with strong attention to detail.',
    overview:
      'Flowgrid interfaces balance editorial polish with everyday operational clarity. In this role, you will engineer reusable components, scroll-driven storytelling sequences, and tactile micro-interactions that feel responsive on every device.',
    workOn: [
      'Modular UI component architecture built with React or modern vanilla ES modules',
      'Scroll-triggered animations, interactive transitions, and spatial canvas integrations',
      'Component state management for client communication and business workspaces',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'ENGINEER',
        title: 'Build reusable UI components and interactive states',
        detail:
          'Develop modular frontend primitives with predictable state handling, keyboard accessibility, and clean separation of logic and presentation.',
      },
      {
        index: '02',
        verb: 'CHOREOGRAPH',
        title: 'Implement smooth scroll transitions and micro-interactions',
        detail:
          'Use CSS transforms, IntersectionObserver, and animation timelines to deliver fluid motion while respecting reduced-motion preferences.',
      },
      {
        index: '03',
        verb: 'REFINE',
        title: 'Maintain typographic and spatial precision',
        detail:
          'Review every screen with design and engineering partners to catch alignment issues, contrast gaps, and responsive edge cases early.',
      },
    ],
    skills: ['JavaScript / TypeScript', 'React', 'CSS Architecture', 'Motion & WebGL'],
    skillsDevelop: [
      'Interactive component architecture and stateful UI design',
      'Motion choreography, GSAP / WebGL integration basics, and frame-rate tuning',
      'Design-to-code fidelity across dark and light editorial surfaces',
    ],
    whoShouldApply:
      'Developers who enjoy obsessing over layout craft, clean component code, and subtle UI motion—and have built at least a few interactive JavaScript or React projects.',
  },
  {
    id: 'tile-3',
    indexNumber: '03',
    slug: 'backend-development',
    title: 'Backend Development Intern',
    heroLines: ['BACKEND', 'DEVELOPMENT', 'INTERN'],
    visualType: 'backend',
    formRoleValue: 'Backend Development',
    department: 'Engineering',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/backend-development.jpg',
    summary:
      'Architect reliable APIs, workflow automation endpoints, and data pipelines that power business management tools.',
    overview:
      'Behind every Flowgrid workspace sits dependable server logic. You will help structure REST APIs, request validation, automation webhooks, and clean data workflows supporting business management tools and communication pipelines.',
    workOn: [
      'Node.js or Python backend endpoints for operational dashboards and client portals',
      'Webhook orchestration for telephony routing and automated client notifications',
      'Schema modeling, input sanitization, and structured API error handling',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'ARCHITECT',
        title: 'Develop REST services and server integrations',
        detail:
          'Write well-structured Node.js or Python route handlers with clear request validation, predictable payloads, and concise documentation.',
      },
      {
        index: '02',
        verb: 'CONNECT',
        title: 'Structure data models and workflow automation hooks',
        detail:
          'Model operational records cleanly and wire automated triggers that sync updates reliably across connected tools.',
      },
      {
        index: '03',
        verb: 'SECURE',
        title: 'Harden server routing, edge cases, and error paths',
        detail:
          'Test API failure states, verify environment configuration safety, and prevent malformed input from disrupting downstream flows.',
      },
    ],
    skills: ['Node.js / Python', 'REST APIs', 'Database Fundamentals', 'Server Logic'],
    skillsDevelop: [
      'Production API design, routing, and validation discipline',
      'Webhook integration and asynchronous workflow debugging',
      'Practical backend testing and environment security practices',
    ],
    whoShouldApply:
      'Builders interested in systems, APIs, and server reliability who understand basic HTTP requests, Node.js or Python, and relational or document data basics.',
  },
  {
    id: 'tile-4',
    indexNumber: '04',
    slug: 'full-stack-development',
    title: 'Full Stack Development Intern',
    heroLines: ['FULL STACK', 'DEVELOPMENT', 'INTERN'],
    visualType: 'fullstack',
    formRoleValue: 'Full Stack Development',
    department: 'Engineering',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/full-stack-development.jpg',
    summary:
      'Connect end-to-end product features across frontend interfaces, backend services, and operational workspaces.',
    overview:
      'As a Full Stack Development Intern, you will bridge interface and infrastructure. Working across Flowgrid web apps and internal business systems, you will ship complete feature slices from user interaction down to data persistence and API routes.',
    workOn: [
      'End-to-end workspaces combining clean client UIs with Express / Node.js backends',
      'Task tracking, operational records, and client communication touchpoints',
      'Integration testing across frontend state and server API responses',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'DELIVER',
        title: 'Ship complete vertical slices from UI to API',
        detail:
          'Own features end-to-end: design the interface flow, wire API endpoints, and verify data integrity across page reloads.',
      },
      {
        index: '02',
        verb: 'UNIFY',
        title: 'Maintain cohesive operational dashboards and task flows',
        detail:
          'Ensure frontend views stay synchronized with server state, handling loading and error conditions cleanly without broken UI.',
      },
      {
        index: '03',
        verb: 'DEBUG',
        title: 'Troubleshoot across network, server, and browser layers',
        detail:
          'Trace bugs across client requests and backend logs, shipping focused, maintainable commits reviewed by the engineering team.',
      },
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'API & Data Integration'],
    skillsDevelop: [
      'Full-cycle product engineering across client and server boundaries',
      'State synchronization, validation, and modular codebase organization',
      'Shipping production-ready features in a collaborative studio workflow',
    ],
    whoShouldApply:
      'Versatile builders who enjoy working across both UI and server code and want practical experience connecting interfaces with real backend logic.',
  },
  {
    id: 'tile-5',
    indexNumber: '05',
    slug: 'ui-ux-design',
    title: 'UI/UX Design Intern',
    heroLines: ['UI / UX', 'DESIGN', 'INTERN'],
    visualType: 'uiux',
    formRoleValue: 'UI/UX Design',
    department: 'Design',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/ui-ux-design.jpg',
    summary:
      'Shape intuitive operational interfaces, editorial web experiences, and structured design systems in Figma.',
    overview:
      'Design at Flowgrid is never decoration—it makes complex business tools effortless to understand and gives studio websites unmistakable presence. You will craft wireframes, visual systems, and interactive Figma prototypes grounded in real user flows.',
    workOn: [
      'Editorial landing pages, studio case-study layouts, and responsive component systems',
      'Operational workspace UX flows that simplify team coordination and client tracking',
      'Design-to-engineering specs covering typography scales, grids, and hover states',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'STRUCTURE',
        title: 'Design wireframes and clear user journeys in Figma',
        detail:
          'Map user goals into clean information hierarchies, reducing cognitive clutter across multi-step operational and application flows.',
      },
      {
        index: '02',
        verb: 'CRAFT',
        title: 'Establish editorial typography, spacing, and UI components',
        detail:
          'Build consistent token systems, accessible contrast pairings, and responsive desktop and mobile artboards without visual bloat.',
      },
      {
        index: '03',
        verb: 'HANDOFF',
        title: 'Collaborate with developers during live implementation',
        detail:
          'Walk engineers through interaction intent, motion timing, and spacing details, and review staging builds to uphold craft.',
      },
    ],
    skills: ['Figma', 'Visual Hierarchy', 'Wireframing & Prototyping', 'Design Systems'],
    skillsDevelop: [
      'Editorial layout composition and disciplined dark/light contrast systems',
      'Component library architecture and auto-layout hygiene in Figma',
      'Practical developer handoff and live implementation QA',
    ],
    whoShouldApply:
      'Design students or self-taught product designers with a strong eye for typography and layout who can share Figma explorations or UI case studies.',
  },
  {
    id: 'tile-6',
    indexNumber: '06',
    slug: 'ai-machine-learning',
    title: 'AI / Machine Learning Intern',
    heroLines: ['AI / MACHINE', 'LEARNING', 'INTERN'],
    visualType: 'aiml',
    formRoleValue: 'Artificial Intelligence / Machine Learning',
    department: 'AI & Systems',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/ai-machine-learning.jpg',
    summary:
      'Explore applied AI workflows, conversational routing, and intelligent automation supporting Flowgrid Bot and client comms.',
    overview:
      'Flowgrid builds practical AI systems—such as Flowgrid Bot voice automation and smart client escalation—where reliability matters more than hype. You will prototype structured prompt flows, classification logic, and clean fallback behavior.',
    workOn: [
      'Intent classification and structured response pipelines for customer communication',
      'Conversational routing logic and clear human-handoff escalation triggers',
      'Evaluating latency, output consistency, and integration into Python or Node.js services',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'PROTOTYPE',
        title: 'Design structured prompt and intent-routing pipelines',
        detail:
          'Build predictable AI workflow steps that extract intent accurately, format structured outputs, and avoid brittle edge-case failures.',
      },
      {
        index: '02',
        verb: 'EVALUATE',
        title: 'Benchmark response reliability, latency, and handoff rules',
        detail:
          'Test conversational paths against real scenarios to verify clear escalation to human teammates whenever confidence drops.',
      },
      {
        index: '03',
        verb: 'INTEGRATE',
        title: 'Connect AI workflows into Python or Node.js services',
        detail:
          'Package model calls behind clean, validated API interfaces ready for operational and telephony routing use.',
      },
    ],
    skills: ['Python', 'AI / ML Fundamentals', 'API Integration', 'Structured Problem Solving'],
    skillsDevelop: [
      'Applied LLM / ML workflow engineering and evaluation methodology',
      'Conversational state routing and fallback system design',
      'Integrating intelligent services into live web and comms stacks',
    ],
    whoShouldApply:
      'Students or practitioners with Python and ML/AI fundamentals who care about making AI workflows dependable, measurable, and genuinely useful in real business operations.',
  },
  {
    id: 'tile-7',
    indexNumber: '07',
    slug: 'digital-marketing',
    title: 'Digital Marketing Intern',
    heroLines: ['DIGITAL', 'MARKETING', 'INTERN'],
    visualType: 'marketing',
    formRoleValue: 'Digital Marketing',
    department: 'Growth & Strategy',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/digital-marketing.jpg',
    summary:
      'Support Flowgrid’s digital reach, campaign analytics, and structured outreach across modern web channels.',
    overview:
      'Every digital system needs thoughtful distribution. As a Digital Marketing Intern, you will research audience positioning, track search and landing-page conversion signals, and coordinate campaigns that communicate Flowgrid’s value clearly.',
    workOn: [
      'Search visibility audits, keyword positioning, and landing-page messaging alignment',
      'Structured campaign calendars and channel performance reporting',
      'Partner outreach tracking and conversion path improvements',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'PLAN',
        title: 'Execute targeted digital campaigns aligned with studio positioning',
        detail:
          'Structure campaign briefs and channel outreach around Flowgrid’s core web, operational system, and AI automation offerings.',
      },
      {
        index: '02',
        verb: 'ANALYZE',
        title: 'Review SEO visibility, engagement, and conversion metrics',
        detail:
          'Track what messaging resonates, surface practical SEO improvements, and turn raw channel numbers into clear next steps.',
      },
      {
        index: '03',
        verb: 'COORDINATE',
        title: 'Keep web touchpoints and outreach messaging consistent',
        detail:
          'Work alongside content and engineering contributors so landing pages and external campaigns speak with one clear voice.',
      },
    ],
    skills: ['Digital Marketing', 'SEO Basics', 'Analytics & Reporting', 'Campaign Planning'],
    skillsDevelop: [
      'B2B and creative studio positioning and funnel clarity',
      'On-page SEO diagnostics and structured campaign reporting',
      'Cross-functional coordination between marketing, copy, and web builds',
    ],
    whoShouldApply:
      'Communicators and analytical thinkers curious about SEO, digital distribution, and measurable growth who prefer substance over vanity metrics.',
  },
  {
    id: 'tile-8',
    indexNumber: '08',
    slug: 'content-creation',
    title: 'Content Creation Intern',
    heroLines: ['CONTENT', 'CREATION', 'INTERN'],
    visualType: 'content',
    formRoleValue: 'Content Creation',
    department: 'Creative & Brand',
    duration: '1–2 Months',
    workMode: 'Remote / Hybrid',
    status: 'Open',
    image: 'assets/careers/opportunities/content-creation.jpg',
    summary:
      'Craft clear, engaging editorial copy, visual storytelling assets, and product narratives for Flowgrid.',
    overview:
      'At Flowgrid, clear writing and visual storytelling turn technical products into approachable stories. You will write concise studio copy, structure project narratives, and develop visual concepts with our design team.',
    workOn: [
      'Website headlines, product explainers, and concise studio case-study narratives',
      'Visual and short-form storytelling concepts showcasing Flowgrid builds',
      'Consistent editorial tone across web pages and client communication materials',
    ],
    responsibilities: [
      {
        index: '01',
        verb: 'WRITE',
        title: 'Author crisp editorial copy for web pages and case studies',
        detail:
          'Distill complex software and AI workflows into clear, human prose without buzzwords or filler.',
      },
      {
        index: '02',
        verb: 'STORYBOARD',
        title: 'Develop visual and short-form content concepts with design',
        detail:
          'Frame demos, product walkthroughs, and launch visuals with strong narrative pacing and editorial clarity.',
      },
      {
        index: '03',
        verb: 'CURATE',
        title: 'Maintain a cohesive brand voice across studio touchpoints',
        detail:
          'Edit and polish copy across site updates and outreach assets so Flowgrid reads consistently everywhere.',
      },
    ],
    skills: ['Content Writing', 'Editorial Storytelling', 'Visual Direction', 'Communication'],
    skillsDevelop: [
      'Product and technical storytelling for creative technology studios',
      'Visual concepting alongside UI/UX designers',
      'Tight editorial editing for clarity, hierarchy, and impact',
    ],
    whoShouldApply:
      'Writers and creative storytellers who care deeply about clarity, visual taste, and explaining technology in natural, compelling language.',
  },
];

export function getRoleById(id) {
  return INTERNSHIP_ROLES.find((role) => role.id === id) || null;
}

export function getRoleBySlug(slug) {
  return INTERNSHIP_ROLES.find((role) => role.slug === slug) || null;
}

/**
 * Builds the official prefilled Google Form URL for a Flowgrid internship application.
 */
export function buildApplicationUrl({ roleValue, duration, workMode } = {}) {
  const url = new URL(CAREERS_FORM_CONFIG.baseUrl);
  url.searchParams.set('usp', 'pp_url');
  if (roleValue) {
    url.searchParams.set(CAREERS_FORM_CONFIG.entries.role, roleValue);
  }
  if (duration) {
    url.searchParams.set(CAREERS_FORM_CONFIG.entries.duration, duration);
  }
  if (workMode) {
    url.searchParams.set(CAREERS_FORM_CONFIG.entries.workMode, workMode);
  }
  return url.toString();
}

/**
 * Pure view-model helper for the interactive internship detail experience.
 */
export function buildRoleDetailModel(
  role,
  { duration = CAREERS_FORM_CONFIG.durations[0], workMode = CAREERS_FORM_CONFIG.workModes[0] } = {}
) {
  const safeDuration = CAREERS_FORM_CONFIG.durations.includes(duration)
    ? duration
    : CAREERS_FORM_CONFIG.durations[0];
  const safeWorkMode = CAREERS_FORM_CONFIG.workModes.includes(workMode)
    ? workMode
    : CAREERS_FORM_CONFIG.workModes[0];

  const roleIdx = INTERNSHIP_ROLES.findIndex((item) => item.id === role.id);
  const prevRole =
    roleIdx >= 0
      ? INTERNSHIP_ROLES[(roleIdx - 1 + INTERNSHIP_ROLES.length) % INTERNSHIP_ROLES.length]
      : null;
  const nextRole =
    roleIdx >= 0 ? INTERNSHIP_ROLES[(roleIdx + 1) % INTERNSHIP_ROLES.length] : null;

  const durationLabel = safeDuration === '1 month' ? '1 Month' : '2 Months';

  return {
    kicker: `${role.department.toUpperCase()} / INTERNSHIP ${role.indexNumber} / ${durationLabel.toUpperCase()} / ${safeWorkMode.toUpperCase()}`,
    durationLabel,
    workModeLabel: safeWorkMode,
    selectedDuration: safeDuration,
    selectedWorkMode: safeWorkMode,
    applicationUrl: buildApplicationUrl({
      roleValue: role.formRoleValue,
      duration: safeDuration,
      workMode: safeWorkMode,
    }),
    prevRole,
    nextRole,
  };
}
