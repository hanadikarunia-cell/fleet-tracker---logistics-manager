import { useState } from 'react';
import { DriverPerformance, Vehicle } from '../../types';
import {
  Brain, GraduationCap, Award, PlayCircle, CheckCircle2,
  AlertTriangle, Sparkles, Lightbulb, FileText, ChevronRight,
  ShieldCheck, ArrowRight, HelpCircle, Trophy, BookOpen, Star
} from 'lucide-react';

interface SmartDriverTrainingProps {
  drivers: DriverPerformance[];
  vehicles: Vehicle[];
}

interface CourseModule {
  id: string;
  title: string;
  category: 'safety' | 'eco' | 'defensive' | 'compliance';
  durationMin: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  recommendedForTag: string;
  completionRate: number;
  quizQuestionsCount: number;
}

const TRAINING_MODULES: CourseModule[] = [
  {
    id: 'course_1',
    title: 'Harsh Braking & Cornering Remediation',
    category: 'defensive',
    durationMin: 15,
    level: 'Intermediate',
    description: 'Learn telematics-backed deceleration techniques to prevent kinetic brake wear and reduce rear-end collision risk by 42%.',
    recommendedForTag: 'Harsh Braking > 3/day',
    completionRate: 88,
    quizQuestionsCount: 4,
  },
  {
    id: 'course_2',
    title: 'Eco-Coasting & Kinetic Energy Management',
    category: 'eco',
    durationMin: 20,
    level: 'Advanced',
    description: 'Master engine braking, momentum anticipation, and smooth throttle modulation to cut fuel burn by up to 12.5%.',
    recommendedForTag: 'High Fuel Burn Drivers',
    completionRate: 74,
    quizQuestionsCount: 5,
  },
  {
    id: 'course_3',
    title: 'Commercial Fleet Night Driving & Fatigue Defense',
    category: 'safety',
    durationMin: 25,
    level: 'Beginner',
    description: 'Identify micro-sleep warning signs, circadian rhythm dips, and optimal rest interval strategies during heavy haul transit.',
    recommendedForTag: 'Night Shift Drivers',
    completionRate: 92,
    quizQuestionsCount: 5,
  },
  {
    id: 'course_4',
    title: 'Electronic Logging Devices (ELD) & HOS Compliance',
    category: 'compliance',
    durationMin: 10,
    level: 'Beginner',
    description: 'Guidelines on 11-hour driving limits, 14-hour duty windows, and mandatory 30-minute rest breaks.',
    recommendedForTag: 'All Long-Haul Drivers',
    completionRate: 96,
    quizQuestionsCount: 3,
  }
];

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'When approaching a steep downhill highway descent carrying heavy cargo, what is the safest braking strategy?',
    options: [
      'Rely entirely on continuous foot brake pressure to hold speed',
      'Select a lower gear early and utilize auxiliary engine/exhaust retarder brakes',
      'Shift the transmission into neutral to coast freely and cool the engine',
      'Pump the brakes rapidly every 2 seconds'
    ],
    correctIndex: 1,
    explanation: 'Utilizing lower gears and engine retarder braking prevents friction brake fade and overheating on long descents.',
  },
  {
    id: 'q2',
    question: 'How does excessive idle time (over 10 minutes) affect commercial diesel engine health?',
    options: [
      'It cleans the soot filters automatically',
      'It causes incomplete combustion, carbon buildup on injectors, and wasted fuel',
      'It extends oil change intervals by maintaining constant oil temperature',
      'It increases battery state of health by 15%'
    ],
    correctIndex: 1,
    explanation: 'Idle time wastes up to 3.8 liters of fuel per hour and accelerates carbon buildup inside engine cylinders.',
  },
  {
    id: 'q3',
    question: 'Under HOS regulations, after how many cumulative hours of driving is a mandatory 30-minute rest break required?',
    options: ['4 hours', '8 hours', '11 hours', '14 hours'],
    correctIndex: 1,
    explanation: 'A 30-minute rest break is legally required after 8 cumulative hours of driving without at least a 30-minute interruption.',
  }
];

