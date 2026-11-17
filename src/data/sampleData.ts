import {
  ConfidenceAssessment,
  LearningMaterial,
  QuizAttempt,
  QuizQuestion,
  Student,
  Subject,
  Topic,
  WellnessCheckIn,
} from '../types/studysync';

/**
 * Sample demo dataset for StudySync AI.
 * Enables full exploration via "Try Demo" without requiring account registration.
 */

export const DEMO_STUDENT: Student = {
  id: 'student-demo-01',
  displayName: 'Alex Rivera',
  program: 'B.S. Computer & Software Engineering',
  isDemoUser: true,
  dailyStudyGoalMinutes: 120,
};

function daysFromTodayISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const SAMPLE_SUBJECTS: Subject[] = [
  {
    id: 'subj-se-101',
    name: 'Software Engineering',
    code: 'SE 301',
    description:
      'Requirements specification, system modeling with UML, architectural design patterns, and verification workflows.',
    examDate: daysFromTodayISO(4),
    targetMastery: 85,
    createdAt: daysAgoISO(14),
  },
  {
    id: 'subj-dsa-204',
    name: 'Data Structures & Algorithms',
    code: 'CS 204',
    description:
      'Graph algorithms, shortest-path optimization, dynamic programming, and asymptotic complexity analysis.',
    examDate: daysFromTodayISO(9),
    targetMastery: 80,
    createdAt: daysAgoISO(12),
  },
  {
    id: 'subj-os-310',
    name: 'Operating Systems',
    code: 'CS 310',
    description:
      'CPU scheduling, concurrency synchronization, deadlock avoidance, and virtual memory management.',
    examDate: daysFromTodayISO(15),
    targetMastery: 80,
    createdAt: daysAgoISO(10),
  },
];

export const SAMPLE_TOPICS: Topic[] = [
  {
    id: 'topic-se-req',
    subjectId: 'subj-se-101',
    title: 'Requirements Analysis',
    summary:
      'Distinguishing functional vs. non-functional requirements, elicitation techniques, stakeholder interviews, and SRS validation.',
    keyConcepts: [
      'Functional requirements',
      'Non-functional requirements',
      'Traceability matrix',
      'Stakeholder elicitation',
      'Requirements validation',
    ],
    difficulty: 'introductory',
    estimatedStudyMinutes: 35,
  },
  {
    id: 'topic-se-mod',
    subjectId: 'subj-se-101',
    title: 'System Modeling',
    summary:
      'Representing system context, interactions, structure, and behavior using UML use-case, sequence, class, and state diagrams.',
    keyConcepts: [
      'Context models',
      'Sequence diagrams',
      'Class relationships',
      'State machine diagrams',
      'Activity workflows',
    ],
    difficulty: 'intermediate',
    estimatedStudyMinutes: 45,
  },
  {
    id: 'topic-se-des',
    subjectId: 'subj-se-101',
    title: 'Software Design',
    summary:
      'Architectural styles, SOLID principles, cohesion and coupling trade-offs, and creational/behavioral design patterns.',
    keyConcepts: [
      'High cohesion',
      'Low coupling',
      'SOLID principles',
      'Layered architecture',
      'Observer and Strategy patterns',
    ],
    difficulty: 'advanced',
    estimatedStudyMinutes: 50,
  },
  {
    id: 'topic-dsa-graph',
    subjectId: 'subj-dsa-204',
    title: 'Graph Traversal & Shortest Paths',
    summary:
      'BFS, DFS, topological sort, Dijkstra’s greedy relaxation, and Bellman-Ford negative cycle detection.',
    keyConcepts: [
      'Breadth-first search',
      'Depth-first search',
      'Dijkstra priority queue',
      'Edge relaxation',
      'Adjacency list complexity',
    ],
    difficulty: 'intermediate',
    estimatedStudyMinutes: 45,
  },
  {
    id: 'topic-dsa-dp',
    subjectId: 'subj-dsa-204',
    title: 'Dynamic Programming',
    summary:
      'Overlapping subproblems, optimal substructure, memoization vs. bottom-up tabulation, and state transitions.',
    keyConcepts: [
      'Optimal substructure',
      'Overlapping subproblems',
      'Memoization',
      'Tabulation',
      'Recurrence relation',
    ],
    difficulty: 'advanced',
    estimatedStudyMinutes: 50,
  },
  {
    id: 'topic-os-sched',
    subjectId: 'subj-os-310',
    title: 'Process Scheduling & Deadlocks',
    summary:
      'Preemptive vs. non-preemptive scheduling, turnaround vs. response time, Coffman deadlock conditions, and Banker’s algorithm.',
    keyConcepts: [
      'Round-robin quantum',
      'Turnaround time',
      'Mutual exclusion',
      'Circular wait',
      'Banker’s safety check',
    ],
    difficulty: 'intermediate',
    estimatedStudyMinutes: 40,
  },
];

