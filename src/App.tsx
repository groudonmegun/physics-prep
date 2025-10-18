import React, { useEffect, useMemo, useState, createContext, useContext } from "react";

// --- Minimal UI primitives (self-contained, no external deps) ---
const cn = (...a: any[]) => a.filter(Boolean).join(" ");
export function Card({ children, className }: any){ return <div className={cn("border rounded bg-white", className)}>{children}</div>; }
export function CardHeader({ children, className }: any){ return <div className={cn("px-4 pt-3", className)}>{children}</div>; }
export function CardTitle({ children, className }: any){ return <h3 className={cn("font-semibold", className)}>{children}</h3>; }
export function CardContent({ children, className }: any){ return <div className={cn("px-4 pb-4", className)}>{children}</div>; }
export function Badge({ children, className, variant }: any){
  const styles = variant === "secondary" ? "bg-neutral-100" : variant === "outline" ? "border" : "bg-neutral-100";
  return <span className={cn("inline-flex items-center text-xs px-2 py-0.5 rounded", styles, className)}>{children}</span>;
}
export function Button({ children, className, variant, size, ...props }: any){
  const base = "inline-flex items-center justify-center border rounded px-3 py-2 text-sm";
  const styles = variant === "secondary" ? "bg-neutral-900 text-white" : variant === "outline" ? "bg-white" : variant === "ghost" ? "border-0" : "bg-neutral-900 text-white";
  const sz = size === "sm" ? "px-2 py-1 text-xs" : size === "icon" ? "px-2 py-2" : "";
  return <button className={cn(base, styles, sz, className)} {...props}>{children}</button>;
}
export function Input(props: any){ return <input {...props} className={cn("border rounded px-2 py-2 text-sm w-full", props.className)} />; }
export function Textarea(props: any){ return <textarea {...props} className={cn("border rounded px-2 py-2 text-sm w-full", props.className)} />; }
export function Checkbox({ checked, onCheckedChange, ...props }: any){
  return <input type="checkbox" checked={checked} onChange={e => onCheckedChange?.(e.target.checked)} {...props} />;
}

// --- Minimal Select (API-compatible stubs) ---
const SelectCtx = createContext<any>(null);
function collectItems(children: any, out: any[] = []){
  React.Children.forEach(children, (ch: any) => {
    if (!ch) return;
    if (ch.type && ch.type.__isSelectItem) out.push({ value: ch.props.value, label: ch.props.children });
    if (ch.props && ch.props.children) collectItems(ch.props.children, out);
  });
  return out;
}
export function Select({ value, onValueChange, children }: any){
  const items = collectItems(children, []);
  return (
    <SelectCtx.Provider value={{ value, onValueChange, items }}>
      <div className="w-full">
        <select className="border rounded px-2 py-2 w-full text-sm"
          value={value}
          onChange={(e)=>onValueChange?.(e.target.value)}>
          {items.map((it:any)=> (<option key={it.value} value={it.value}>{it.label}</option>))}
        </select>
      </div>
      {children}
    </SelectCtx.Provider>
  );
}
export function SelectTrigger({ children }: any){ return <div className="hidden">{children}</div>; }
export function SelectContent({ children }: any){ return <div className="hidden">{children}</div>; }
export function SelectItem(props: any){ return null; }
// mark component type for collector
SelectItem.__isSelectItem = true;
export function SelectValue(){ const ctx = useContext(SelectCtx); return <span>{ctx?.value}</span>; }

// Dummy icons removed in this self-contained build.


// -------------------------------
// Minimal types and helpers
// -------------------------------

type SubjectKey = "Electromagnetism" | "Modern Physics" | "Analytical Mechanics";

type Note = {
  id: string;
  subject: SubjectKey;
  topic: string;
  content: string;
  createdAt: number;
};

type Flashcard = {
  id: string;
  subject: SubjectKey;
  front: string;
  back: string;
  box: number; // Leitner box index 1..5
  lastReviewed?: number;
};

type QuizItem = {
  id: string;
  subject: SubjectKey;
  question: string;
  choices?: string[];
  answer: string;
  solution?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags?: string[];
};

const SUBJECTS: SubjectKey[] = [
  "Electromagnetism",
  "Modern Physics",
  "Analytical Mechanics",
];

const DEFAULT_TOPICS: Record<SubjectKey, string[]> = {
  Electromagnetism: [
    "Coulomb's law & E-fields",
    "Potential & Energy",
    "Laplace/Poisson",
    "Boundary conditions",
    "Method of images",
    "Capacitance & Energy",
  ],
  "Modern Physics": [
    "Relativity (SR basics)",
    "Photon & Photoelectric",
    "de Broglie & Matter waves",
    "Bohr model",
    "Wave mechanics intro",
  ],
  "Analytical Mechanics": [
    "Generalized coordinates",
    "Constraints",
    "Lagrangian & E-L eqs",
    "Small oscillations",
    "Central forces (preview)",
  ],
};

