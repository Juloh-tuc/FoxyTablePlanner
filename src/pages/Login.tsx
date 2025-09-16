// src/pages/Login.tsx
import React, { useEffect, useRef, useState } from "react";
import "../styles/login.css";
import "../styles/planner-common.css";

type Profile = {
  username: string;
  avatar?: string;
};

const LS_KEY = "ft_profile";
const MAX_SIDE = 512;

function Login() {
  const [username, setUsername] = useState<string>("");
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        const parsed: Profile = JSON.parse(raw);
        setUsername(parsed.username || "");
        setAvatar(parsed.avatar);
      } catch {
        /* ignore JSON invalide */
      }
    }
  }, []);

  const handleFile = async (file: File) => {
    const dataURL = await fileToDataURL(file);
    const resized = await downscaleImage(dataURL, MAX_SIDE);
    setAvatar(resized);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const removeAvatar = () => setAvatar(undefined);

  const showSuccessNotification = () => {
    const n = document.createElement("div");
    n.className = "login-success";
    n.textContent = "✨ Profil enregistré avec succès !";
    document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add("show"));
    setTimeout(() => {
      n.classList.remove("show");
      setTimeout(() => n.remove(), 300);
    }, 3000);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const payload: Profile = { username: username.trim(), avatar };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    setSaving(false);
    showSuccessNotification();
  };

  return (
    <div className="login-page login-theme">
      <div className="login-hero">
        <main className="login-wrap">
          <section className="login-card" aria-labelledby="login-title">
            <h1 id="login-title">✨ Mon Profil</h1>
            <p className="muted">
              Crée ton identité unique avec un pseudo stylé et une photo d&apos;avatar qui te
              ressemble. Aucun compte nécessaire !
            </p>

            <form onSubmit={onSubmit} className="login-form">
              <label className="form-field">
                <span className="label">🎭 Ton pseudo</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: SuperAna2024"
                  required
                  aria-required="true"
                />
              </label>

              <div className="form-field">
                <span className="label">🖼️ Avatar</span>
                <div className="avatar-row">
                  {avatar ? (
                    <div className="avatar-preview">
                      <img src={avatar} alt="Aperçu de l’avatar" />
                      <button type="button" className="btn btn-ghost" onClick={removeAvatar}>
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <div className="avatar-preview">
                      <img
                        alt="Avatar par défaut"
                        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzYiIGN5PSIzNiIgcj0iMzYiIGZpbGw9InVybCgjZ3JhZGllbnQwKSIvPgo8Y2lyY2xlIGN4PSIzNiIgY3k9IjI4IiByPSIxMiIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuOCIvPgo8ZWxsaXBzZSBjeD0iMzYiIGN5PSI1NiIgcng9IjE4IiByeT0iMTIiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjgiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZGllbnQwIiB4MT0iMCIgeTE9IjAiIHgyPSI3MiIgeTI9IjcyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM2NjdlZWEiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNzY0YmEyIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+"
                      />
                      <button
                        type="button"
                        className="btn"
                        onClick={() => fileRef.current?.click()}
                        aria-label="Téléverser un avatar"
                      >
                        📸 Choisir une image
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    hidden
                  />
                </div>
                <p className="help">
                  💡 Formats acceptés : JPG, PNG, WebP. Ton image reste privée dans ton navigateur.
                </p>
              </div>

              <div className="actions">
                <button className="btn btn-primary" disabled={saving} type="submit">
                  {saving ? "⏳ Création en cours..." : "🚀 Créer mon profil"}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
async function fileToDataURL(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Lecture du fichier échouée"));
    fr.readAsDataURL(file);
  });
}

async function downscaleImage(dataURL: string, maxSide: number): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Chargement de l’image échoué"));
    i.src = dataURL;
  });

  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataURL;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/webp", 0.9);
}

export default Login;