export const SAMPLE_MATERIALS: LearningMaterial[] = [
  {
    id: 'mat-se-req-txt',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-req',
    fileName: 'Requirements_Analysis_Study_Guide.txt',
    format: 'txt',
    fileSizeBytes: 4280,
    uploadedAt: daysAgoISO(6),
    processingStatus: 'parsed_client',
    processingNote: 'Sample plain-text study guide available for immediate reading and Teach-Back grounding.',
    extractedText:
      'Requirements Analysis defines what a system must do (functional requirements) and how well it must perform under constraints (non-functional requirements such as latency, availability, security, and maintainability). Elicitation uses interviews, observation, and prototyping. Validation checks completeness, consistency, realism, and verifiability using a requirements traceability matrix.',
    extractedTopics: [
      'Functional vs. Non-Functional Requirements',
      'Requirements Elicitation',
      'Traceability Matrix',
      'SRS Validation',
    ],
    isSampleData: true,
  },
  {
    id: 'mat-se-mod-pdf',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-mod',
    fileName: 'UML_System_Modeling_Slides.pdf',
    format: 'pdf',
    fileSizeBytes: 1843200,
    uploadedAt: daysAgoISO(4),
    processingStatus: 'parsed_client',
    processingNote: 'Preloaded sample summary. New PDF uploads require backend Gemini extraction.',
    extractedText:
      'System Modeling uses abstract views to understand system behavior and boundaries. Context models establish system boundaries. Interaction models (Use Case and Sequence diagrams) show actor-to-component message order over time. Structural models (Class diagrams) define attributes, operations, generalization, and aggregation. Behavioral models (State Machine diagrams) capture event-driven transitions.',
    extractedTopics: [
      'Context Boundaries',
      'Sequence Diagrams',
      'Class Aggregation vs Composition',
      'State Machine Transitions',
    ],
    isSampleData: true,
  },
  {
    id: 'mat-se-des-txt',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    fileName: 'Software_Design_Principles.txt',
    format: 'txt',
    fileSizeBytes: 5120,
    uploadedAt: daysAgoISO(3),
    processingStatus: 'parsed_client',
    processingNote: 'Sample plain-text study guide available for immediate reading and Teach-Back grounding.',
    extractedText:
      'Good software design aims for high cohesion (elements inside a module belong together) and low coupling (minimal inter-module dependency). SOLID principles guide object-oriented modularity: Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. Design patterns like Strategy encapsulate interchangeable algorithms, while Observer decouples event producers from subscribers.',
    extractedTopics: [
      'Cohesion & Coupling',
      'SOLID Principles',
      'Layered Architecture',
      'Strategy & Observer Patterns',
    ],
    isSampleData: true,
  },
  {
    id: 'mat-dsa-graph-mp4',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-graph',
    fileName: 'Dijkstra_and_BFS_Recitation.mp4',
    format: 'mp4',
    fileSizeBytes: 24500000,
    uploadedAt: daysAgoISO(2),
    processingStatus: 'awaiting_backend_ai',
    processingNote: 'Sample video reference — full audio/frame transcription requires Cloudflare R2 + Gemini API.',
    extractedTopics: ['BFS Level Order', 'Dijkstra Edge Relaxation'],
    mediaDurationSeconds: 1120,
    isSampleData: true,
  },
];

