"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, orderBy, query, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { humanizeText } from "./actions";
import Image from "next/image";

interface Persona {
  id: string;
  name: string;
  instructions: string;
}

export default function Home() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(true);

  // Vault state
  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaInstructions, setNewPersonaInstructions] = useState("");
  const [savingPersona, setSavingPersona] = useState(false);

  // Engine state
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [inputText, setInputText] = useState("");
  const [humanizedText, setHumanizedText] = useState("");
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [personaToDelete, setPersonaToDelete] = useState<string | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);

  // Fetch personas
  const fetchPersonas = async () => {
    try {
      setLoadingPersonas(true);
      const q = query(collection(db, "personas"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetchedPersonas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Persona[];
      setPersonas(fetchedPersonas);
      if (fetchedPersonas.length > 0 && !selectedPersonaId) {
        setSelectedPersonaId(fetchedPersonas[0].id);
      }
    } catch (err) {
      console.error("Error fetching personas:", err);
    } finally {
      setLoadingPersonas(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName.trim() || !newPersonaInstructions.trim()) return;

    try {
      setSavingPersona(true);
      await addDoc(collection(db, "personas"), {
        name: newPersonaName,
        instructions: newPersonaInstructions,
        createdAt: new Date().toISOString()
      });
      setNewPersonaName("");
      setNewPersonaInstructions("");
      setIsVaultOpen(false);
      await fetchPersonas();
    } catch (err: any) {
      console.error("Error saving persona:", err);
      window.alert("Failed to save persona. Are your Firebase Database Rules set to allow writes? Error: " + err?.message);
    } finally {
      setSavingPersona(false);
    }
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    const selectedPersona = personas.find(p => p.id === selectedPersonaId);
    if (!selectedPersona) {
      setError("Please select a persona first.");
      return;
    }

    try {
      setIsHumanizing(true);
      setError(null);
      const result = await humanizeText(inputText, selectedPersona.instructions);
      if (result.success && result.text) {
        setHumanizedText(result.text);
      } else {
        setError(result.error || "Failed to humanize text.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsHumanizing(false);
    }
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

      const updatedPersonas = personas.filter(p => p.id !== personaToDelete);
      setPersonas(updatedPersonas);
      setSelectedPersonaId(updatedPersonas.length > 0 ? updatedPersonas[0].id : "");
      setPersonaToDelete(null);
    } catch (err: any) {
      console.error("Error deleting persona:", err);
      window.alert("Failed to delete persona. Error: " + err?.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    setInputText("");
    setHumanizedText("");
    setError(null);
  };

  return (
    <main className="min-h-screen py-8 px-6 sm:px-12 md:px-20 lg:px-32 max-w-[1400px] mx-auto flex flex-col gap-12 overflow-hidden relative">

      {/* Background Ambient Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[--color-brand-start] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[--color-brand-end] rounded-full mix-blend-screen filter blur-[100px] opacity-20 pointer-events-none"></div>

      {/* TOP NAVIGATION BAR */}
      <nav className="flex items-center justify-between z-10 w-full mb-4">
        <div className="flex items-center gap-4 animate-[fadeIn_0.5s_ease-out]">
          <div className="w-12 h-12 md:w-16 md:h-16 relative flex-shrink-0">
            <img
              src="/logo.png"
              alt="Balay School Logo"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-lg">
              Authentic Voice
            </h1>
          </div>
        </div>

        <button
          onClick={() => setIsVaultOpen(true)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-full font-medium text-white transition-all shadow-lg active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <span className="hidden sm:inline">Manage Personas</span>
        </button>
      </nav>

      {/* CUSTOM CONFIRMATION MODAL (DELETE) */}
      {personaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[--color-background] border border-[--color-border] p-8 rounded-[32px] shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center gap-4">
            <h3 className="text-2xl font-bold text-white">Delete Persona?</h3>
            <p className="text-[--color-text-muted] text-[15px] leading-relaxed mb-4">
              Are you sure you want to delete this persona? This action cannot be undone.
            </p>
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setPersonaToDelete(null)}
                disabled={isDeleting}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePersona}
                disabled={isDeleting}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-6 py-3 rounded-full font-semibold transition-all duration-300 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THE VAULT MODAL (Progressive Disclosure) */}
      {isVaultOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out] p-4">
          <section className="bg-[--color-background]/90 border border-[--color-border] shadow-2xl w-full max-w-2xl rounded-[32px] p-8 md:p-12 relative flex flex-col gap-8 h-fit max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setIsVaultOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="flex flex-col gap-2 pr-10">
              <h2 className="text-3xl font-bold text-white tracking-tight">The Vault</h2>
              <p className="text-[15px] text-[--color-text-muted] leading-relaxed">
                Curate the instructions, tone, and specific flair for your distinct writing personas.
              </p>
            </div>

            <form onSubmit={handleSavePersona} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2.5">
                <label htmlFor="persona-name" className="text-sm font-semibold text-white/80 tracking-wide uppercase">Persona Name</label>
                <input
                  id="persona-name"
                  type="text"
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  placeholder="e.g., Aggressive Sales Exec"
                  className="glass-input px-5 py-4 text-[15px]"
                  required
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <label htmlFor="persona-instructions" className="text-sm font-semibold text-white/80 tracking-wide uppercase">Instructions & Style Guide</label>
                <textarea
                  id="persona-instructions"
                  value={newPersonaInstructions}
                  onChange={(e) => setNewPersonaInstructions(e.target.value)}
                  placeholder="Describe your ideal tone. E.g., Use extremely short, punchy sentences. Maximum burstiness. Leverage subtle sarcasm."
                  className="glass-input px-5 py-4 text-[15px] min-h-[180px] resize-y"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingPersona}
                className="btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {savingPersona ? "Saving..." : "Save to Vault"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* CENTERED HERO: THE ENGINE */}
      <div className="flex justify-center z-10 w-full relative">
        <section className="w-full max-w-4xl glass-panel p-8 md:p-12 flex flex-col gap-10">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h2 className="text-3xl font-bold text-white tracking-tight">The Engine</h2>
            <p className="text-[15px] text-[--color-text-muted] leading-relaxed">
              Select your persona and paste generic AI drafts to watch them come to life.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="persona-select" className="text-sm font-semibold text-white/80 tracking-wide uppercase">Active Persona</label>
                {personas.length > 0 && selectedPersonaId && (
                  <button
                    type="button"
                    onClick={handleDeletePersonaClick}
                    disabled={isDeleting}
                    className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 tracking-wide uppercase"
                  >
                    {isDeleting ? "Deleting..." : "Delete Persona"}
                  </button>
                )}
              </div>
              <select
                id="persona-select"
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="glass-input px-5 py-4 text-[15px] cursor-pointer appearance-none"
                style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22rgba%28255%2C255%2C255%2C0.5%29%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center" }}
                disabled={loadingPersonas || personas.length === 0}
              >
                {loadingPersonas ? (
                  <option value="">Loading personas...</option>
                ) : personas.length === 0 ? (
                  <option value="">No personas saved yet</option>
                ) : (
                  personas.map(p => (
                    <option key={p.id} value={p.id} className="bg-[--color-background] text-white py-2">{p.name}</option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2.5">
              <label htmlFor="generic-text" className="text-sm font-semibold text-white/80 tracking-wide uppercase">Draft Input</label>
              <textarea
                id="generic-text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste the robotic-sounding text here..."
                className="glass-input px-5 py-4 text-[15px] min-h-[180px] resize-y"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl text-sm font-medium backdrop-blur-md">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={handleHumanize}
                disabled={isHumanizing || !inputText.trim() || personas.length === 0}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isHumanizing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/50 border-t-white animate-spin"></div>
                    Synthesizing...
                  </span>
                ) : "Humanize Text"}
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                disabled={isHumanizing || (!inputText && !humanizedText)}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                Clear
              </button>
            </div>

            {humanizedText && (
              <div className="mt-6 flex flex-col gap-3 animate-[fadeIn_0.5s_ease-out]">
                <label className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-brand tracking-wide uppercase">Humanized Output</label>
                <div className="relative group">
                  <div className="glass-input p-6 text-[15px] leading-relaxed whitespace-pre-wrap bg-white/5 border-white/20">
                    {humanizedText}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(humanizedText)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 bg-[--color-background] p-2.5 rounded-full border border-[--color-border] hover:bg-white/10 hover:border-white/20 shadow-lg text-white/70 hover:text-white transition-all transform hover:scale-110 active:scale-95 duration-200"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
