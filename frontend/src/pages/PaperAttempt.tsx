import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { 
  startPaperAttempt, 
  submitPaperAttempt, 
  getPaperAttempt,
  validatePaperAttempt,
  PaperAttempt as PaperAttemptType,
  PaperAttemptDetail,
  PaperAttemptCreate,
  GeneratedBlock,
  Question,
  PaperConfig
} from "@/lib/api";
import MathQuestion from "@/components/MathQuestion";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy, 
  Target, 
  ArrowLeft,
  CheckSquare,
  Square,
  X,
  RotateCcw
} from "lucide-react";

export default function PaperAttempt() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get paper data from location state or URL params
  const [paperConfig, setPaperConfig] = useState<PaperConfig | null>(null);
  const [generatedBlocks, setGeneratedBlocks] = useState<GeneratedBlock[]>([]);
  const [seed, setSeed] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<PaperAttemptType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStartScreen, setShowStartScreen] = useState(false);
  const [paperReady, setPaperReady] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [reAttempting, setReAttempting] = useState(false);
  const initializedRef = useRef(false);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Guard against stale attemptId - tracks the active attempt ID for the current session
  const activeAttemptIdRef = useRef<number | null>(null);
  // Guard against double submission - prevents submitting the same attempt twice
  const isSubmittingRef = useRef<boolean>(false);
  
  // Session state persistence
  const PAPER_SESSION_STORAGE_KEY = "paper_attempt_session_state";
  const [sessionState, setSessionState] = useState<"idle" | "started" | "in_progress" | "completed" | "aborted" | "recovered">("idle");
  
  // Save paper attempt state to localStorage
  const savePaperSessionState = () => {
    if (!paperReady || isSubmitted || !attemptId) return; // Don't save if not ready, submitted, or no attempt ID
    
    try {
      const state = {
        version: "1.0",
        state: "in_progress",
        timestamp: Date.now(),
        attemptId,
        paperConfig,
        generatedBlocks,
        seed,
        answers,
        startTime,
        currentTime,
      };
      localStorage.setItem(PAPER_SESSION_STORAGE_KEY, JSON.stringify(state));
      console.log("💾 [PAPER_SESSION] State saved to localStorage");
    } catch (error) {
      console.error("❌ [PAPER_SESSION] Failed to save state:", error);
    }
  };
  
  // Restore paper attempt state from localStorage
  const restorePaperSessionState = async (): Promise<boolean> => {
    try {
      const saved = localStorage.getItem(PAPER_SESSION_STORAGE_KEY);
      if (!saved) return false;
      
      const state = JSON.parse(saved);
      if (!state || state.state !== "in_progress") return false;
      
      // Check if session is too old (more than 30 minutes) - frontend quick check
      const age = Date.now() - state.timestamp;
      const FRONTEND_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
      if (age > FRONTEND_TIMEOUT_MS) {
        console.log("⚠️ [PAPER_SESSION] Saved session too old (frontend check), clearing");
        localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
        return false;
      }
      
      // Validate with backend that the attempt is still valid
      if (state.attemptId) {
        try {
          const validation = await validatePaperAttempt(state.attemptId);
          if (!validation.valid) {
            console.log(`⚠️ [PAPER_SESSION] Attempt ${state.attemptId} is not valid: ${validation.reason}`);
            localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
            return false;
          }
          console.log("✅ [PAPER_SESSION] Attempt validated with backend");
        } catch (validationError) {
          console.error("❌ [PAPER_SESSION] Error validating with backend:", validationError);
          // On validation error, don't restore to be safe
          localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
          return false;
        }
      }
      
      // Restore state
      if (state.paperConfig) setPaperConfig(state.paperConfig);
      if (state.generatedBlocks) setGeneratedBlocks(state.generatedBlocks);
      if (state.seed !== null && state.seed !== undefined) setSeed(state.seed);
      if (state.attemptId) {
        setAttemptId(state.attemptId);
        activeAttemptIdRef.current = state.attemptId;
      }
      if (state.answers) setAnswers(state.answers);
      if (state.startTime) setStartTime(state.startTime);
      if (state.currentTime !== undefined) setCurrentTime(state.currentTime);
      
      setSessionState("recovered");
      setPaperReady(true);
      console.log("✅ [PAPER_SESSION] State restored from localStorage");
      return true;
    } catch (error) {
      console.error("❌ [PAPER_SESSION] Failed to restore state:", error);
      localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
      return false;
    }
  };
  
  // Clear paper session state
  const clearPaperSessionState = () => {
    localStorage.removeItem(PAPER_SESSION_STORAGE_KEY);
    setSessionState("idle");
    console.log("🗑️ [PAPER_SESSION] State cleared");
  };
  
  // Auto-save paper session state periodically
  useEffect(() => {
    if (!paperReady || isSubmitted || !attemptId) return;
    
    const interval = setInterval(() => {
      savePaperSessionState();
    }, 5000); // Save every 5 seconds
    
    return () => clearInterval(interval);
  }, [paperReady, isSubmitted, attemptId, answers, startTime, currentTime]);
  
  // Save state on answer changes
  useEffect(() => {
    if (paperReady && !isSubmitted && attemptId) {
      savePaperSessionState();
    }
  }, [answers, attemptId]);

  const handleReAttempt = () => {
    if (!paperConfig || !generatedBlocks || seed === null) {
      console.error("Cannot re-attempt: missing paper data");
      return;
    }
    
    setReAttempting(true);
    try {
      // Store paper data in sessionStorage for re-attempt
      const paperData = {
        config: paperConfig,
        blocks: generatedBlocks,
        seed: seed
      };
      sessionStorage.setItem("paperAttemptData", JSON.stringify(paperData));
      
      // Reset state and navigate to attempt page
      setLocation("/paper/attempt");
      // The page will reload and pick up the data from sessionStorage
      window.location.reload();
    } catch (error) {
      console.error("Failed to start re-attempt:", error);
      alert("Failed to start re-attempt. Please try again.");
      setReAttempting(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAttempt = async () => {
      try {
        // Wait for auth to finish loading
        if (authLoading) {
          console.log("🟡 [ATTEMPT] Auth still loading...");
          return;
        }

        // Check authentication
        if (!isAuthenticated) {
          console.log("🟡 [ATTEMPT] Not authenticated, redirecting to login");
          if (mounted) setLocation("/login");
          return;
        }
        
        // Verify token exists in localStorage (double-check)
        const token = localStorage.getItem("auth_token");
        if (!token) {
          console.error("❌ [ATTEMPT] isAuthenticated is true but no token in localStorage");
          if (mounted) {
            setError("Authentication token not found. Please log in again.");
            setLoading(false);
            setLocation("/login");
          }
          return;
        }

        // Reset initializedRef first to allow new attempts
        // This is critical for re-attempts to work
        const wasInitialized = initializedRef.current;
        initializedRef.current = false;
        
        // Reset state for new attempt
        // CRITICAL: Clear ref FIRST (synchronous) before clearing state
        activeAttemptIdRef.current = null;
        console.log("🟡 [ATTEMPT] Cleared activeAttemptIdRef for new attempt initialization");
        
        if (mounted) {
          setAttemptId(null);
          setAnswers({});
          setStartTime(null);
          setIsSubmitted(false);
          setResult(null);
          setError(null);
          setShowStartScreen(false);
          setPaperReady(false);
        }

        // Only prevent if we're already in the process of initializing (to avoid duplicate calls)
        // But reset the ref first so re-attempts can create new attempts
        if (wasInitialized) {
          console.log("🟡 [ATTEMPT] Was previously initialized, but resetting for new attempt");
        }

        console.log("🟢 [ATTEMPT] Starting paper attempt initialization");
        initializedRef.current = true;

        // Check for recovery first (now async)
        const recovered = await restorePaperSessionState();
        if (recovered) {
          const shouldRecover = window.confirm(
            "A previous paper attempt was found. Would you like to continue where you left off?"
          );
          if (shouldRecover) {
            setSessionState("recovered");
            setLoading(false);
            setShowStartScreen(false); // Skip start screen for recovered sessions
            console.log("✅ [PAPER_SESSION] Session recovered");
            return;
          } else {
            clearPaperSessionState();
          }
        }
        
        // Get paper data from sessionStorage (passed from PaperCreate)
        const paperData = sessionStorage.getItem("paperAttemptData");
        console.log("🟡 [ATTEMPT] Paper data from sessionStorage:", paperData ? "Found" : "Not found");
        
        if (!paperData) {
          console.error("❌ [ATTEMPT] No paper data in sessionStorage");
          if (mounted) {
            setError("No paper data found. Please generate a paper first.");
            setLoading(false);
          }
          return;
        }

        const data = JSON.parse(paperData);
        console.log("🟢 [ATTEMPT] Parsed paper data:", {
          hasConfig: !!data.config,
          hasBlocks: !!data.blocks,
          blocksCount: data.blocks?.length || 0,
          seed: data.seed
        });
        
        const config = data.config;
        const blocks = data.blocks;
        const seedValue = data.seed;
        
        if (!config || !blocks || !Array.isArray(blocks) || seedValue === undefined || seedValue === null) {
          throw new Error("Invalid paper data structure");
        }
        
        if (mounted) {
          setPaperConfig(config);
          setGeneratedBlocks(blocks);
          setSeed(seedValue);
        }
        
        // Start the attempt immediately with the loaded data
        try {
          // Double-check token before API call
          const token = localStorage.getItem("auth_token");
          if (!token) {
            throw new Error("Authentication token not found. Please log in again.");
          }
          
          console.log("🟢 [ATTEMPT] Starting attempt API call...");
          const attemptData: PaperAttemptCreate = {
            paper_title: config.title,
            paper_level: config.level,
            paper_config: config,
            generated_blocks: blocks,
            seed: seedValue
          };
          
          const attempt = await startPaperAttempt(attemptData);
          const newAttemptId = attempt.id;
          console.log("🔵 [ATTEMPT] ===== NEW ATTEMPT CREATED =====");
          console.log("✅ [ATTEMPT] Attempt started successfully:", newAttemptId);
          console.log("✅ [ATTEMPT] New attempt ID:", newAttemptId);
          console.log("✅ [ATTEMPT] Previous attemptId (state):", attemptId);
          console.log("✅ [ATTEMPT] Previous ref:", activeAttemptIdRef.current);
          console.log("✅ [ATTEMPT] Paper title:", config.title);
          console.log("✅ [ATTEMPT] Seed:", seedValue);
          
          if (mounted) {
            // CRITICAL: Update the ref FIRST (synchronous, immediate)
            // This is the source of truth for the current attempt
            const oldRef = activeAttemptIdRef.current;
            activeAttemptIdRef.current = newAttemptId;
            console.log("✅ [ATTEMPT] Active attempt ID ref updated:", oldRef, "->", newAttemptId);
            
            // Then update state (asynchronous, but ref is already set)
            setAttemptId(newAttemptId);
            
            setLoading(false);
            setPaperReady(true);
            setShowStartScreen(true);
            
            // Clear any old result/state from previous attempt
            setResult(null);
            setIsSubmitted(false);
            setAnswers({});
            
            // Only remove from sessionStorage after successful start
            sessionStorage.removeItem("paperAttemptData");
          }
        } catch (err) {
          console.error("❌ [ATTEMPT] Failed to start attempt:", err);
          if (mounted) {
            const errorMessage = err instanceof Error ? err.message : "Failed to start attempt";
            setError(errorMessage);
            setLoading(false);
            
            // If it's an auth error, redirect to login
            if (errorMessage.includes("Not authenticated") || errorMessage.includes("authentication") || errorMessage.includes("token")) {
              console.log("🟡 [ATTEMPT] Auth error detected, redirecting to login");
              setTimeout(() => {
                setLocation("/login");
              }, 1000); // Small delay to show error message
            }
            // Don't remove from sessionStorage on error, so user can retry
          }
        }
      } catch (e) {
        console.error("❌ [ATTEMPT] Error parsing paper data:", e);
        if (mounted) {
          setError("Invalid paper data format");
          setLoading(false);
          // Remove invalid data
          sessionStorage.removeItem("paperAttemptData");
        }
      }
    };

    initializeAttempt();

    return () => {
      mounted = false;
      // Reset initializedRef when component unmounts or dependencies change
      // This ensures re-attempts can create new attempts
      initializedRef.current = false;
    };
  }, [isAuthenticated, authLoading, setLocation]);

  // Timer
  useEffect(() => {
    if (startTime !== null && !isSubmitted) {
      timerIntervalRef.current = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [startTime, isSubmitted]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      if (value === "") {
        delete newAnswers[questionId];
      } else {
        newAnswers[questionId] = value;
      }
      return newAnswers;
    });
  };

  const handleStartPaper = () => {
    // Verify we have a valid active attempt ID before starting
    if (!activeAttemptIdRef.current) {
      console.error("❌ [START] No active attempt ID found. Cannot start paper.");
      setError("No active attempt found. Please refresh and try again.");
      return;
    }
    
    setShowStartScreen(false);
    const now = Date.now();
    setStartTime(now);
    setCurrentTime(0);
    console.log("🟢 [START] Paper started with attempt ID:", activeAttemptIdRef.current);
  };

  const handleSubmit = async () => {
    // CRITICAL: Prevent double submission using ref (synchronous check)
    if (isSubmittingRef.current) {
      console.warn("⚠️ [SUBMIT] Submission already in progress, ignoring duplicate call");
      return;
    }
    
    // CRITICAL: Use the ref as the source of truth, not state
    // State can be stale due to React's asynchronous updates
    const activeAttemptId = activeAttemptIdRef.current;
    const currentStartTime = startTime;
    
    console.log("🔵 [SUBMIT] ===== SUBMIT ATTEMPT START =====");
    console.log("🔵 [SUBMIT] activeAttemptId (ref):", activeAttemptId);
    console.log("🔵 [SUBMIT] attemptId (state):", attemptId);
    console.log("🔵 [SUBMIT] currentStartTime:", currentStartTime);
    console.log("🔵 [SUBMIT] isSubmitted:", isSubmitted);
    console.log("🔵 [SUBMIT] submitting:", submitting);
    console.log("🔵 [SUBMIT] isSubmittingRef:", isSubmittingRef.current);
    
    if (!activeAttemptId || !currentStartTime) {
      console.error("❌ [SUBMIT] Cannot submit: activeAttemptId =", activeAttemptId, "startTime =", currentStartTime);
      console.error("❌ [SUBMIT] State attemptId =", attemptId, "isSubmitted =", isSubmitted);
      setError("Cannot submit: No active attempt found. Please refresh and try again.");
      return;
    }
    
    // Verify state matches ref (sanity check)
    if (attemptId !== activeAttemptId) {
      console.warn("⚠️ [SUBMIT] State and ref mismatch. State:", attemptId, "Ref:", activeAttemptId);
      console.warn("⚠️ [SUBMIT] Using ref value as source of truth.");
    }
    
    // Additional safety check: if attempt was already submitted, don't allow resubmission
    if (isSubmitted) {
      console.error("❌ [SUBMIT] Attempt already submitted (isSubmitted=true). Ignoring duplicate submission.");
      return;
    }
    
    // CRITICAL: Set submission lock IMMEDIATELY (before any async operations)
    // This prevents double submission even if user clicks multiple times
    if (isSubmittingRef.current) {
      console.warn("⚠️ [SUBMIT] Submission already in progress (lock detected), ignoring duplicate call");
      return;
    }
    isSubmittingRef.current = true;
    console.log("🔒 [SUBMIT] Submission lock acquired");
    
    // CRITICAL: Check if attempt is already completed on the backend BEFORE submitting
    // Do this check RIGHT BEFORE submission to minimize race condition window
    console.log("🔵 [SUBMIT] Checking attempt status on backend immediately before submission...");
    try {
      const attemptStatus = await getPaperAttempt(activeAttemptId);
      console.log("🔵 [SUBMIT] Attempt status check:", {
        id: attemptStatus.id,
        completed_at: attemptStatus.completed_at,
        isCompleted: !!attemptStatus.completed_at
      });
      
      if (attemptStatus.completed_at) {
        console.error("❌ [SUBMIT] Attempt", activeAttemptId, "is already completed on backend!");
        console.error("❌ [SUBMIT] Completed at:", attemptStatus.completed_at);
        
        // Show the results instead of error
            setResult(attemptStatus);
            setIsSubmitted(true);
            setSessionState("completed");
            clearPaperSessionState();
            activeAttemptIdRef.current = null;
            isSubmittingRef.current = false; // Release lock
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            console.log("✅ [SUBMIT] Showing existing results instead of submitting.");
            return;
      }
    } catch (statusError) {
      console.warn("⚠️ [SUBMIT] Could not check attempt status:", statusError);
      console.warn("⚠️ [SUBMIT] Proceeding with submission anyway...");
    }
    
    console.log("🟢 [SUBMIT] Attempt is not completed, proceeding with submission...");
    console.log("🟢 [SUBMIT] Submitting attempt ID:", activeAttemptId, "(from ref, state was:", attemptId, ")");
    const timeTaken = (Date.now() - currentStartTime) / 1000;
    console.log("🟢 [SUBMIT] Time taken:", timeTaken, "seconds");
    console.log("🟢 [SUBMIT] Answers count:", Object.keys(answers).length);
    
    setSubmitting(true);
    setError(null); // Clear any previous errors
    try {
      // Convert string answers to numbers for submission
      const numericAnswers: { [questionId: string]: number } = {};
      Object.keys(answers).forEach(key => {
        const numValue = parseFloat(answers[key]);
        if (!isNaN(numValue)) {
          numericAnswers[key] = numValue;
        }
      });
      const result = await submitPaperAttempt(activeAttemptId, numericAnswers, timeTaken);
      console.log("✅ [SUBMIT] Submission API call successful");
      console.log("✅ [SUBMIT] Result:", {
        id: result.id,
        completed_at: result.completed_at,
        score: result.score,
        points_earned: result.points_earned
      });
      
      setResult(result);
      setIsSubmitted(true);
      // Scroll to top after submission
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Mark session as completed and clear state
      setSessionState("completed");
      clearPaperSessionState();
      // Clear the active attempt ref after successful submission to prevent reuse
      activeAttemptIdRef.current = null;
      isSubmittingRef.current = false; // Release submission lock
      console.log("✅ [SUBMIT] Submission successful. Active attempt ref cleared.");
      console.log("🔓 [SUBMIT] Submission lock released");
      console.log("🔵 [SUBMIT] ===== SUBMIT ATTEMPT SUCCESS =====");
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    } catch (err: any) {
      console.error("❌ [SUBMIT] ===== SUBMIT ATTEMPT ERROR =====");
      console.error("❌ [SUBMIT] Error submitting attempt:", err);
      console.error("❌ [SUBMIT] Error type:", err?.constructor?.name);
      console.error("❌ [SUBMIT] Error message:", err?.message);
      console.error("❌ [SUBMIT] Attempt ID that failed:", activeAttemptId);
      
      // Check if error is "Attempt already completed"
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("Attempt already completed") || errMsg.includes("already completed")) {
        console.error("❌ [SUBMIT] Attempt already completed error detected!");
        console.error("❌ [SUBMIT] This means attempt", activeAttemptId, "was completed before this submission.");
        console.error("❌ [SUBMIT] Fetching attempt details to show results...");
        
        try {
          const attemptDetail = await getPaperAttempt(activeAttemptId);
          if (attemptDetail.completed_at) {
            console.log("✅ [SUBMIT] Found completed attempt, showing results");
            setResult(attemptDetail);
            setIsSubmitted(true);
            setSessionState("completed");
            clearPaperSessionState();
            activeAttemptIdRef.current = null;
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            console.log("✅ [SUBMIT] Showing existing results instead of error.");
            isSubmittingRef.current = false; // Release lock
            setSubmitting(false);
            return;
          }
        } catch (fetchError) {
          console.error("❌ [SUBMIT] Failed to fetch attempt details:", fetchError);
        }
        
        setError("This attempt was already completed. Showing results...");
        isSubmittingRef.current = false; // Release lock
        setSubmitting(false);
        return;
      }
      
      // If we get a network error (empty response), check if the attempt was actually completed
      // This handles the case where points are added but response fails
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        console.log("🟡 [SUBMIT] Network error detected, checking if attempt was completed...");
        try {
          // Try to fetch the attempt to see if it was completed
          // Use activeAttemptId from ref to avoid stale closure issues
          const attemptDetail = await getPaperAttempt(activeAttemptId);
          if (attemptDetail.completed_at) {
            console.log("✅ [SUBMIT] Attempt was completed despite network error, showing results");
            setResult(attemptDetail);
            setIsSubmitted(true);
            setSessionState("completed");
            clearPaperSessionState();
            // Clear the active attempt ref after successful submission
            activeAttemptIdRef.current = null;
            console.log("✅ [SUBMIT] Submission successful (recovered). Active attempt ref cleared.");
            isSubmittingRef.current = false; // Release lock
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            return; // Success - don't show error
          }
        } catch (fetchError) {
          console.error("❌ [SUBMIT] Failed to fetch attempt details:", fetchError);
        }
      }
      
      let errorMessage = "Failed to submit attempt";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        // Handle error objects from API
        if (err.detail) {
          errorMessage = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
        } else if (err.message) {
          errorMessage = typeof err.message === 'string' ? err.message : JSON.stringify(err.message);
        } else {
          errorMessage = JSON.stringify(err);
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      // Always release the submission lock
      isSubmittingRef.current = false;
      console.log("🔓 [SUBMIT] Submission lock released (finally block)");
      setSubmitting(false);
    }
  };

  const totalQuestions = generatedBlocks?.length > 0 
    ? generatedBlocks.reduce((sum, block) => sum + (block.questions?.length || 0), 0)
    : 0;
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-slate-300 dark:text-slate-300">Loading paper...</div>
          <div className="text-sm text-slate-400 dark:text-slate-400 mt-2">Please wait</div>
        </div>
      </div>
    );
  }

  if (error && !paperConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-400 dark:text-red-400 mb-4">{error}</div>
          <Link href="/create">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Go to Paper Creation
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link href="/dashboard">
            <button className="mb-6 flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-800 text-white rounded-lg shadow-lg hover:bg-slate-700 dark:hover:bg-slate-700 transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </Link>

          <div className="bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 mb-6 border border-slate-700 dark:border-slate-700 transition-all duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">Paper Completed!</h1>
              <p className="text-slate-300">{paperConfig?.title}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-blue-900/30 dark:bg-blue-900/30 border border-blue-700 dark:border-blue-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-blue-400 dark:text-blue-400">{result.correct_answers}</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Correct</div>
              </div>
              <div className="bg-red-900/30 dark:bg-red-900/30 border border-red-700 dark:border-red-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-red-400 dark:text-red-400">{result.wrong_answers}</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Wrong</div>
              </div>
              <div className="bg-yellow-900/30 dark:bg-yellow-900/30 border border-yellow-700 dark:border-yellow-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-yellow-400 dark:text-yellow-400">
                  {result.total_questions - result.correct_answers - result.wrong_answers}
                </div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Unattempted</div>
              </div>
              <div className="bg-purple-900/30 dark:bg-purple-900/30 border border-purple-700 dark:border-purple-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-purple-400 dark:text-purple-400">{result.accuracy.toFixed(1)}%</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Accuracy</div>
              </div>
              <div className="bg-emerald-900/30 dark:bg-emerald-900/30 border border-emerald-700 dark:border-emerald-700 rounded-xl p-4 text-center transition-all duration-300">
                <div className="text-3xl font-bold text-emerald-400 dark:text-emerald-400">{result.points_earned}</div>
                <div className="text-sm text-slate-300 dark:text-slate-300 mt-1">Points</div>
              </div>
            </div>

            <div className="bg-slate-700/50 dark:bg-slate-700/50 border border-slate-600 dark:border-slate-600 rounded-xl p-6 mb-6 transition-all duration-300">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-slate-300 dark:text-slate-300">Time Taken</div>
                  <div className="text-2xl font-bold text-white dark:text-white">
                    {result.time_taken ? formatTime(Math.floor(result.time_taken)) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-300 dark:text-slate-300">Score</div>
                  <div className="text-2xl font-bold text-white dark:text-white">
                    {result.score} / {result.total_questions}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleReAttempt}
                disabled={reAttempting || !paperConfig || !generatedBlocks || seed === null}
                className="w-full sm:flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RotateCcw className={`w-5 h-5 ${reAttempting ? "animate-spin" : ""}`} />
                {reAttempting ? "Starting..." : "Re-attempt Paper"}
              </button>
              <Link href="/dashboard" className="w-full sm:flex-1">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                  View Dashboard
                </button>
              </Link>
              <Link href="/create" className="w-full sm:flex-1">
                <button className="w-full px-6 py-3 bg-slate-700 dark:bg-slate-700 border-2 border-slate-600 dark:border-slate-600 text-white dark:text-white rounded-lg font-semibold hover:bg-slate-600 dark:hover:bg-slate-600 transition-all">
                  Create New Paper
                </button>
              </Link>
            </div>
          </div>

          {/* Results breakdown */}
          <div className="bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 border border-slate-700 dark:border-slate-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6">Question Review</h2>
            
            {/* Separate questions into categories */}
            {(() => {
              const allQuestions: Array<{ question: Question; blockIdx: number; blockTitle?: string }> = [];
              generatedBlocks.forEach((block, blockIdx) => {
                block.questions.forEach((question) => {
                  allQuestions.push({ question, blockIdx, blockTitle: block.config.title });
                });
              });

              const correctQuestions = allQuestions.filter(({ question }) => {
                const userAnswerStr = answers[question.id];
                if (userAnswerStr === undefined) return false;
                // For large integers, compare as strings to avoid precision loss
                const userAnswerTrimmed = userAnswerStr.trim();
                const correctAnswerStr = String(question.answer);
                const userHasDecimal = userAnswerTrimmed.includes('.');
                const correctHasDecimal = correctAnswerStr.includes('.') || String(question.answer).includes('e') || String(question.answer).includes('E');
                
                if (!userHasDecimal && !correctHasDecimal) {
                  // Both are integers - compare as strings
                  return userAnswerTrimmed === correctAnswerStr;
                } else {
                  // At least one has decimals - use float comparison with tolerance
                  const userAnswer = parseFloat(userAnswerTrimmed);
                  return !isNaN(userAnswer) && Math.abs(userAnswer - question.answer) < 0.01;
                }
              });

              const wrongQuestions = allQuestions.filter(({ question }) => {
                const userAnswerStr = answers[question.id];
                if (userAnswerStr === undefined) return false;
                // For large integers, compare as strings to avoid precision loss
                const userAnswerTrimmed = userAnswerStr.trim();
                const correctAnswerStr = String(question.answer);
                const userHasDecimal = userAnswerTrimmed.includes('.');
                const correctHasDecimal = correctAnswerStr.includes('.') || String(question.answer).includes('e') || String(question.answer).includes('E');
                
                if (!userHasDecimal && !correctHasDecimal) {
                  // Both are integers - compare as strings
                  return userAnswerTrimmed !== correctAnswerStr;
                } else {
                  // At least one has decimals - use float comparison with tolerance
                  const userAnswer = parseFloat(userAnswerTrimmed);
                  return !isNaN(userAnswer) && Math.abs(userAnswer - question.answer) >= 0.01;
                }
              });

              const unattemptedQuestions = allQuestions.filter(({ question }) => {
                return answers[question.id] === undefined;
              });

              return (
                <div className="space-y-8">
                  {/* Correct Questions */}
                  {correctQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-green-400 dark:text-green-400 mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6" />
                        Correct Answers ({correctQuestions.length})
                      </h3>
                      <div className="space-y-3">
                        {correctQuestions.map(({ question, blockTitle }) => {
                          const userAnswerStr = answers[question.id] || "";
                          return (
                            <div
                              key={question.id}
                              className="p-4 rounded-lg border-2 bg-green-900/30 dark:bg-green-900/30 border-green-700 dark:border-green-700 transition-all duration-300"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  {blockTitle && (
                                    <p className="text-xs text-green-300 dark:text-green-300 mb-1">{blockTitle}</p>
                                  )}
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-semibold text-white dark:text-white">Q{question.id}:</span>
                                    <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-green-400 dark:text-green-400">
                                      Your answer: <span className="font-semibold">{userAnswerStr}</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-300">
                                      Correct: <span className="font-semibold">{question.answer}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <CheckCircle2 className="w-6 h-6 text-green-400 dark:text-green-400" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Wrong Questions */}
                  {wrongQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-red-400 dark:text-red-400 mb-4 flex items-center gap-2">
                        <XCircle className="w-6 h-6" />
                        Wrong Answers ({wrongQuestions.length})
                      </h3>
                      <div className="space-y-3">
                        {wrongQuestions.map(({ question, blockTitle }) => {
                          const userAnswerStr = answers[question.id] || "";
                          return (
                            <div
                              key={question.id}
                              className="p-4 rounded-lg border-2 bg-red-900/30 dark:bg-red-900/30 border-red-700 dark:border-red-700 transition-all duration-300"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  {blockTitle && (
                                    <p className="text-xs text-red-300 dark:text-red-300 mb-1">{blockTitle}</p>
                                  )}
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-semibold text-white dark:text-white">Q{question.id}:</span>
                                    <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-red-400 dark:text-red-400">
                                      Your answer: <span className="font-semibold">{userAnswerStr}</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-300">
                                      Correct: <span className="font-semibold">{question.answer}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <XCircle className="w-6 h-6 text-red-400 dark:text-red-400" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unattempted Questions */}
                  {unattemptedQuestions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-yellow-400 dark:text-yellow-400 mb-4 flex items-center gap-2">
                        <Square className="w-6 h-6" />
                        Unattempted Questions ({unattemptedQuestions.length})
                      </h3>
                      <div className="space-y-3">
                        {unattemptedQuestions.map(({ question, blockTitle }) => (
                          <div
                            key={question.id}
                            className="p-4 rounded-lg border-2 bg-yellow-900/30 dark:bg-yellow-900/30 border-yellow-700 dark:border-yellow-700 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {blockTitle && (
                                  <p className="text-xs text-yellow-300 dark:text-yellow-300 mb-1">{blockTitle}</p>
                                )}
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-semibold text-white dark:text-white">Q{question.id}:</span>
                                  <MathQuestion question={question} showAnswer={false} largeFont={true} />
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-yellow-400 dark:text-yellow-400">
                                    Your answer: <span className="font-semibold">—</span>
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-300">
                                    Correct: <span className="font-semibold">{question.answer}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <Square className="w-6 h-6 text-yellow-400 dark:text-yellow-400" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Safety check - don't render if we don't have the necessary data
  if (!paperConfig || !generatedBlocks || generatedBlocks.length === 0) {
    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl text-red-400 dark:text-red-400 mb-4">{error}</div>
            <Link href="/create">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Go to Paper Creation
              </button>
            </Link>
          </div>
        </div>
      );
    }
    // Still loading or no data
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-slate-300 dark:text-slate-300">Loading paper...</div>
        </div>
      </div>
    );
  }

  // Start screen overlay
  if (showStartScreen && paperReady) {
    const totalQuestions = generatedBlocks.reduce((sum: number, block: GeneratedBlock) => 
      sum + (block.questions?.length || 0), 0);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-2xl p-8 max-w-md w-full mx-4 relative border border-slate-700 dark:border-slate-700 transition-all duration-300">
          <button
            onClick={() => setShowStartScreen(false)}
            className="absolute top-4 right-4 text-slate-400 dark:text-slate-400 hover:text-white dark:hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white dark:text-white mb-2">{paperConfig.title}</h2>
            <p className="text-slate-300 dark:text-slate-300">{paperConfig.level}</p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 dark:bg-slate-700/50 border border-slate-600 dark:border-slate-600 rounded-lg transition-all duration-300">
              <span className="text-slate-300 dark:text-slate-300 font-medium">Total Questions:</span>
              <span className="text-white dark:text-white font-bold text-lg">{totalQuestions}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 dark:bg-slate-700/50 border border-slate-600 dark:border-slate-600 rounded-lg transition-all duration-300">
              <span className="text-slate-300 dark:text-slate-300 font-medium">Blocks:</span>
              <span className="text-white dark:text-white font-bold text-lg">{generatedBlocks.length}</span>
            </div>
          </div>

          <div className="bg-blue-900/30 dark:bg-blue-900/30 border border-blue-700 dark:border-blue-700 rounded-lg p-4 mb-6 transition-all duration-300">
            <p className="text-sm text-blue-300 dark:text-blue-300">
              <strong>Note:</strong> The timer will start as soon as you click "Start Paper". 
              Make sure you're ready before proceeding.
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/create" className="flex-1">
              <button className="w-full px-6 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white rounded-lg font-semibold hover:bg-slate-600 dark:hover:bg-slate-600 transition-all">
                Cancel
              </button>
            </Link>
            <button
              onClick={handleStartPaper}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              Start Paper
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-6 transition-colors duration-300">
      <div className="container mx-auto">
        {/* Page Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setShowExitConfirm(true)}
              className="group flex items-center gap-2 px-6 py-3 bg-background border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-primary" />
              <span className="font-bold uppercase tracking-widest text-muted-foreground">Exit Paper</span>
            </button>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground flex items-center gap-3">
              <Target className="w-10 h-10 text-primary" />
              {paperConfig.title}
            </h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-card-foreground">{formatTime(currentTime)}</span>
              </div>
              <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {answeredCount} / {totalQuestions} answered
              </div>
            </div>
          </div>
        </header>

        {/* Exit Confirmation Modal */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-700 dark:border-slate-700 transition-all duration-300">
              <h3 className="text-xl font-bold text-white dark:text-white mb-2">Exit Paper?</h3>
              <p className="text-slate-300 dark:text-slate-300 mb-6">
                Your progress will be saved, but the timer will stop. Are you sure you want to exit?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 dark:bg-slate-700 text-white dark:text-white rounded-lg font-semibold hover:bg-slate-600 dark:hover:bg-slate-600 transition-all"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    // Mark session as aborted and save state before exiting
                    if (paperReady && !isSubmitted && attemptId) {
                      setSessionState("aborted");
                      savePaperSessionState();
                    }
                    window.location.href = '/create';
                  }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
                >
                  Exit Paper
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6 mb-6">
          {generatedBlocks.map((block, blockIdx) => {
            if (!block || !block.questions || block.questions.length === 0) {
              return null;
            }
            return (
            <div key={blockIdx} className="bg-slate-800/90 dark:bg-slate-800/90 rounded-2xl shadow-xl dark:shadow-2xl p-6 border border-slate-700/50 dark:border-slate-700/50 transition-all duration-300">
              {block.config?.title && (
                <h2 className="text-xl font-bold text-white dark:text-white mb-4">{block.config.title}</h2>
              )}
              
              {block.questions.some(q => q?.isVertical) ? (
                // Vertical questions
                <div className="grid grid-cols-10 gap-2">
                  {block.questions.map((question) => (
                    <div key={question.id} className="border border-slate-600 dark:border-slate-600 rounded-xl p-2 bg-slate-700/50 dark:bg-slate-700/50 shadow-sm hover:shadow-md hover:border-slate-500 dark:hover:border-slate-500 transition-all">
                      <div className="text-center mb-1.5">
                        <span className="font-semibold text-blue-400 dark:text-blue-400 text-sm">{question.id}.</span>
                      </div>
                      <MathQuestion question={question} showAnswer={false} hideSerialNumber={true} largeFont={true} />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={answers[question.id] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow empty, integers, decimals, and negative numbers, max 20 characters
                          if (val === "" || (/^-?\d*\.?\d*$/.test(val) && val.length <= 20)) {
                            handleAnswerChange(question.id, val);
                          }
                        }}
                        maxLength={20}
                        className="w-full mt-1.5 px-2 py-1.5 border border-slate-600 dark:border-slate-600 rounded-lg text-center font-medium text-sm bg-slate-800 dark:bg-slate-800 text-white dark:text-white focus:bg-slate-700 dark:focus:bg-slate-700 focus:border-blue-400 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 transition-all"
                        placeholder="?"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // Horizontal questions - fill columns vertically first (like PDF)
                (() => {
                  const questions = block.questions;
                  const numCols = 2;
                  const numRows = Math.ceil(questions.length / numCols);
                  const columns: Question[][] = Array.from({ length: numCols }, () => []);
                  questions.forEach((q, idx) => {
                    const col = idx % numCols;
                    columns[col].push(q);
                  });
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {columns.map((colQuestions, colIdx) => (
                        <div key={colIdx} className="space-y-4">
                          {colQuestions.map((question) => (
                    <div key={question.id} className="flex items-center gap-3 py-2">
                      <span className="font-semibold text-blue-400 dark:text-blue-400 min-w-[2rem] text-lg">{question.id}.</span>
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1">
                          <MathQuestion question={question} showAnswer={false} hideSerialNumber={true} largeFont={true} />
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={answers[question.id] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Allow empty, integers, decimals, and negative numbers, max 20 characters
                            if (val === "" || (/^-?\d*\.?\d*$/.test(val) && val.length <= 20)) {
                              handleAnswerChange(question.id, val);
                            }
                          }}
                          maxLength={20}
                          className="w-32 px-3 py-2 border-2 border-slate-600 dark:border-slate-600 bg-slate-700 dark:bg-slate-700 text-white dark:text-white rounded-lg text-center font-semibold text-lg focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-900/30 transition-all"
                          placeholder="?"
                        />
                      </div>
                    </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-2xl p-6 sticky bottom-4 border border-slate-700 dark:border-slate-700 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="text-slate-300 dark:text-slate-300">
              {answeredCount === totalQuestions ? (
                <span className="text-green-400 dark:text-green-400 font-semibold">All questions answered!</span>
              ) : (
                <span>{totalQuestions - answeredCount} questions remaining</span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5" />
                  Submit Paper
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 dark:bg-red-900/30 border-2 border-red-700 dark:border-red-700 rounded-xl transition-all duration-300">
            <div className="text-red-300 dark:text-red-300">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