export const SAMPLE_QUESTIONS: QuizQuestion[] = [
  // Software Engineering: Requirements Analysis
  {
    id: 'q-se-req-1',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-req',
    prompt:
      'Which statement represents a non-functional requirement rather than a functional requirement?',
    options: [
      'The system shall allow students to export quiz history as a CSV file.',
      'The API shall respond to 95% of study plan requests within 250 milliseconds.',
      'The instructor shall be able to archive completed courses at term end.',
      'The application shall email a confirmation link upon account registration.',
    ],
    correctIndex: 1,
    explanation:
      'Latency thresholds ("within 250 milliseconds for 95% of requests") specify system quality and performance constraints, making them non-functional requirements.',
    difficulty: 'easy',
  },
  {
    id: 'q-se-req-2',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-req',
    prompt:
      'What is the primary purpose of a Requirements Traceability Matrix (RTM)?',
    options: [
      'To measure cyclomatic complexity across production microservices',
      'To link stakeholder requirements to design components and verification test cases',
      'To estimate server memory allocation during peak exam traffic',
      'To automatically generate UML sequence diagrams from source code',
    ],
    correctIndex: 1,
    explanation:
      'A traceability matrix ensures every documented requirement maps forward to implementation/design and test cases so no requirement is omitted or untested.',
    difficulty: 'medium',
  },
  {
    id: 'q-se-req-3',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-req',
    prompt:
      'During requirements validation, which check verifies that a requirement can actually be tested objectively?',
    options: [
      'Verifiability check',
      'Polymorphism check',
      'Normalization check',
      'Scheduling feasibility check',
    ],
    correctIndex: 0,
    explanation:
      'Verifiability ensures requirements are written with measurable criteria so QA engineers can write definitive pass/fail tests.',
    difficulty: 'easy',
  },
  {
    id: 'q-se-req-4',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-req',
    prompt:
      'Why are domain experts and end users often interviewed together with open-ended scenarios during elicitation?',
    options: [
      'To eliminate the need for non-functional specifications',
      'To uncover tacit workflow assumptions that stakeholders rarely state explicitly',
      'To finalize database foreign-key constraints before prototyping',
      'To bypass requirements conflict resolution',
    ],
    correctIndex: 1,
    explanation:
      'Tacit knowledge—steps users perform automatically without thinking about them—emerges best when walking through realistic scenarios.',
    difficulty: 'medium',
  },

  // Software Engineering: System Modeling
  {
    id: 'q-se-mod-1',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-mod',
    prompt:
      'Which UML diagram is specifically designed to show the chronological order of messages exchanged between objects during a scenario?',
    options: [
      'Class diagram',
      'Sequence diagram',
      'Component deployment diagram',
      'Package dependency diagram',
    ],
    correctIndex: 1,
    explanation:
      'Sequence diagrams display lifelines vertically and message arrows ordered top-to-bottom over time to model runtime interactions.',
    difficulty: 'easy',
  },
  {
    id: 'q-se-mod-2',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-mod',
    prompt:
      'In a UML class diagram, how does Composition differ from Aggregation?',
    options: [
      'Composition implies shared ownership where child objects outlive the parent.',
      'Composition implies strong lifecycle ownership: if the parent is destroyed, its parts are destroyed.',
      'Aggregation represents inheritance while composition represents interface implementation.',
      'Aggregation can only be used between abstract classes.',
    ],
    correctIndex: 1,
    explanation:
      'Composition (filled diamond) denotes exclusive whole-part ownership with tied lifetimes, whereas aggregation (hollow diamond) allows parts to exist independently.',
    difficulty: 'medium',
  },
  {
    id: 'q-se-mod-3',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-mod',
    prompt:
      'What is the primary role of a Context Model early in system modeling?',
    options: [
      'To define SQL indexes for each database table',
      'To establish boundaries between the system being built and external systems in its environment',
      'To specify exact method signatures for controller classes',
      'To benchmark CPU cache hit rates',
    ],
    correctIndex: 1,
    explanation:
      'Context models clarify what belongs inside the software boundary versus external actors and neighboring systems.',
    difficulty: 'easy',
  },
  {
    id: 'q-se-mod-4',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-mod',
    prompt:
      'When is a UML State Machine diagram most appropriate?',
    options: [
      'When modeling how an entity transitions between distinct lifecycle states in response to events',
      'When listing hardware servers and network firewalls',
      'When documenting static API endpoint JSON schemas',
      'When comparing two sorting algorithms',
    ],
    correctIndex: 0,
    explanation:
      'State machine diagrams excel at event-driven behavior (e.g., StudyTask moving from scheduled to completed, missed, or deferred).',
    difficulty: 'medium',
  },

  // Software Engineering: Software Design
  {
    id: 'q-se-des-1',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    prompt:
      'Which combination of modular metrics generally produces the most maintainable software architecture?',
    options: [
      'Low cohesion and high coupling',
      'High cohesion and low coupling',
      'High coupling and high inheritance depth',
      'Zero abstraction and global mutable state',
    ],
    correctIndex: 1,
    explanation:
      'High cohesion keeps related responsibilities focused within a module, while low coupling minimizes ripple effects when a module changes.',
    difficulty: 'easy',
  },
  {
    id: 'q-se-des-2',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    prompt:
      'Which SOLID principle states that high-level policy modules should not depend directly on low-level implementation details, and both should depend on abstractions?',
    options: [
      'Liskov Substitution Principle',
      'Dependency Inversion Principle',
      'Interface Segregation Principle',
      'Single Responsibility Principle',
    ],
    correctIndex: 1,
    explanation:
      'Dependency Inversion decouples business logic from specific storage or external API implementations using interfaces/abstractions.',
    difficulty: 'medium',
  },
  {
    id: 'q-se-des-3',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    prompt:
      'In StudySync AI, separating the deterministic scheduler from Gemini API adapters makes swapping local logic for Cloudflare Hono endpoints straightforward. Which design pattern best describes swapping interchangeable evaluation algorithms at runtime?',
    options: [
      'Strategy pattern',
      'Singleton pattern',
      'Flyweight pattern',
      'Memento pattern',
    ],
    correctIndex: 0,
    explanation:
      'The Strategy pattern encapsulates a family of interchangeable algorithms behind a common interface so callers do not change.',
    difficulty: 'medium',
  },
  {
    id: 'q-se-des-4',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    prompt:
      'What problem occurs if a class violates the Interface Segregation Principle?',
    options: [
      'Subclasses are forced to implement methods they do not use',
      'Objects cannot be garbage collected',
      'Database transactions lose ACID isolation',
      'Only one instance of the class can exist',
    ],
    correctIndex: 0,
    explanation:
      'Bloated interfaces force clients to depend on unused methods, creating unnecessary coupling and brittle stubs.',
    difficulty: 'hard',
  },
  {
    id: 'q-se-des-5',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    prompt:
      'Why does a layered architecture restrict lower layers (e.g., data persistence) from importing upper presentation-layer modules?',
    options: [
      'To preserve unidirectional dependency flow and isolate UI changes from core logic',
      'Because TypeScript forbids cross-directory imports',
      'To increase cyclomatic coupling across layers',
      'To force all components into a single monolithic file',
    ],
    correctIndex: 0,
    explanation:
      'Unidirectional dependencies keep domain logic and storage adapters independent of UI frameworks and easy to test.',
    difficulty: 'medium',
  },

  // DSA: Graph Traversal & Shortest Paths
  {
    id: 'q-dsa-graph-1',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-graph',
    prompt:
      'Why does Dijkstra’s algorithm fail to guarantee shortest paths when a graph contains negative edge weights?',
    options: [
      'It requires an adjacency matrix instead of an adjacency list.',
      'Once a vertex is popped from the priority queue as finalized, a later negative edge could create a shorter path.',
      'Breadth-first queues cannot store negative integers.',
      'It only works on directed acyclic graphs.',
    ],
    correctIndex: 1,
    explanation:
      'Dijkstra assumes path costs increase monotonically as edges are added; negative edges break the greedy invariant that popped vertices have minimal distance.',
    difficulty: 'medium',
  },
  {
    id: 'q-dsa-graph-2',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-graph',
    prompt:
      'What is the time complexity of Breadth-First Search (BFS) on a graph with V vertices and E edges represented using an adjacency list?',
    options: ['O(V^2)', 'O(V + E)', 'O(E log V)', 'O(V * E)'],
    correctIndex: 1,
    explanation:
      'Each vertex is enqueued/dequeued at most once O(V) and each adjacency edge is examined at most twice in undirected or once in directed graphs O(E).',
    difficulty: 'easy',
  },
  {
    id: 'q-dsa-graph-3',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-graph',
    prompt:
      'Which graph traversal property makes Kahn’s algorithm or DFS post-order suitable for scheduling prerequisite study topics?',
    options: [
      'Minimum spanning tree weight',
      'Topological ordering of a Directed Acyclic Graph (DAG)',
      'Bipartite two-coloring',
      'Eulerian circuit detection',
    ],
    correctIndex: 1,
    explanation:
      'Topological sort orders vertices so every prerequisite edge (u -> v) places u before v.',
    difficulty: 'medium',
  },

  // DSA: Dynamic Programming
  {
    id: 'q-dsa-dp-1',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-dp',
    prompt:
      'Which two properties must a problem exhibit for Dynamic Programming to apply effectively?',
    options: [
      'Negative edge weights and bipartite symmetry',
      'Optimal substructure and overlapping subproblems',
      'Greedy choice property and disjoint subproblems',
      'Logarithmic branching factor and sorted input',
    ],
    correctIndex: 1,
    explanation:
      'Dynamic programming avoids recomputing recurring subproblems (overlapping subproblems) while combining optimal sub-solutions (optimal substructure).',
    difficulty: 'easy',
  },
  {
    id: 'q-dsa-dp-2',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-dp',
    prompt:
      'How does bottom-up tabulation differ from top-down memoization?',
    options: [
      'Tabulation solves subproblems iteratively from base cases without recursion stack overhead.',
      'Tabulation only works for tree-structured graphs.',
      'Memoization always uses O(1) auxiliary space.',
      'Tabulation cannot reconstruct the chosen decision path.',
    ],
    correctIndex: 0,
    explanation:
      'Tabulation fills a DP table iteratively from smallest subproblems upward, eliminating recursive call-stack overflow risk.',
    difficulty: 'medium',
  },
  {
    id: 'q-dsa-dp-3',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-dp',
    prompt:
      'In the 0/1 Knapsack problem (analogous to selecting study tasks under a strict time budget), why does greedy sorting by value-per-minute fail?',
    options: [
      'Because items cannot be split fractionally, leaving unused capacity that another combination could fill better',
      'Because knapsack weights must be prime numbers',
      'Because dynamic programming runs in O(1) time',
      'Because greedy algorithms cannot sort floating-point ratios',
    ],
    correctIndex: 0,
    explanation:
      'Indivisible items can leave wasted slack capacity that invalidates pure greedy ratio choices.',
    difficulty: 'medium',
  },

  // Operating Systems
  {
    id: 'q-os-sched-1',
    subjectId: 'subj-os-310',
    topicId: 'topic-os-sched',
    prompt:
      'What trade-off occurs in Round-Robin CPU scheduling if the time quantum is set too small?',
    options: [
      'Interactive response time degrades to batch processing.',
      'Context-switching overhead consumes a high fraction of CPU time.',
      'Long processes cause permanent starvation of I/O-bound tasks.',
      'Mutual exclusion locks are bypassed.',
    ],
    correctIndex: 1,
    explanation:
      'An excessively short time quantum causes frequent timer interrupts and context switches, reducing useful throughput.',
    difficulty: 'easy',
  },
  {
    id: 'q-os-sched-2',
    subjectId: 'subj-os-310',
    topicId: 'topic-os-sched',
    prompt:
      'Which is NOT one of the four Coffman conditions required simultaneously for a deadlock to occur?',
    options: [
      'Mutual exclusion',
      'Hold and wait',
      'Preemptive priority inversion',
      'Circular wait',
    ],
    correctIndex: 2,
    explanation:
      'The four Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait.',
    difficulty: 'medium',
  },
  {
    id: 'q-os-sched-3',
    subjectId: 'subj-os-310',
    topicId: 'topic-os-sched',
    prompt:
      'What does Banker’s Algorithm verify before granting a resource request?',
    options: [
      'That the system remains in a safe state with at least one sequence allowing all processes to finish',
      'That every process runs in O(1) turnaround time',
      'That virtual memory page faults are zero',
      'That the CPU clock frequency stays constant',
    ],
    correctIndex: 0,
    explanation:
      'Banker’s algorithm simulates allocation and checks for a safe execution sequence to avoid potential deadlocks.',
    difficulty: 'medium',
  },
];

