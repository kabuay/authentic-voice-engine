"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { db, auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, User } from "firebase/auth";
import { humanizeText } from "./actions";
import Image from "next/image";

interface Persona {
  id: string;
  name: string;
  instructions: string;
}

const DEFAULT_PERSONAS: Persona[] = [
  {
    id: "default-1",
    name: "Standard Human",
    instructions: "Rewrite the text to sound clear, natural, and authentically human. Keep it engaging but professional, and strictly avoid robotic phrasing."
  },
  {
    id: "default-2",
    name: "Pirate Captain",
    instructions: "Rewrite the text as a swashbuckling pirate captain. Use nautical terms, pirate slang (like 'arrr', 'matey', 'shiver me timbers'), and a generally boisterous and aggressive tone."
  },
  {
    id: "default-3",
    name: "Gen-Z Influencer",
    instructions: "Rewrite the text in the style of a TikTok or Instagram Gen-Z influencer. Use lots of current slang (e.g., 'no cap', 'fr fr', 'slay', 'bet'), use an overly enthusiastic, casual tone and add exactly one relevant emoji at the end of the text."
  },
  {
    id: "default-4",
    name: "Academic Scholar",
    instructions: "Rewrite the text in a formal, scholarly tone suitable for an academic paper or journal. Use precise vocabulary, structured argumentation, and cite-worthy phrasing. Avoid contractions and colloquialisms entirely."
  },
  {
    id: "default-5",
    name: "Poetic Soul",
    instructions: "Rewrite the text with rich, lyrical language full of vivid imagery and metaphor. Let the words flow with rhythm and emotion, as if composing prose poetry. Prioritize beauty of expression over bluntness."
  },
  {
    id: "default-6",
    name: "Storyteller",
    instructions: "Rewrite the text as if narrating a compelling story. Draw the reader in with scene-setting details, dramatic pacing, and a warm, engaging narrative voice. Make even mundane topics feel like an adventure worth following."
  },
  {
    id: "default-7",
    name: "Corporate Executive",
    instructions: "Rewrite the text in a polished, boardroom-ready corporate tone. Use strategic language, action-oriented phrasing, and leadership vocabulary. Keep it concise, authoritative, and results-driven."
  },
  {
    id: "default-8",
    name: "Creative Maverick",
    instructions: "Rewrite the text with bold, unconventional flair. Break traditional writing rules when it serves the message. Use unexpected word choices, playful sentence structures, and a confident, boundary-pushing voice that stands out."
  }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authActionLoading, setAuthActionLoading] = useState(false);

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(true);

  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaInstructions, setNewPersonaInstructions] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);

  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [inputText, setInputText] = useState("");
  const [humanizedText, setHumanizedText] = useState("");
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<string | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchPersonas = async () => {
    if (!user) {
      setPersonas([...DEFAULT_PERSONAS]);
      setLoadingPersonas(false);
      return;
    }
    try {
      setLoadingPersonas(true);
      const q = query(collection(db, "personas"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetchedPersonas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Persona[];
      setPersonas([...DEFAULT_PERSONAS, ...fetchedPersonas]);
      if (!selectedPersonaId || selectedPersonaId === "") {
        setSelectedPersonaId(DEFAULT_PERSONAS[0].id);
      }
    } catch (err) {
      console.error("Error fetching personas:", err);
    } finally {
      setLoadingPersonas(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPersonas();
    } else {
      setPersonas([...DEFAULT_PERSONAS]);
      setSelectedPersonaId(DEFAULT_PERSONAS[0].id);
      setLoadingPersonas(false);
    }
  }, [user]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      setAuthError("Google sign-in failed. Please allow popups and try again.");
    }
  };

  const parseAuthError = (code: string): string => {
    switch (code) {
      case "auth/user-not-found": return "No account found with that email.";
      case "auth/wrong-password": return "Incorrect password. Please try again.";
      case "auth/email-already-in-use": return "An account with this email already exists. Try signing in instead.";
      case "auth/invalid-email": return "Please enter a valid email address.";
      case "auth/weak-password": return "Password must be at least 6 characters.";
      case "auth/invalid-credential": return "Invalid email or password. Please check your credentials.";
      case "auth/too-many-requests": return "Too many failed attempts. Please try again later.";
      default: return "An error occurred. Please try again.";
    }
  };

  const handleEmailSignIn = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) { setAuthError("Please enter both email and password."); return; }
    setAuthError(null); setAuthActionLoading(true);
    try { await signInWithEmailAndPassword(auth, emailInput, passwordInput); }
    catch (error: any) { setAuthError(parseAuthError(error.code)); }
    finally { setAuthActionLoading(false); }
  };

  const handleEmailCreateAccount = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) { setAuthError("Please enter both email and password."); return; }
    setAuthError(null); setAuthActionLoading(true);
    try { await createUserWithEmailAndPassword(auth, emailInput, passwordInput); }
    catch (error: any) { setAuthError(parseAuthError(error.code)); }
    finally { setAuthActionLoading(false); }
  };

  const handleAnonymousSignIn = async () => {
    setAuthError(null); setAuthActionLoading(true);
    try { await signInAnonymously(auth); }
    catch (error: any) { setAuthError("Could not sign in anonymously. Please try again."); }
    finally { setAuthActionLoading(false); }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setPersonas([...DEFAULT_PERSONAS]);
      setSelectedPersonaId(DEFAULT_PERSONAS[0].id);
      setInputText(""); setHumanizedText("");
    } catch (error) { console.error("Error signing out", error); }
  };

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName.trim() || !newPersonaInstructions.trim()) return;
    try {
      setSavingPersona(true);
      await addDoc(collection(db, "personas"), {
        name: newPersonaName, instructions: newPersonaInstructions, createdAt: new Date().toISOString()
      });
      setNewPersonaName(""); setNewPersonaInstructions("");
      setIsVaultOpen(false);
      await fetchPersonas();
    } catch (err: any) {
      window.alert("Failed to save persona. Error: " + err?.message);
    } finally { setSavingPersona(false); }
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    const selectedPersona = personas.find(p => p.id === selectedPersonaId);
    if (!selectedPersona) { setError("Please select a persona first."); return; }
    try {
      setIsHumanizing(true); setError(null);
      const result = await humanizeText(inputText, selectedPersona.instructions);
      if (result.success && result.text) { setHumanizedText(result.text); }
      else { setError(result.error || "Failed to humanize text."); }
    } catch (err: any) { setError(err?.message || "An unexpected error occurred."); }
    finally { setIsHumanizing(false); }
  };

  const handleDeletePersonaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedPersonaId) return;
    setPersonaToDelete(selectedPersonaId);
  };

  const confirmDeletePersona = async () => {
    if (!personaToDelete) return;
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, "personas", personaToDelete));
      const updated = personas.filter(p => p.id !== personaToDelete);
      setPersonas(updated);
      setSelectedPersonaId(updated.length > 0 ? updated[0].id : "");
      setPersonaToDelete(null);
    } catch (err: any) { window.alert("Failed to delete persona. Error: " + err?.message); }
    finally { setIsDeleting(false); }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault(); setInputText(""); setHumanizedText(""); setError(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(humanizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-background)" }}>

      {/* ───── NAVBAR ───── */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[--color-border]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Balay School" className="w-9 h-9 object-contain" />
            <div className="flex items-center gap-0">
              <span className="font-bold text-lg text-[--color-text-main] tracking-tight">Authentic</span>
              <span className="font-bold text-lg text-gradient-brand ml-1 tracking-tight">Voice</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-sm text-[--color-text-muted] font-medium">
                {user.isAnonymous ? "Guest" : (user.displayName || user.email)}
              </span>
            )}
            <button
              onClick={() => setIsVaultOpen(true)}
              className="btn-primary text-sm px-5 py-2"
            >
              {user ? "My Vault" : "Sign In"}
            </button>
            {user && (
              <button
                onClick={handleSignOut}
                className="btn-secondary text-sm px-4 py-2"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <header className="bg-white border-b border-[--color-border]">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-[--color-brand-start] bg-purple-50 border border-purple-100 rounded-full px-4 py-1.5 mb-6 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-brand inline-block"></span>
            Powered by Balay School
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[--color-text-main] leading-tight mb-5">
            Write in Your<br />
            <em className="text-gradient-brand not-italic">Authentic Voice.</em>
          </h1>
          <p className="text-[--color-text-body] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Transform generic AI drafts into text that sounds unmistakably, beautifully <em>you</em>. Select a persona and let the engine do the rest.
          </p>
        </div>
      </header>

      {/* ───── MAIN ENGINE CARD ───── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="card p-8 md:p-10">

          {/* Section header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[--color-text-main] font-serif">The Engine</h2>
              <p className="text-[--color-text-muted] text-sm mt-1">Select your persona and paste any AI-generated text.</p>
            </div>
            {/* Persona delete button */}
            {selectedPersonaId && !selectedPersonaId.startsWith("default-") && user && (
              <button
                type="button"
                onClick={handleDeletePersonaClick}
                disabled={isDeleting}
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50 tracking-wide"
              >
                {isDeleting ? "Deleting..." : "Delete Persona"}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-6">

            {/* Active Persona */}
            <div>
              <label htmlFor="persona-select" className="block text-xs font-semibold text-[--color-text-muted] tracking-widest uppercase mb-2">
                Active Persona
              </label>
              <div className="relative">
                <select
                  id="persona-select"
                  value={selectedPersonaId}
                  onChange={(e) => setSelectedPersonaId(e.target.value)}
                  className="clean-input px-4 py-3.5 text-[15px] cursor-pointer pr-10"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
                  disabled={loadingPersonas || personas.length === 0}
                >
                  {loadingPersonas ? (
                    <option value="">Loading personas...</option>
                  ) : personas.length === 0 ? (
                    <option value="">No personas yet — sign in to create one</option>
                  ) : (
                    personas.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Draft Input */}
            <div>
              <label htmlFor="draft-input" className="block text-xs font-semibold text-[--color-text-muted] tracking-widest uppercase mb-2">
                Draft Input
              </label>
              <textarea
                id="draft-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your AI-generated text here..."
                className="clean-input px-4 py-3.5 text-[15px] min-h-[200px] resize-y"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleHumanize}
                disabled={isHumanizing || !inputText.trim() || personas.length === 0}
                className="btn-primary flex-1 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isHumanizing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin"></div>
                    Synthesizing...
                  </span>
                ) : "Humanize Text"}
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isHumanizing || (!inputText && !humanizedText)}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>

            {/* Output */}
            {humanizedText && (
              <div className="mt-2 animate-[slideUp_0.4s_ease-out]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold tracking-widest uppercase text-gradient-brand">
                    Humanized Output
                  </label>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[--color-text-muted] hover:text-[--color-brand-start] transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="clean-input px-5 py-5 text-[15px] leading-relaxed whitespace-pre-wrap bg-purple-50 border-purple-100 text-[--color-text-body]">
                  {humanizedText}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ───── FOOTER ───── */}
      <footer style={{ background: "var(--color-navy)" }} className="py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Balay School" className="w-8 h-8 object-contain opacity-90" />
            <span className="text-white/60 text-sm">Authentic Voice Engine by Balay School</span>
          </div>
          <p className="text-white/30 text-xs">© 2026 Balay School | Baysayn LLC. All rights reserved.</p>
        </div>
      </footer>

      {/* ───── DELETE CONFIRM MODAL ───── */}
      {personaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center gap-4 border border-[--color-border]">
            <div className="icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-[--color-text-main] font-serif">Delete Persona?</h3>
            <p className="text-[--color-text-muted] text-sm leading-relaxed">This persona will be permanently removed from your Vault. This action cannot be undone.</p>
            <div className="flex w-full gap-3 mt-2">
              <button type="button" onClick={() => setPersonaToDelete(null)} disabled={isDeleting} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePersona}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-full font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── THE VAULT MODAL ───── */}
      {isVaultOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] p-4">
          <section className="bg-white border border-[--color-border] shadow-2xl w-full max-w-lg rounded-3xl p-8 relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => { setIsVaultOpen(false); setAuthError(null); }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pr-8">
              <div className="icon-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[--color-text-main] font-serif">The Vault</h2>
                <p className="text-sm text-[--color-text-muted]">
                  {user ? "Create and manage your custom personas." : "Sign in to save your custom writing personas."}
                </p>
              </div>
            </div>

            <div className="h-px bg-[--color-border]"></div>

            {!user ? (
              <div className="flex flex-col gap-4">

                {/* Google */}
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[--color-border] hover:border-purple-200 hover:bg-purple-50 px-5 py-3.5 rounded-full font-semibold text-[--color-text-main] text-sm transition-all active:scale-95"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[--color-border]"></div>
                  <span className="text-xs text-[--color-text-muted] font-medium">or</span>
                  <div className="flex-1 h-px bg-[--color-border]"></div>
                </div>

                {/* Email / Password */}
                <div className="flex flex-col gap-3">
                  <input
                    id="vault-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setAuthError(null); }}
                    placeholder="Email address"
                    className="clean-input px-4 py-3.5 text-sm"
                    autoComplete="email"
                  />
                  <input
                    id="vault-password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => { setPasswordInput(e.target.value); setAuthError(null); }}
                    placeholder="Password (min. 6 characters)"
                    className="clean-input px-4 py-3.5 text-sm"
                    autoComplete="current-password"
                  />

                  {authError && (
                    <p className="text-red-500 text-sm font-medium px-1 animate-[fadeIn_0.2s_ease-out]">{authError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleEmailSignIn}
                      disabled={authActionLoading}
                      className="flex-1 btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {authActionLoading ? "..." : "Sign In"}
                    </button>
                    <button
                      type="button"
                      onClick={handleEmailCreateAccount}
                      disabled={authActionLoading}
                      className="flex-1 btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {authActionLoading ? "..." : "Create Account"}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[--color-border]"></div>
                  <span className="text-xs text-[--color-text-muted] font-medium">or</span>
                  <div className="flex-1 h-px bg-[--color-border]"></div>
                </div>

                {/* Guest */}
                <button
                  type="button"
                  onClick={handleAnonymousSignIn}
                  disabled={authActionLoading}
                  className="w-full flex items-center justify-center gap-2 text-[--color-text-muted] hover:text-[--color-brand-start] text-sm font-medium transition-colors py-2 disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  Continue as Guest
                </button>

              </div>
            ) : (
              <form onSubmit={handleSavePersona} className="flex flex-col gap-5">
                <div>
                  <label htmlFor="persona-name" className="block text-xs font-semibold text-[--color-text-muted] tracking-widest uppercase mb-2">Persona Name</label>
                  <input
                    id="persona-name"
                    type="text"
                    value={newPersonaName}
                    onChange={(e) => setNewPersonaName(e.target.value)}
                    placeholder="e.g., Aggressive Sales Exec"
                    className="clean-input px-4 py-3.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="persona-instructions" className="block text-xs font-semibold text-[--color-text-muted] tracking-widest uppercase mb-2">Instructions & Style Guide</label>
                  <textarea
                    id="persona-instructions"
                    value={newPersonaInstructions}
                    onChange={(e) => setNewPersonaInstructions(e.target.value)}
                    placeholder="Describe your ideal tone. E.g., Use extremely short, punchy sentences. Maximum burstiness."
                    className="clean-input px-4 py-3.5 text-sm min-h-[160px] resize-y"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPersona}
                  className="btn-primary flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPersona ? "Saving..." : "Save to Vault"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {/* ───── AUTH LOADING OVERLAY ───── */}
      {authLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