export default function SmartDriverTrainingView({
  drivers,
  vehicles,
}: SmartDriverTrainingProps) {
  const getDriverKey = (d: DriverPerformance) => d.id || d.driverName || d.vehicleId;

  const [selectedDriverKey, setSelectedDriverKey] = useState<string>(
    getDriverKey(drivers[0] || { vehicleId: 'V1', driverName: 'Driver', safetyScore: 90, maxSpeed: 80, harshBrakingCount: 0, harshAccelerationCount: 0, idleTimeMin: 10, totalDistanceKm: 100 })
  );

  const [activeCourse, setActiveCourse] = useState<CourseModule | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  const currentDriver = drivers.find(d => getDriverKey(d) === selectedDriverKey) || drivers[0];
  const assignedVehicle = currentDriver ? vehicles.find(v => v.id === currentDriver.vehicleId) : null;

  // Generate Personalized AI Coaching Recommendations based on telematics
  const coachingPlan = (() => {
    if (!currentDriver) return [];
    const recommendations = [];

    if (currentDriver.harshBrakingCount > 2) {
      recommendations.push({
        priority: 'High',
        topic: 'Deceleration Control',
        action: 'Assigned: Harsh Braking Remediation Course',
        reason: `${currentDriver.harshBrakingCount} harsh braking incidents logged in recent shift.`,
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      });
    }

    if (currentDriver.idleTimeMin > 25) {
      recommendations.push({
        priority: 'Medium',
        topic: 'Fuel Idle Efficiency',
        action: 'Assigned: Eco-Coasting & Kinetic Energy Course',
        reason: `${currentDriver.idleTimeMin} mins idle time detected; target is <15 mins.`,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      });
    }

    if (currentDriver.maxSpeed > 95) {
      recommendations.push({
        priority: 'High',
        topic: 'Speed & Safety Margins',
        action: 'Speed Compliance Drill & Telematics Review',
        reason: `Max speed reached ${currentDriver.maxSpeed} km/h (Limit: 90 km/h).`,
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      });
    }

    recommendations.push({
      priority: 'Low',
      topic: 'Defensive Maneuvers',
      action: 'Recommended: Seasonal Highway Hazards Refresher',
      reason: 'Routine quarterly safety recertification milestone.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    });

    return recommendations;
  })();

  const handleOptionSelect = (optionIdx: number) => {
    const updated = [...selectedAnswers];
    updated[currentQuizIndex] = optionIdx;
    setSelectedAnswers(updated);
  };

  const handleNextQuestion = () => {
    if (currentQuizIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      // Calculate final score
      let correctCount = 0;
      QUIZ_QUESTIONS.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctIndex) {
          correctCount++;
        }
      });
      setScore(correctCount);
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuizIndex(0);
    setSelectedAnswers([]);
    setQuizCompleted(false);
    setQuizMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-indigo-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-400/30">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">AI Smart Driver Training & Coaching Academy</h3>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-400/40 uppercase tracking-wider">
                Telematics Personalized
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Automated micro-learning modules triggered directly from live telemetry safety events & driving scores.
            </p>
          </div>
        </div>

        {/* Driver Select */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-300">Target Driver:</span>
          <select
            value={selectedDriverKey}
            onChange={(e) => setSelectedDriverKey(e.target.value)}
            className="p-2.5 border border-slate-700 bg-slate-900 text-white rounded-xl text-xs font-extrabold outline-none"
          >
            {drivers.map(d => (
              <option key={getDriverKey(d)} value={getDriverKey(d)}>
                {d.driverName} (Safety: {d.safetyScore}/100)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Driver Telematics Coaching Dashboard */}
      {currentDriver && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Telematics Overview Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" /> Driver Telematics Profile
              </h4>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                Active Training Plan
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Driver Name:</span>
                <span className="text-xs font-extrabold text-slate-900">{currentDriver.driverName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Assigned Vehicle:</span>
                <span className="text-xs font-semibold text-slate-700">{assignedVehicle ? assignedVehicle.name : currentDriver.vehicleId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Safety Index:</span>
                <span className={`text-xs font-black font-mono ${currentDriver.safetyScore >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentDriver.safetyScore} / 100
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Harsh Braking Events:</span>
                <span className="text-xs font-mono font-bold text-rose-600">{currentDriver.harshBrakingCount} times</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setQuizMode(true);
                resetQuiz();
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" /> Start Safety Certification Quiz Drill
            </button>
          </div>

          {/* AI Automated Coaching Plan */}
          <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> AI Personalized Coaching Action Items
              </h4>
              <span className="text-xs text-slate-500 font-medium">Auto-generated from telemetry triggers</span>
            </div>

            <div className="space-y-3">
              {coachingPlan.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 hover:border-indigo-300 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                        Priority: {item.priority}
                      </span>
                      <span className="font-extrabold text-xs text-slate-900">{item.topic}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{item.action}</p>
                    <p className="text-[10px] text-slate-400">{item.reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveCourse(TRAINING_MODULES[idx % TRAINING_MODULES.length])}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    Start <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal Overlay */}
      {quizMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Commercial Safety Quiz Drill</h3>
                  <p className="text-[11px] text-slate-500">Question {currentQuizIndex + 1} of {QUIZ_QUESTIONS.length}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetQuiz}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Exit Quiz
              </button>
            </div>

            {!quizCompleted ? (
              <div className="space-y-4">
                <p className="text-sm font-extrabold text-slate-900 leading-relaxed">
                  {QUIZ_QUESTIONS[currentQuizIndex].question}
                </p>

                <div className="space-y-2">
                  {QUIZ_QUESTIONS[currentQuizIndex].options.map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleOptionSelect(idx)}
                      className={`w-full p-3 rounded-2xl text-left text-xs font-semibold border transition cursor-pointer ${
                        selectedAnswers[currentQuizIndex] === idx
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-extrabold mr-2">{String.fromCharCode(65 + idx)}.</span> {option}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={selectedAnswers[currentQuizIndex] === undefined}
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {currentQuizIndex < QUIZ_QUESTIONS.length - 1 ? 'Next Question' : 'Submit & See Score'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
                  <Trophy className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
                  <h4 className="font-extrabold text-base text-emerald-950">Quiz Drills Completed!</h4>
                  <p className="text-xs text-emerald-800">
                    You scored <span className="font-mono font-black text-sm">{score} / {QUIZ_QUESTIONS.length}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    {score === QUIZ_QUESTIONS.length
                      ? '🌟 Perfect score! +250 Eco Points awarded to your driver profile.'
                      : 'Good effort! Review the coaching suggestions to master defensive driving principles.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetQuiz}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
                >
                  Close & Claim Certification
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Training Catalog Modules */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" /> Commercial Training Module Library
          </h4>
          <span className="text-xs text-slate-500 font-medium">4 Certified Fleet Safety Courses</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRAINING_MODULES.map((course) => (
            <div key={course.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 hover:border-indigo-300 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-full border border-indigo-200 uppercase tracking-wider">
                    {course.category}
                  </span>
                  <h5 className="font-extrabold text-sm text-slate-900">{course.title}</h5>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">{course.durationMin} mins</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{course.description}</p>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-[10px] font-semibold text-slate-500">
                  Target: <strong className="text-slate-800">{course.recommendedForTag}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => alert(`Launching ${course.title} video module...`)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-indigo-400" /> Watch Module
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