export const SAMPLE_CONFIDENCE_ASSESSMENTS: ConfidenceAssessment[] = [
  {
    id: 'conf-demo-1',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-req',
    reportedConfidence: 80,
    actualAccuracy: 100,
    confidenceGap: -20,
    calibration: 'underconfident',
    interpretation:
      'Your quiz accuracy (100%) exceeded your expected confidence (80%) by 20 percentage points. You may understand this topic more reliably than you estimated.',
    recordedAt: daysAgoISO(5),
  },
  {
    id: 'conf-demo-2',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-mod',
    reportedConfidence: 85,
    actualAccuracy: 50,
    confidenceGap: 35,
    calibration: 'overconfident',
    interpretation:
      'Self-reported confidence (85%) was 35 percentage points higher than quiz accuracy (50%). This suggests possible blind spots around UML structural vs. behavioral semantics.',
    recordedAt: daysAgoISO(3),
  },
  {
    id: 'conf-demo-3',
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    reportedConfidence: 90,
    actualAccuracy: 40,
    confidenceGap: 50,
    calibration: 'overconfident',
    interpretation:
      'Self-reported confidence (90%) was 50 percentage points higher than quiz accuracy (40%). You may understand SOLID and pattern trade-offs less thoroughly than expected—ideal for targeted review.',
    recordedAt: daysAgoISO(1),
  },
  {
    id: 'conf-demo-4',
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-graph',
    reportedConfidence: 72,
    actualAccuracy: 67,
    confidenceGap: 5,
    calibration: 'well_calibrated',
    interpretation:
      'Confidence (72%) and quiz accuracy (67%) are closely aligned within 5 percentage points.',
    recordedAt: daysAgoISO(2),
  },
];