const STORAGE_KEY = "physics_prep_studio_v1";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Simple naive summarizer as an offline fallback (top-N sentence picker by keyword density)
function naiveSummarize(text: string, n = 5): string {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const words = text.toLowerCase().match(/[a-zA-Z가-힣0-9]+/g) || [];
  const freq: Record<string, number> = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const scored = sentences.map((s) => {
    const sw = s.toLowerCase().match(/[a-zA-Z가-힣0-9]+/g) || [];
    const score = sw.reduce((acc, w) => acc + (freq[w] || 0), 0) / (sw.length || 1);
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((x) => x.s).join(" ");
}

// Seed: exam-focused question banks (editable)
const SEED_QUIZ: QuizItem[] = [
  // Electromagnetism
  {
    id: uid("q"),
    subject: "Electromagnetism",
    difficulty: "Easy",
    question:
      "정전기학에서 전위 V가 주어졌을 때 전기장 \nE를 구하는 일반식은? (좌표계 일반)",
    answer: "E = -∇V",
    solution:
      "전기장은 보존장으로 전위의 기울기의 음수입니다. 직교/원통/구면 어디서든 성립.",
    tags: ["potential", "gradient"],
  },
  {
    id: uid("q"),
    subject: "Electromagnetism",
    difficulty: "Medium",
    question:
      "라플라스 방정식 ∇²V=0의 해가 유일해지기 위한 조건(경계조건 형태)을 간단히 쓰라.",
    answer: "디리클레(경계면에서 V 지정) 또는 노이만(∂V/∂n 지정) 등의 적절한 경계조건.",
    solution:
      "정상하고 폐유한 영역에서 경계에서의 전위 또는 법선미분을 주면 풀이의 유일성이 보장됩니다.",
    tags: ["Laplace", "uniqueness"],
  },
  {
    id: uid("q"),
    subject: "Electromagnetism",
    difficulty: "Hard",
    question:
      "무한도체평면(z=0)에 점전하 q가 z=a(>0)에 있을 때, 영상법으로 도체 위 유도전하의 분포를 어떻게 구하는가? 핵심 아이디어를 서술하라.",
    answer:
      "z=-a에 -q의 영상전하를 두고 V=0 경계조건을 만족시키는 해를 구성한 뒤, σ(ρ)=−ε₀(∂V/∂n)|_{z=0}로 면전하밀도를 구한다.",
    solution:
      "실제 전하+영상전하의 전위합이 z=0 평면에서 0이 되도록 하여 경계조건을 만족. 이후 전기장 수직성분으로 σ 산출.",
    tags: ["images", "boundary"],
  },
  // Modern Physics
  {
    id: uid("q"),
    subject: "Modern Physics",
    difficulty: "Easy",
    question: "드브로이 파장 λ와 운동량 p의 관계는?",
    answer: "λ = h / p",
    solution: "물질파 가설. 비상대론적/상대론적 모두 기본형식 동일(단, p만 상황에 맞게).",
    tags: ["de Broglie"],
  },
  {
    id: uid("q"),
    subject: "Modern Physics",
    difficulty: "Medium",
    question: "광전효과에서 정지전압 Vs와 입사광 파장 λ의 관계식을 쓰라.",
    answer: "eVs = h c / λ − φ (일함수)",
    solution:
      "광자의 에너지에서 일함수를 빼면 최대 운동에너지가 됩니다. 그 에너지를 정지전압이 상쇄.",
    tags: ["photoelectric"],
  },
  {
    id: uid("q"),
    subject: "Modern Physics",
    difficulty: "Hard",
    question:
      "보어 모형에서 수소 원자의 에너지 준위 En의 n 의존성과 리드베리 상수의 역할을 설명하라.",
    answer: "En = −(13.6 eV)/n², 스펙트럼 파수 ν~ = R (1/n₁² − 1/n₂²)",
    solution:
      "궤도양자화로 r_n∝n², E∝−1/n². 리드베리 상수 R이 선스펙트럼 위치를 결정.",
    tags: ["Bohr", "spectrum"],
  },
  // Analytical Mechanics
  {
    id: uid("q"),
    subject: "Analytical Mechanics",
    difficulty: "Easy",
    question: "라그랑지안 L과 오일러-라그랑주 방정식을 쓰라.",
    answer: "L = T − V,  d/dt(∂L/∂q̇ᵢ) − ∂L/∂qᵢ = 0",
    solution:
      "작용적분의 정류 조건에서 유도. 구속이 있으면 일반화좌표로 표현.",
    tags: ["Lagrangian", "EL"],
  },
  {
    id: uid("q"),
    subject: "Analytical Mechanics",
    difficulty: "Medium",
    question:
      "홀로노믹 구속의 정의와 비홀로노믹 구속의 차이를 간략히 설명하라.",
    answer:
      "홀로노믹: f(r,t)=0 형태로 적분가능(좌표식으로 표현). 비홀로노믹: 속도형 등으로 적분불가.",
    solution:
      "비홀로노믹은 예: 순수한 미끄럼 없는 구름 조건 등, 경로 의존.",
    tags: ["constraints"],
  },
  {
    id: uid("q"),
    subject: "Analytical Mechanics",
    difficulty: "Hard",
    question:
      "소진동 문제에서 2자유도 계의 고유진동수는 어떤 행렬의 고유값과 관련되는가?",
    answer:
      "M⁻¹K (질량행렬 M, 강성행렬 K)의 고유값의 제곱근이 고유각주파수.",
    solution:
      "선형화된 방정식 Mq¨+Kq=0 에서 q∝e^{iωt} 대입 → det(K − ω²M)=0.",
    tags: ["small oscillations"],
  },
];

// Seed flashcards
const SEED_CARDS: Flashcard[] = [
  { id: uid("fc"), subject: "Electromagnetism", front: "∇·E = ρ/ε₀ (정전기)", back: "가우스 법칙 (미분형)", box: 1 },
  { id: uid("fc"), subject: "Modern Physics", front: "콤프턴 산란 핵심식", back: "Δλ = (h/mc)(1 − cos θ)", box: 1 },
  { id: uid("fc"), subject: "Analytical Mechanics", front: "해밀토니안 정의", back: "H = Σ pᵢ q̇ᵢ − L", box: 1 },
];

// === Quick Quiz Types & Seeds ===
 type QuickKind = "mapping" | "ox" | "short";
 type QuickItem = {
  id: string;
  subject: SubjectKey;
  kind: QuickKind;
  prompt: string;
  answer: string; // multiple answers with '|'
  rationale?: string;
  tags?: string[];
 };

 const SEED_QUICK: QuickItem[] = [
  // Electromagnetism (mapping: situation → method/formula)
  { id: uid("qm"), subject: "Electromagnetism", kind: "mapping", prompt: "구면대칭 전하분포에서 E(r) 계산", answer: "가우스 법칙|Gauss's law", rationale: "대칭성으로 폐곡면 적분이 쉬움." },
  { id: uid("qm"), subject: "Electromagnetism", kind: "mapping", prompt: "무한 도체 평면 위 점전하 전위/장", answer: "영상법|method of images", rationale: "z=0에서 V=0 경계 만족." },
  { id: uid("qm"), subject: "Electromagnetism", kind: "mapping", prompt: "전위 V가 주어졌을 때 전기장", answer: "E=-∇V|E=-grad V|E = -∇V", rationale: "정의식." },
  { id: uid("qm"), subject: "Electromagnetism", kind: "mapping", prompt: "전하 없는 영역에서 V 구하기 (경계값 문제)", answer: "라플라스 방정식|Laplace equation|∇²V=0", rationale: "포아송에서 ρ=0인 경우." },
  { id: uid("qm"), subject: "Electromagnetism", kind: "mapping", prompt: "도체 경계에서 면전하밀도 σ 구하기", answer: "σ=ε₀E_n|sigma=ε0 En|σ=ε0 E_n", rationale: "경계에서 수직성분 불연속." },

  // Analytical Mechanics (mapping)
  { id: uid("qm"), subject: "Analytical Mechanics", kind: "mapping", prompt: "질량중심 운동 방정식", answer: "ΣF_ext = M a_cm|Newton for CM|M R¨_cm = Σ외력", rationale: "내부력 상쇄." },
  { id: uid("qm"), subject: "Analytical Mechanics", kind: "mapping", prompt: "강체 평면 운동의 운동에너지", answer: "T=½ m v_cm² + ½ I_cm ω²", rationale: "병진+회전 분해." },
  { id: uid("qm"), subject: "Analytical Mechanics", kind: "mapping", prompt: "고정축 회전 운동방정식", answer: "Στ=Iα|τ=Iα", rationale: "회전의 뉴턴법칙." },

  // Modern Physics (OX)
  { id: uid("qm"), subject: "Modern Physics", kind: "ox", prompt: "전자 스핀은 고전적 자전으로 설명할 수 있다.", answer: "X", rationale: "자기모멘트/표면속도 문제 등으로 불가능." },
  { id: uid("qm"), subject: "Modern Physics", kind: "ox", prompt: "동일한 두 페르미온의 교환은 파동함수 부호를 바꾼다.", answer: "O", rationale: "반대칭성." },
  { id: uid("qm"), subject: "Modern Physics", kind: "ox", prompt: "같은 n에서 l이 작을수록 전자는 핵에 더 가까워 평균 에너지가 낮아진다.", answer: "O", rationale: "침투효과로 유효핵전하↑." },

  // Modern Physics (short answer)
  { id: uid("qm"), subject: "Modern Physics", kind: "short", prompt: "한 버금껍질(subshell)에 들어갈 수 있는 최대 전자수 (주어진 l)", answer: "4l+2|4 l + 2|4l + 2", rationale: "m_l: −l..l → (2l+1), 스핀×2." },
  { id: uid("qm"), subject: "Modern Physics", kind: "short", prompt: "한 껍질(shell, n)에 들어갈 수 있는 최대 전자수", answer: "2n²|2 n^2|2 n²", rationale: "∑_l(2l+1)×2 = 2n²." },
  { id: uid("qm"), subject: "Modern Physics", kind: "short", prompt: "닫힌 껍질의 총 스핀 S와 총 궤도각운동량 L(값)", answer: "0|S=0,L=0|S=0,L=0,J=0", rationale: "짝지음으로 상쇄." },
  { id: uid("qm"), subject: "Modern Physics", kind: "short", prompt: "H₂⁺에서 결합 성립 조건(파동함수 대칭성)", answer: "대칭|symmetrical|g (bonding)", rationale: "핵 사이 전자밀도 증가." },
  { id: uid("qm"), subject: "Modern Physics", kind: "short", prompt: "He₂ 분자가 안정하지 못한 핵심 이유(한 단어)", answer: "배타원리|Pauli|closed shell", rationale: "결합 전자쌍 형성 불가." }
 ];

// -------------------------------
// GPT integration (optional)
// -------------------------------
async function askGPT(system: string, user: string, model: string, apiKey: string): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  return content.trim();
}
// === Auto Study Pack & Subject Quiz Helpers ===
function getScopeTopics(subject: SubjectKey): { key: string; title: string; hint: string }[] {
  if (subject === "Modern Physics") {
    return [
      { key: "Multi-electron Atoms", title: "다전자 원자", hint: "스핀, 배타원리, 대칭/반대칭, 유효핵전하, 스핀-궤도, 총각운동량" },
      { key: "Molecules", title: "분자", hint: "결합, H2+, H2, σ/π, 혼성, 회전/진동 준위, 전자 스펙트럼" },
      { key: "Statistical Physics", title: "통계역학", hint: "MB/FD/BE, 레일리-진스, 플랑크, 자유전자, 축퇴, 백색왜성" },
    ];
  }
  if (subject === "Electromagnetism") {
    return [
      { key: "Ch1", title: "1장 기초", hint: "벡터해석, 가우스법칙, E 정의" },
      { key: "Ch2", title: "2장 전위", hint: "V, E=-∇V, Poisson/Laplace" },
      { key: "Ch3.1", title: "3.1 라플라스", hint: "경계조건, 유일성, 전형 풀이" },
      { key: "Ch3.2", title: "3.2 영상법", hint: "평면/구 도체, 전위/장/σ" },
    ];
  }
  return [
    { key: "Particles", title: "입자계의 동역학", hint: "CM, 보존법칙, 내부/외력" },
    { key: "Rigid2D", title: "강체의 평면 운동", hint: "T 분해, I_cm, τ=Iα" },
  ];
}

async function generateStudyPack(
  subject: SubjectKey, model: string, apiKey: string, useGPT: boolean,
  addNotes: (ns: Note[])=>void, setBusy: (b:boolean)=>void, setSummary: (s:string)=>void
){
  const scopes = getScopeTopics(subject);
  setBusy(true);
  try{
    if (useGPT && apiKey){
      const sys = "You are a Korean physics TA. Create concise, exam-focused study notes for each topic, with sections: [핵심정의], [필수공식], [함정], [유도스케치], [응용사례]. Use LaTeX inline where helpful.";
      const req = scopes.map(s=>`### ${s.title}\n(${s.hint})에 대해 [핵심정의] [필수공식] [함정] [유도스케치] [응용사례] 순서로 한국어 요약`).join("\n\n");
      const prompt = `과목: ${subject}. 다음 주제들에 대해 시험 대비 요약을 만들어줘. 각 주제는 반드시 '### <제목>'로 시작해 구분해줘.\n\n${req}`;
      const out = await askGPT(sys, prompt, model, apiKey);
      const parts = out.split(/\n?###\s+/).filter(Boolean);
      const notes: Note[] = parts.map(block => {
        const firstLine = block.split(/\n/)[0].trim();
        const body = block.replace(firstLine, "").trim();
        const title = firstLine.replace(/^#+\s*/, "");
        return { id: uid("note"), subject, topic: title, content: body, createdAt: Date.now() } as Note;
      });
      addNotes(notes);
      setSummary("시험범위 자동 정리를 완료했습니다. 주제별 노트가 추가되었습니다.");
    } else {
      const canned = scopes.map(s => ({
        id: uid("note"), subject, topic: s.title,
        content: `• 핵심정의/필수공식/함정/응용사례를 정리하세요.\n• 힌트: ${s.hint}`,
        createdAt: Date.now(),
      } as Note));
      addNotes(canned);
      setSummary("(오프라인) 시험범위 자동 정리 템플릿을 추가했습니다. GPT 사용을 켜면 상세 요약을 생성합니다.");
    }
  } catch(e:any){
    setSummary(`자동 정리 실패: ${e.message}`);
  } finally { setBusy(false); }
}

async function generateSubjectQuiz(
  subject: SubjectKey, allNotes: Note[], difficulty: "Easy"|"Medium"|"Hard",
  model: string, apiKey: string, useGPT: boolean,
  pushQuiz:(qs:QuizItem[])=>void, setBusy:(b:boolean)=>void
){
  setBusy(true);
  try{
    const corpus = allNotes.filter(n=>n.subject===subject)
      .map(n=>`[${n.topic}]\n${n.content}`).join("\n\n");
    if (!corpus) throw new Error("해당 과목 노트가 아직 없습니다.");
    if (useGPT && apiKey){
      const sys = "You are a strict physics examiner. Create Korean exam questions (4 multiple choice + 4 short answer) with detailed solutions and tags as JSON array of objects: {id, subject, question, choices?, answer, solution, difficulty, tags}. Keep within the provided syllabus notes.";
      const prompt = `과목: ${subject}. 난이도: ${difficulty}. 아래 노트 전체 범위에서 8문항(선다 4 + 단답 4)을 생성하고 JSON 배열만 출력:\n\n${corpus}`;
      const out = await askGPT(sys, prompt, model, apiKey);
      const jsonStr = out.match(/\[([\s\S]*)\]$/)?.[0] || out;
      const items = JSON.parse(jsonStr);
      const flat: QuizItem[] = (Array.isArray(items)?items:[]).map((q:any)=> ({...q, id: uid("q"), subject}));
      if (flat.length) pushQuiz(flat);
    } else {
      const seeds = SEED_QUIZ.filter(q=>q.subject===subject).map(q=> ({...q, id: uid("q"), difficulty}));
      pushQuiz(seeds.slice(0,8));
    }
  } catch(e:any){ alert("범위 퀴즈 생성 실패: " + e.message); }
  finally { setBusy(false); }
}


// -------------------------------
// Main App
// -------------------------------
export default function App() {
  const [subject, setSubject] = useState<SubjectKey>("Electromagnetism");
  const [notes, setNotes] = useState<Note[]>(() => load(STORAGE_KEY + ":notes", [] as Note[]));
  const [cards, setCards] = useState<Flashcard[]>(() => load(STORAGE_KEY + ":cards", SEED_CARDS));
  const [quiz, setQuiz] = useState<QuizItem[]>(() => load(STORAGE_KEY + ":quiz", SEED_QUIZ));
  const [topic, setTopic] = useState<string>(DEFAULT_TOPICS["Electromagnetism"][0]);
  const [input, setInput] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [model, setModel] = useState<string>(() => load(STORAGE_KEY + ":model", "gpt-4o-mini"));
  const [apiKey, setApiKey] = useState<string>(() => load(STORAGE_KEY + ":api", ""));
  const [busy, setBusy] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [examMinutes, setExamMinutes] = useState<number>(30);
  const [examItems, setExamItems] = useState<QuizItem[]>([]);
  const [autoExamples, setAutoExamples] = useState<string>("");
  const [useGPT, setUseGPT] = useState<boolean>(false);
  function handleGenerateStudyPack(){
  generateStudyPack(
    subject, model, apiKey, useGPT,
    (ns)=>setNotes(prev=>[...ns, ...prev]),
    (b)=>setBusy(b),
    (s)=>setSummary(s)
  );
}

function handleGenerateSubjectQuiz(){
  generateSubjectQuiz(
    subject, notes, difficulty, model, apiKey, useGPT,
    (qs)=>setQuiz(prev=>[...qs, ...prev]),
    (b)=>setBusy(b)
  );
}


  // Quick quiz state
  const [quick, setQuick] = useState<QuickItem[]>(() => load(STORAGE_KEY + ":quick", SEED_QUICK));
  const [quickIndex, setQuickIndex] = useState<number>(0);
  const [quickInput, setQuickInput] = useState<string>("");
  const [quickFeedback, setQuickFeedback] = useState<string>("");
  const [quickMode, setQuickMode] = useState<QuickKind>("mapping");

  useEffect(() => {
    save(STORAGE_KEY + ":notes", notes);
  }, [notes]);
  useEffect(() => {
    save(STORAGE_KEY + ":cards", cards);
  }, [cards]);
  useEffect(() => {
    save(STORAGE_KEY + ":quick", quick);
  }, [quick]);
  useEffect(() => {
    save(STORAGE_KEY + ":quiz", quiz);
  }, [quiz]);
  useEffect(() => {
    save(STORAGE_KEY + ":api", apiKey);
  }, [apiKey]);
  useEffect(() => {
    save(STORAGE_KEY + ":model", model);
  }, [model]);

  const topics = DEFAULT_TOPICS[subject];
  // Quick quiz helpers
function normalize(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, "").replace(/∇/g, "grad").replace(/ε₀|ε0/g, "eps0");
}
function shuffleQuick() {
  const pool = quick.filter(q => q.subject === subject && q.kind === quickMode);
  if (!pool.length) { setQuickFeedback("(해당 모드의 문제가 없습니다)"); return; }
  const idx = Math.floor(Math.random() * pool.length);
  setQuickIndex(idx);
  setQuickFeedback("");
  setQuickInput("");
}
function checkQuick() {
  const pool = quick.filter(q => q.subject === subject && q.kind === quickMode);
  if (!pool.length) return;
  const current = pool[quickIndex % pool.length];
  const user = normalize(quickInput || "");
  const answers = current.answer.split("|").map(a => normalize(a));
  const ok = answers.some(a => user.includes(a) || a.includes(user));
  setQuickFeedback(ok ? "✅ 정답!" : `❌ 오답. 정답 예: ${current.answer}`);
}
// subject/mode 변경 시 새 문항
useEffect(() => { shuffleQuick(); /* eslint-disable-next-line */ }, [subject, quickMode]);


  useEffect(() => {
    setTopic(topics[0]);
  }, [subject]);

  const filteredNotes = useMemo(
    () => notes.filter((n) => n.subject === subject && (!topic || n.topic === topic)),
    [notes, subject, topic]
  );

  function addNote() {
    if (!input.trim()) return;
    const n: Note = { id: uid("note"), subject, topic, content: input.trim(), createdAt: Date.now() };
    setNotes((prev) => [n, ...prev]);
    setInput("");
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function doSummarize() {
    const corpus = filteredNotes.map((n) => n.content).join("\n\n");
    if (!corpus) {
      setSummary("요약할 노트가 없습니다. 먼저 노트를 추가하세요.");
      return;
    }
    setBusy(true);
    try {
      if (useGPT && apiKey) {
        const sys = "You are an expert TA for Korean undergraduate physics (Griffiths E&M, Beiser modern physics, Fowles analytic mechanics). Summarize clearly with bullet points and formulas in LaTeX inline where helpful. Respond in Korean.";
        const prompt = `다음 노트를 ${subject} 관점에서 한국어로 핵심 정리해줘.\n시험 대비 포인트/정리/함정/자주 나오는 유형으로 나눠줘.\n\n노트:\n${corpus}`;
        const out = await askGPT(sys, prompt, model, apiKey);
        setSummary(out);
      } else {
        setSummary(naiveSummarize(corpus, 6));
      }
    } catch (e: any) {
      setSummary(`요약 실패: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateQuiz() {
    setBusy(true);
    try {
      if (useGPT && apiKey) {
        const sys = "You are a strict physics examiner creating Korean multiple choice and short-answer questions with detailed solutions. Keep difficulty balanced and tag each problem.";
        const corpus = filteredNotes.map((n) => `• ${n.topic}: ${n.content}`).join("\n");
        const prompt = `다음 과목: ${subject}. 난이도 ${difficulty}. 한국어로 6문제(선다형 4문항+단답형 2문항)를 만들고, 각 문항에 정답과 풀이, 태그를 포함해 JSON으로 출력해줘. 키는 id, subject, question, choices(있으면), answer, solution, difficulty, tags. 노트:\n${corpus}`;
        const out = await askGPT(sys, prompt, model, apiKey);
        // naive JSON capture
        const jsonStr = out.match(/\{[\s\S]*\}\s*$/)?.[0] || out;
        const items = JSON.parse(jsonStr);
        const flat: QuizItem[] = Array.isArray(items) ? items : items.items || [];
        if (flat.length) setQuiz((prev) => [...flat, ...prev]);
      } else {
        // offline: sample variations from seed
        const pool = SEED_QUIZ.filter((q) => q.subject === subject);
        const variants = pool.slice(0, 6).map((q) => ({ ...q, id: uid("q"), difficulty }));
        setQuiz((prev) => [...variants, ...prev]);
      }
    } catch (e: any) {
      alert("문제 생성 실패: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateExamples() {
    setBusy(true);
    try {
      if (useGPT && apiKey) {
        const sys = "You write concise Korean real-world examples and analogies that map physics concepts to everyday phenomena, focusing on intuition without sacrificing rigor.";
        const prompt = `${subject}의 핵심 개념에 대해 한국어로 6개의 '실제 사례/직관적 비유'를 만들어줘. 각 항목은 한 문단(2~3문장)으로, 오개념 경고도 추가.`;
        const out = await askGPT(sys, prompt, model, apiKey);
        setAutoExamples(out);
      } else {
        const canned: Record<SubjectKey, string[]> = {
          Electromagnetism: [
            "스테인리스 싱크대에 손을 대면 미세한 정전기 충격: 도체 경계에서 전위가 일정하다는 경계조건의 체감 사례.",
            "휴대폰 무선충전: 변압-유도, 유도 기전력과 맥스웰-패러데이 법칙.",
            "복도 네온간판의 전기장 분포: 날카로운 전극 주변의 E-집중(코로나 방전).",
          ],
          "Modern Physics": [
            "자동차 레이더의 FMCW는 고전파지만, 레이저 거리계는 광자의 흡수/방출 통계와 신호대잡음에 양자적 한계가 스민다.",
            "태양전지는 광전효과의 집합체: 밴드갭보다 큰 광자만 유효 전자-정공쌍을 만든다.",
            "전자현미경 해상도: 드브로이 파장이 짧을수록 분해능이 올라감.",
          ],
          "Analytical Mechanics": [
            "빙판 위 컬링 스톤: 마찰이 작아 거의 보존계로 근사, 라그랑지안 접근이 적합.",
            "손전등 줄에 매단 추가 작은 각도로 흔들릴 때: 소진동 근사와 고유진동수 측정.",
            "자전거 경사로 내려갈 때 페달 고정: 비홀로노믹 속도구속의 직관적 예.",
          ],
        };
        setAutoExamples(canned[subject].map((s, i) => `${i + 1}. ${s}`).join("\n"));
      }
    } catch (e: any) {
      setAutoExamples("실제 사례 생성 실패: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  function exportAll() {
    const blob = new Blob([
      JSON.stringify({
        notes,
        cards,
        quiz,
        quick,
        meta: { exportedAt: new Date().toISOString() },
      }, null, 2),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `physics_prep_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importAll(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.notes) setNotes(data.notes);
        if (data.cards) setCards(data.cards);
        if (data.quiz) setQuiz(data.quiz);
        alert("가져오기 완료");
      } catch (e: any) {
        alert("가져오기 실패: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function startExam() {
    const pool = quiz.filter((q) => q.subject === subject);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setExamItems(shuffled.slice(0, 10));
  }

  function makeFlashcardsFromNotes() {
    const made: Flashcard[] = filteredNotes.slice(0, 8).map((n) => ({
      id: uid("fc"),
      subject,
      front: `${n.topic} — 핵심 키워드?`,
      back: naiveSummarize(n.content, 1),
      box: 1,
    }));
    setCards((prev) => [...made, ...prev]);
  }

  function nextLeitner(card: Flashcard, correct: boolean) {
    const delta = correct ? 1 : -1;
    const box = Math.max(1, Math.min(5, card.box + delta));
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, box, lastReviewed: Date.now() } : c)));
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          
          <h1 className="text-xl font-bold">Physics Exam Prep Studio</h1>
          <Badge variant="secondary">E&M · Modern · Mechanics</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Select value={subject} onValueChange={(v) => setSubject(v as SubjectKey)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="난이도" />
              </SelectTrigger>
              <SelectContent>
                {(["Easy", "Medium", "Hard"] as const).map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportAll}>
               내보내기
            </Button>
            <label className="inline-flex items-center gap-2 text-sm border px-3 py-2 rounded cursor-pointer">
               가져오기
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files && importAll(e.target.files[0])} />
            </label>
            <Button variant="ghost" size="icon" title="도움말" onClick={() => alert(HELP_TEXT)}>
              
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Notes & Tools */}
        <Card>
  <CardHeader className="pb-2">
    <CardTitle>시험범위 자동 정리 · 자동 퀴즈</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <p className="text-sm">현재 과목(<b>{subject}</b>)의 시험범위를 GPT가 자동 요약하고, 그 노트로 퀴즈를 생성합니다.</p>
    <div className="flex gap-2">
      <Button onClick={handleGenerateStudyPack} disabled={busy}>시험범위 자동 정리</Button>
      <Button onClick={handleGenerateSubjectQuiz} disabled={busy} variant="outline">범위 퀴즈 생성</Button>
    </div>
    <p className="text-xs">※ 상단 우측 “GPT 사용”을 켜고 API Key/Model을 입력하면 상세 요약·문제 생성이 자동 수행됩니다. 끈 상태에선 템플릿/시드로 동작합니다.</p>
  </CardContent>
</Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                 노트 입력 & 정리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={topic} onValueChange={(v) => setTopic(v)}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="주제" /></SelectTrigger>
                  <SelectContent>
                    {DEFAULT_TOPICS[subject].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 ml-auto">
                  <Checkbox id="useGPT" checked={useGPT} onCheckedChange={(v) => setUseGPT(Boolean(v))} />
                  <label htmlFor="useGPT" className="text-sm">GPT 사용</label>
                </div>
              </div>
              <Textarea
                placeholder="여기에 강의노트, 풀이, 정리 내용을 붙여넣으세요 (한국어/영어 모두 가능)."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[140px]"
              />
              <div className="flex gap-2">
                <Button onClick={addNote} disabled={!input.trim()}>
                   노트 추가
                </Button>
                <Button variant="secondary" onClick={doSummarize} disabled={busy}>
                   자동 요약
                </Button>
                <Button variant="outline" onClick={generateQuiz} disabled={busy}>
                   문제 생성
                </Button>
                <Button variant="outline" onClick={generateExamples} disabled={busy}>
                   실제 사례
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Card className="border-dashed">
                  <CardHeader className="py-3"><CardTitle className="text-base">자동 요약</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm leading-6">{summary || "(요약 결과가 여기에 표시됩니다)"}</pre>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardHeader className="py-3"><CardTitle className="text-base">실제 사례/비유</CardTitle></CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm leading-6">{autoExamples || "(생성된 실제 사례가 여기에 표시됩니다)"}</pre>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"> 문제 은행</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {quiz.filter((q) => q.subject === subject).slice(0, 20).map((q) => (
                  <div key={q.id} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>{q.subject}</Badge>
                      <Badge variant="secondary">{q.difficulty}</Badge>
                      {q.tags?.map((t) => (
                        <Badge key={t} variant="outline">#{t}</Badge>
                      ))}
                      <Button size="icon" variant="ghost" className="ml-auto" onClick={() => setQuiz((prev) => prev.filter((x) => x.id !== q.id))}>
                        
                      </Button>
                    </div>
                    <p className="font-medium">Q. {q.question}</p>
                    {q.choices && (
                      <ul className="list-disc pl-5 my-1 text-sm">
                        {q.choices.map((c, i) => (
                          <li key={i}>{String.fromCharCode(65 + i)}. {c}</li>
                        ))}
                      </ul>
                    )}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-sm text-neutral-600">정답/풀이 보기</summary>
                      <div className="text-sm mt-2">
                        <p><b>정답:</b> {q.answer}</p>
                        {q.solution && <p className="mt-1 whitespace-pre-wrap">{q.solution}</p>}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Study tools */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"> GPT 연동</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="OpenAI API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <Input placeholder="Model (예: gpt-4o-mini)" value={model} onChange={(e) => setModel(e.target.value)} />
              <p className="text-xs text-neutral-500">체크박스 "GPT 사용"을 켜면 요약/문제/사례 생성에 API가 사용됩니다.</p>
            </CardContent>
          </Card>
          <Card>
  <CardHeader className="pb-2">
    <CardTitle>퀵 퀴즈 & 개념 체크</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="flex items-center gap-2">
      <Select value={quickMode} onValueChange={(v) => setQuickMode(v as any)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="mapping">상황→공식(EM/Mechanics)</SelectItem>
          <SelectItem value="ox">OX(Modern)</SelectItem>
          <SelectItem value="short">단답(Modern)</SelectItem>
        </SelectContent>
      </Select>
      <Button className="ml-auto" variant="outline" onClick={shuffleQuick}>다음 문제</Button>
    </div>

    {(() => {
      const pool = quick.filter(q => q.subject === subject && q.kind === quickMode);
      const current = pool.length ? pool[quickIndex % pool.length] : undefined;
      return current ? (
        <div className="border rounded p-3">
          <p className="text-sm"><b>문제:</b> {current.prompt}</p>
          {quickMode !== "ox" ? (
            <div className="mt-2 flex gap-2">
              <Input
                placeholder={quickMode === "mapping" ? "공식/원리 (예: E=-∇V, 가우스 법칙)" : "정답 입력"}
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
              />
              <Button onClick={checkQuick}>정답확인</Button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <Button variant={quickInput === "O" ? "secondary" : "outline"} onClick={() => setQuickInput("O")}>O</Button>
              <Button variant={quickInput === "X" ? "secondary" : "outline"} onClick={() => setQuickInput("X")}>X</Button>
              <Button onClick={checkQuick}>정답확인</Button>
            </div>
          )}
          <p className="text-sm mt-2">{quickFeedback}</p>
          {quickFeedback && current.rationale && (
            <p className="text-xs text-neutral-600 mt-1">해설: {current.rationale}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">(해당 모드의 문제가 없습니다)</p>
      );
    })()}
  </CardContent>
</Card>


          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"> 노트 목록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={topic} onValueChange={(v) => setTopic(v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEFAULT_TOPICS[subject].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {filteredNotes.map((n) => (
                  <div key={n.id} className="border rounded px-3 py-2">
                    <div className="text-xs text-neutral-500 flex items-center gap-2">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      <Badge variant="outline">{n.topic}</Badge>
                      <Button size="icon" variant="ghost" className="ml-auto" onClick={() => deleteNote(n.id)}>
                        
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap mt-1">{n.content}</p>
                  </div>
                ))}
                {!filteredNotes.length && <p className="text-sm text-neutral-500">(해당 주제의 노트가 없습니다)</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"> 모의고사</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input type="number" value={examMinutes} onChange={(e) => setExamMinutes(Number(e.target.value))} />
                <span className="text-sm">분</span>
                <Button className="ml-auto" onClick={startExam}> 시작</Button>
              </div>
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {examItems.map((q, idx) => (
                  <div key={q.id} className="border rounded p-2">
                    <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
                    {q.choices && (
                      <ul className="list-disc pl-5 text-sm">
                        {q.choices.map((c, i) => <li key={i}>{String.fromCharCode(65 + i)}. {c}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
                {!examItems.length && <p className="text-sm text-neutral-500">(시작을 눌러 10문항 세트를 생성하세요)</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"> 플래시카드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={makeFlashcardsFromNotes}> 노트→카드</Button>
              </div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {cards.filter((c) => c.subject === subject).map((c) => (
                  <div key={c.id} className="border rounded p-2">
                    <div className="text-xs text-neutral-500 flex items-center gap-2">
                      <Badge variant="outline">Box {c.box}</Badge>
                      {c.lastReviewed && <span>{new Date(c.lastReviewed).toLocaleDateString()}</span>}
                      <Button size="icon" variant="ghost" className="ml-auto" onClick={() => setCards((prev) => prev.filter((x) => x.id !== c.id))}></Button>
                    </div>
                    <p className="font-medium text-sm mt-1">{c.front}</p>
                    <details className="text-sm mt-1">
                      <summary className="cursor-pointer text-neutral-600">정답 보기</summary>
                      <p className="mt-1 whitespace-pre-wrap">{c.back}</p>
                    </details>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="secondary" onClick={() => nextLeitner(c, true)}>맞음</Button>
                      <Button size="sm" variant="outline" onClick={() => nextLeitner(c, false)}>틀림</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-neutral-500">
        <p>© {new Date().getFullYear()} Physics Exam Prep Studio — Crafted for E&M · Modern · Analytical Mechanics</p>
      </footer>
    </div>
  );
}

const HELP_TEXT = `사용 가이드 (요약)

1) 과목/주제 선택 후 노트를 붙여넣고 [노트 추가]를 누르세요.
2) [자동 요약]은 GPT 사용을 켜면 OpenAI API로, 끄면 오프라인 요약(간이)이 동작합니다.
3) [문제 생성]으로 문제은행을 채우고, [모의고사]에서 10문항 세트를 바로 연습하세요.
4) [실제 사례]는 직관을 돕는 비유/현실 예시를 생성합니다.
5) [노트→카드]로 플래시카드를 만들고 Leitner 복습을 하세요.
6) [내보내기/가져오기]로 자료를 백업·이동할 수 있습니다.
7) [GPT 연동]에 API 키와 모델명을 넣고 헤더의 GPT 사용 체크박스를 켜면 됩니다.

권장 프롬프트 (자동 요약):
- "시험 대비 핵심 정리/함정/자주 나오는 유형/공식 유도 스케치로 나눠 요약해줘."

권장 프롬프트 (문제 생성):
- "그리피스(4판) 2장~3.2, 베이저 현대물리 기본 파트, Fowles 해석역학 라그랑지안 챕터 기반으로 서술/계산 혼합해 출제."
`;