export const SAMPLE_QUIZ_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'att-demo-1',
    studentId: DEMO_STUDENT.id,
    subjectId: 'subj-se-101',
    topicId: 'topic-se-req',
    questionIds: ['q-se-req-1', 'q-se-req-2', 'q-se-req-3'],
    answers: [
      { questionId: 'q-se-req-1', selectedIndex: 1, isCorrect: true },
      { questionId: 'q-se-req-2', selectedIndex: 1, isCorrect: true },
      { questionId: 'q-se-req-3', selectedIndex: 0, isCorrect: true },
    ],
    score: 3,
    totalQuestions: 3,
    accuracyPercent: 100,
    reportedConfidence: 80,
    confidenceAssessmentId: 'conf-demo-1',
    completedAt: daysAgoISO(5),
    durationSeconds: 145,
  },
  {
    id: 'att-demo-2',
    studentId: DEMO_STUDENT.id,
    subjectId: 'subj-se-101',
    topicId: 'topic-se-mod',
    questionIds: ['q-se-mod-1', 'q-se-mod-2', 'q-se-mod-3', 'q-se-mod-4'],
    answers: [
      { questionId: 'q-se-mod-1', selectedIndex: 1, isCorrect: true },
      { questionId: 'q-se-mod-2', selectedIndex: 0, isCorrect: false },
      { questionId: 'q-se-mod-3', selectedIndex: 1, isCorrect: true },
      { questionId: 'q-se-mod-4', selectedIndex: 2, isCorrect: false },
    ],
    score: 2,
    totalQuestions: 4,
    accuracyPercent: 50,
    reportedConfidence: 85,
    confidenceAssessmentId: 'conf-demo-2',
    completedAt: daysAgoISO(3),
    durationSeconds: 190,
  },
  {
    id: 'att-demo-3',
    studentId: DEMO_STUDENT.id,
    subjectId: 'subj-dsa-204',
    topicId: 'topic-dsa-graph',
    questionIds: ['q-dsa-graph-1', 'q-dsa-graph-2', 'q-dsa-graph-3'],
    answers: [
      { questionId: 'q-dsa-graph-1', selectedIndex: 1, isCorrect: true },
      { questionId: 'q-dsa-graph-2', selectedIndex: 1, isCorrect: true },
      { questionId: 'q-dsa-graph-3', selectedIndex: 0, isCorrect: false },
    ],
    score: 2,
    totalQuestions: 3,
    accuracyPercent: 67,
    reportedConfidence: 72,
    confidenceAssessmentId: 'conf-demo-4',
    completedAt: daysAgoISO(2),
    durationSeconds: 165,
  },
  {
    id: 'att-demo-4',
    studentId: DEMO_STUDENT.id,
    subjectId: 'subj-se-101',
    topicId: 'topic-se-des',
    questionIds: ['q-se-des-1', 'q-se-des-2', 'q-se-des-3', 'q-se-des-4', 'q-se-des-5'],
    answers: [
      { questionId: 'q-se-des-1', selectedIndex: 1, isCorrect: true },
      { questionId: 'q-se-des-2', selectedIndex: 0, isCorrect: false },
      { questionId: 'q-se-des-3', selectedIndex: 1, isCorrect: false },
      { questionId: 'q-se-des-4', selectedIndex: 0, isCorrect: true },
      { questionId: 'q-se-des-5', selectedIndex: 2, isCorrect: false },
    ],
    score: 2,
    totalQuestions: 5,
    accuracyPercent: 40,
    reportedConfidence: 90,
    confidenceAssessmentId: 'conf-demo-3',
    completedAt: daysAgoISO(1),
    durationSeconds: 210,
  },
];

export const SAMPLE_WELLNESS_CHECKIN: WellnessCheckIn = {
  id: 'well-demo-01',
  studentId: DEMO_STUDENT.id,
  energyLevel: 'moderate',
  preferredIntensity: 'balanced',
  availableMinutesToday: 120,
  preferredBlockMinutes: 35,
  breakMinutesPerBlock: 10,
  notes: 'Focusing on Software Engineering exam prep with steady pacing and regular screen breaks.',
  recordedAt: daysAgoISO(0),
};
