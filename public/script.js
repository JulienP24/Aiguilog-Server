"use strict";

/* Diag minimal */
console.log("[Aiguilog] JS chargé");
window.addEventListener("error", (e) => console.error("[Aiguilog] Erreur globale:", e.error || e.message));

document.addEventListener("DOMContentLoaded", () => {
  /* =================== UTILITAIRES =================== */
  function formatValue(val) { return val ? `~${val}m` : ""; }
  function getUser() {
    const raw = localStorage.getItem("user");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function getToken() { return localStorage.getItem("token") || ""; }
  function handleAuthError() {
    alert("Session expirée, veuillez vous reconnecter.");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "utilisateur.html";
  }
  async function jsonOrError(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      try { return await res.json(); } catch { return { error: "JSON invalide reçu du serveur" }; }
    } else {
      const text = await res.text();
      return { error: "Réponse non-JSON du serveur", raw: text };
    }
  }

  /* =================== NAV / ROUTES =================== */
  const currentPath = window.location.pathname;
  const file = currentPath.split("/").pop() || "index.html";

  function updateUserIconLink() {
    document.querySelectorAll('a[href="mon-compte.html"]').forEach((link) => {
      link.setAttribute("href", getUser() ? "mon-compte.html" : "utilisateur.html");
    });
  }
  updateUserIconLink();

  const protectedFiles = new Set(["mon-compte.html", "sorties-a-faire.html", "sorties-faites.html"]);
  if (protectedFiles.has(file)) {
    if (!getToken() || !getUser()) {
      window.location.replace("utilisateur.html");
      return;
    }
  }

  /* =================== MOBILE MENU =================== */
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenuToggle && mobileMenu) {
    const setBtnIcon = (state) => {
      mobileMenuToggle.innerHTML = state === "open"
        ? `<picture>
             <source media="(prefers-color-scheme: dark)" srcset="images/close-white.png">
             <source media="(prefers-color-scheme: light)" srcset="images/close-black.png">
             <img src="images/close-black.png" alt="Fermer le menu" class="hamburger-icon">
           </picture>`
        : `<picture>
             <source media="(prefers-color-scheme: dark)" srcset="images/hamburger-white.png">
             <source media="(prefers-color-scheme: light)" srcset="images/hamburger-black.png">
             <img src="images/hamburger-black.png" alt="Ouvrir le menu" class="hamburger-icon">
           </picture>`;
      mobileMenuToggle.setAttribute("aria-expanded", state === "open" ? "true" : "false");
    };
    setBtnIcon("closed");
    mobileMenuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
      setBtnIcon(mobileMenu.classList.contains("open") ? "open" : "closed");
    });
  }

  /* =================== BOUTONS RAPIDES =================== */
  const btnGoLogin = document.getElementById("btn-go-login");
  if (btnGoLogin) btnGoLogin.addEventListener("click", (e) => { e.preventDefault(); window.location.assign("utilisateur.html"); });

  /* =================== CONNEXION =================== */
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username")?.value.trim() || "";
      const password = document.getElementById("login-password")?.value.trim() || "";
      if (!username || !password) return alert("Veuillez remplir tous les champs.");

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await jsonOrError(res);
        if (res.ok && data?.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user || {}));
          updateUserIconLink();
          window.location.replace("mon-compte.html");
        } else {
          alert("Erreur de connexion : " + (data?.error || `Statut ${res.status}`));
        }
      } catch (err) {
        console.error(err); alert("Erreur lors de la connexion au serveur");
      }
    });

    const btnCreerCompte = document.getElementById("btn-creer-compte");
    if (btnCreerCompte) btnCreerCompte.addEventListener("click", (e) => {
      e.preventDefault(); window.location.assign("creer-compte.html");
    });
  }

  /* =================== INSCRIPTION =================== */
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const firstName = document.getElementById("register-firstname")?.value.trim() || "";
      const lastName  = document.getElementById("register-lastname")?.value.trim() || "";
      const username  = document.getElementById("register-username")?.value.trim() || "";
      const password  = document.getElementById("register-password")?.value.trim() || "";
      const birthdate = document.getElementById("register-birthdate")?.value || "";
      if (!firstName || !lastName || !username || !password || !birthdate) return alert("Veuillez remplir tous les champs.");

      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, username, password, birthdate })
        });
        const data = await jsonOrError(res);
        if (res.ok && data?.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user || {}));
          updateUserIconLink();
          window.location.replace("mon-compte.html");
        } else {
          alert("Erreur d'inscription : " + (data?.error || `Statut ${res.status}`));
        }
      } catch (err) {
        console.error(err); alert("Erreur lors de la connexion au serveur");
      }
    });
  }

  /* =================== MON COMPTE =================== */
  if (document.getElementById("titre-bienvenue")) {
    const userData = getUser();
    if (!userData) {
      window.location.replace("utilisateur.html");
    } else {
      const titreBienvenue = document.getElementById("titre-bienvenue");
      const infoMembre = document.getElementById("info-membre");
      titreBienvenue.textContent = `Bienvenue, ${userData.firstName || ""} ${userData.lastName || ""} (${userData.username || ""})`.trim();
      if (userData.birthdate) {
        const d = new Date(userData.birthdate);
        infoMembre.textContent = `Né(e) le ${d.toLocaleDateString("fr-FR")}`;
      }
    }
  }

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("utilisateur.html");
    });
  }

  /* =================== TABLE LAYOUT =================== */
  function applyTableLayout() {
    const tables = document.querySelectorAll("table.table--sorties");
    tables.forEach((table) => {
      table.querySelectorAll("colgroup").forEach((cg) => cg.remove());
      const colgroup = document.createElement("colgroup");
      const widths = ["90px", "22ch", "7ch", "7ch", "12ch", "7ch", "12ch", ""];
      widths.forEach((w, i) => {
        const c = document.createElement("col");
        if (w) c.style.width = w;
        if (i === 7) c.className = "col-details";
        colgroup.appendChild(c);
      });
      table.insertBefore(colgroup, table.firstChild);
    });
  }
  applyTableLayout();

  /* =================== CHARGEMENT DES SORTIES =================== */
  async function loadSorties() {
    const token = getToken();
    if (!token) return [];
    try {
      const res = await fetch("/api/sorties", { headers: { Authorization: "Bearer " + token } });
      if (res.status === 401) { handleAuthError(); return []; }
      const data = await jsonOrError(res);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Erreur loadSorties:", err);
      return [];
    }
  }

  async function displaySorties() {
    const sorties = await loadSorties();
    const isFaites = file.includes("sorties-faites");
    const typeToDisplay = isFaites ? "fait" : "a-faire";
    const tableBody = document.getElementById(isFaites ? "table-body-fait" : "table-body-afaire");
    if (!tableBody) return;

    tableBody.innerHTML = "";
    sorties
      .filter((s) => s.type === typeToDisplay)
      .forEach((s) => {
        const tr = document.createElement("tr");
        tr.setAttribute("data-id", s._id);
        tr.innerHTML = `
          <td class="cell-actions">
            <button class="edit-btn" type="button" onclick="editRow(this.closest('tr'), '${s.type}')">✏️</button>
            <button class="delete-btn" type="button" onclick="deleteRow(this.closest('tr'))">🗑</button>
          </td>
          <td class="cell-sommet">${s.sommet || ""}</td>
          <td class="cell-alt">${formatValue(s.altitude)}</td>
          <td class="cell-den">${formatValue(s.denivele)}</td>
          <td class="cell-method">${s.methode || ""}</td>
          <td class="cell-cot">${s.cotation || ""}</td>
          <td class="cell-date">${s.type === "fait" ? (s.date || "") : (s.annee || "")}</td>
          <td class="cell-details">${s.details || ""}</td>
        `;
        tableBody.appendChild(tr);
      });

    applyTableLayout();
  }
  displaySorties();

  /* =================== FORM "À FAIRE" =================== */
  const formAFaire = document.getElementById("form-a-faire");
  if (formAFaire) {
    const methodeSelect = document.getElementById("methode");
    const cotationSelect = document.getElementById("cotation");
    const yearSelect = document.getElementById("year");
    const detailsInput = document.getElementById("details");

    const cotationsMap = {
      Alpinisme: ["F", "PD", "AD", "D", "TD", "ED", "ABO"],
      Randonnée: ["Facile", "Moyen", "Difficile", "Expert"],
      Escalade: ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c"],
    };

    if (methodeSelect && cotationSelect) {
      const refill = () => {
        const val = methodeSelect.value;
        cotationSelect.innerHTML = `<option value="" disabled selected>Cotation</option>`;
        (cotationsMap[val] || []).forEach((opt) => {
          const o = document.createElement("option"); o.value = opt; o.textContent = opt; cotationSelect.appendChild(o);
        });
      };
      methodeSelect.addEventListener("change", refill);
    }

    if (yearSelect) {
      const currentYear = new Date().getFullYear();
      yearSelect.innerHTML = `<option value="" disabled selected>Année</option>`;
      for (let i = 0; i < 10; i++) {
        const y = currentYear + i;
        const op = document.createElement("option"); op.value = y; op.textContent = y; yearSelect.appendChild(op);
      }
    }

    formAFaire.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = getToken();
      if (!token) { alert("Vous n'êtes pas connecté."); window.location.replace("utilisateur.html"); return; }

      const sommet = (document.getElementById("sommet")?.value || "").trim();
      const altitude = (document.getElementById("altitude")?.value || "").trim();
      const denivele = (document.getElementById("denivele")?.value || "").trim();
      const methode = methodeSelect?.value || "";
      const cotation = cotationSelect?.value || "";
      const annee = yearSelect?.value || "";
      const details = (detailsInput?.value || "").trim();

      if (!sommet || !altitude || !denivele || !methode || !cotation || !annee) {
        alert("Veuillez remplir tous les champs obligatoires."); return;
      }

      try {
        const res = await fetch("/api/sorties", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ type: "a-faire", sommet, altitude, denivele, methode, cotation, annee, details }),
        });
        if (res.status === 401) return handleAuthError();
        const data = await jsonOrError(res);

        if (res.ok) { alert("Sortie à faire ajoutée !"); await displaySorties(); formAFaire.reset(); }
        else { alert("Erreur lors de l'ajout de la sortie : " + (data.error || `Statut ${res.status}`)); }
      } catch (err) { console.error(err); alert("Erreur lors de la connexion au serveur"); }
    });
  }

  /* =================== FORM "FAITES" =================== */
  const formFait = document.getElementById("form-fait");
  if (formFait) {
    const methodeFaitSelect = document.getElementById("methode-fait");
    const cotationFaitSelect = document.getElementById("cotation-fait");
    const dateInput = document.getElementById("date");
    const detailsFait = document.getElementById("details-fait");

    const cotationsMap = {
      Alpinisme: ["F", "PD", "AD", "D", "TD", "ED", "ABO"],
      Randonnée: ["Facile", "Moyen", "Difficile", "Expert"],
      Escalade: ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c"],
    };

    if (methodeFaitSelect && cotationFaitSelect) {
      const refill = () => {
        const val = methodeFaitSelect.value;
        cotationFaitSelect.innerHTML = `<option value="" disabled selected>Cotation</option>`;
        (cotationsMap[val] || []).forEach((opt) => {
          const o = document.createElement("option"); o.value = opt; o.textContent = opt; cotationFaitSelect.appendChild(o);
        });
      };
      methodeFaitSelect.addEventListener("change", refill);
    }

    formFait.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = getToken();
      if (!token) { alert("Vous n'êtes pas connecté."); window.location.replace("utilisateur.html"); return; }

      const sommet = (document.getElementById("sommet-fait")?.value || "").trim();
      const altitude = (document.getElementById("altitude-fait")?.value || "").trim();
      const denivele = (document.getElementById("denivele-fait")?.value || "").trim();
      const methode = methodeFaitSelect?.value || "";
      const cotation = cotationFaitSelect?.value || "";
      const dateVal = dateInput?.value || "";
      const details = (detailsFait?.value || "").trim();

      if (!sommet || !altitude || !denivele || !methode || !cotation || !dateVal) {
        alert("Veuillez remplir tous les champs obligatoires."); return;
      }

      try {
        const res = await fetch("/api/sorties", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ type: "fait", sommet, altitude, denivele, methode, cotation, date: dateVal, details }),
        });
        if (res.status === 401) return handleAuthError();
        const data = await jsonOrError(res);

        if (res.ok) { alert("Sortie faite ajoutée !"); await displaySorties(); formFait.reset(); }
        else { alert("Erreur lors de l'ajout de la sortie : " + (data.error || `Statut ${res.status}`)); }
      } catch (err) { console.error(err); alert("Erreur lors de la connexion au serveur"); }
    });
  }

  /* =================== ÉDITION (inputs compacts + textarea détails) =================== */
  const methods = ["Alpinisme", "Randonnée", "Escalade"];
  const cotationsByMethod = {
    Alpinisme: ["F", "PD", "AD", "D", "TD", "ED", "ABO"],
    Randonnée: ["Facile", "Moyen", "Difficile", "Expert"],
    Escalade: ["3", "4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c", "7a", "7b", "7c"],
  };

  function autoResizeTextarea(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  window.editRow = function (row, mode) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 8) {
      console.error("La ligne n'a pas le nombre de cellules attendu.", row);
      return;
    }
    const sommetVal = cells[1].textContent;
    const altitudeVal = cells[2].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const deniveleVal = cells[3].textContent.replace(/^~/, "").replace(/m$/, "").trim();
    const methodeVal = cells[4].textContent;
    const cotationVal = cells[5].textContent;
    const dateOrYearVal = cells[6].textContent;
    const detailsVal = cells[7].textContent;

    cells[1].innerHTML = `<input type="text" value="${sommetVal}" class="tbl-input tbl-input--text">`;
    cells[2].innerHTML = `<input type="number" value="${altitudeVal}" class="tbl-input tbl-input--num">`;
    cells[3].innerHTML = `<input type="number" value="${deniveleVal}" class="tbl-input tbl-input--num">`;

    const methodeSelect = document.createElement("select");
    methodeSelect.className = "tbl-input tbl-input--select tbl-input--method";
    methods.forEach((m) => {
      const option = document.createElement("option");
      option.value = m; option.textContent = m;
      if (m === methodeVal) option.selected = true;
      methodeSelect.appendChild(option);
    });
    cells[4].innerHTML = ""; cells[4].appendChild(methodeSelect);

    const cotationSelect = document.createElement("select");
    cotationSelect.className = "tbl-input tbl-input--select tbl-input--cot";
    function updateCotationOptions(selectedMethod, selectedCotation) {
      cotationSelect.innerHTML = "";
      (cotationsByMethod[selectedMethod] || []).forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt; o.textContent = opt;
        if (opt === selectedCotation) o.selected = true;
        cotationSelect.appendChild(o);
      });
    }
    updateCotationOptions(methodeVal, cotationVal);
    cells[5].innerHTML = ""; cells[5].appendChild(cotationSelect);
    methodeSelect.addEventListener("change", () => updateCotationOptions(methodeSelect.value, cotationSelect.value));

    if (mode === "fait") {
      cells[6].innerHTML = `<input type="date" value="${dateOrYearVal}" class="tbl-input tbl-input--date">`;
    } else {
      cells[6].innerHTML = `<input type="number" value="${dateOrYearVal}" class="tbl-input tbl-input--year">`;
    }

    const ta = document.createElement("textarea");
    ta.className = "tbl-input tbl-input--details";
    ta.rows = 2;
    ta.value = detailsVal;
    cells[7].innerHTML = ""; cells[7].appendChild(ta);
    autoResizeTextarea(ta);
    ta.addEventListener("input", () => autoResizeTextarea(ta));

    cells[0].innerHTML = `
      <button class="edit-btn save-btn" type="button">💾</button>
      <button class="delete-btn cancel-btn" type="button">❌</button>
    `;
    const saveBtn = cells[0].querySelector(".save-btn");
    const cancelBtn = cells[0].querySelector(".cancel-btn");

    cancelBtn.addEventListener("click", () => displaySorties());

    saveBtn.addEventListener("click", async () => {
      const token = getToken();
      if (!token) return handleAuthError();

      const newSommet = cells[1].querySelector("input").value.trim();
      const newAltitude = cells[2].querySelector("input").value.trim();
      const newDenivele = cells[3].querySelector("input").value.trim();
      const newMethode = methodeSelect.value;
      const newCotation = cotationSelect.value;
      const newDateOrYearInput = cells[6].querySelector("input").value;
      const newDetails = cells[7].querySelector("textarea").value.trim();

      if (!newSommet || !newAltitude || !newDenivele || !newMethode || !newCotation || !newDateOrYearInput) {
        alert("Veuillez remplir tous les champs obligatoires.");
        return;
      }

      const sortieUpdate = {
        sommet: newSommet,
        altitude: newAltitude,
        denivele: newDenivele,
        methode: newMethode,
        cotation: newCotation,
        details: newDetails,
      };
      if (mode === "fait") sortieUpdate.date = newDateOrYearInput;
      else sortieUpdate.annee = newDateOrYearInput;

      const sortieId = row.getAttribute("data-id");
      try {
        const res = await fetch("/api/sorties/" + sortieId, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify(sortieUpdate),
        });
        if (res.status === 401) return handleAuthError();

        if (res.ok) {
          alert("Sortie mise à jour !");
          await displaySorties();
        } else {
          const errData = await jsonOrError(res);
          alert("Erreur lors de la mise à jour : " + (errData.error || `Statut ${res.status}`));
        }
      } catch (err) {
        console.error("Erreur mise à jour :", err);
        alert("Erreur lors de la connexion au serveur");
      }
    });
  };

  /* =================== SUPPRESSION =================== */
  window.deleteRow = async function (row) {
    if (!confirm("Confirmez-vous la suppression de cette sortie ?")) return;
    const token = getToken();
    if (!token) return handleAuthError();

    const sortieId = row.getAttribute("data-id");
    try {
      const res = await fetch("/api/sorties/" + sortieId, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (res.status === 401) return handleAuthError();

      if (res.ok) {
        alert("Sortie supprimée !");
        await displaySorties();
      } else {
        const errData = await jsonOrError(res);
        alert("Erreur lors de la suppression : " + (errData.error || `Statut ${res.status}`));
      }
    } catch (err) {
      console.error("Erreur suppression :", err);
      alert("Erreur lors de la connexion au serveur");
    }
  };

  /* =================== AUTOCOMPLÉTION SOMMETS + ALTITUDE =================== */
  let debounceTimer = null;
  async function updateSummitsDatalist() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const inputSommet = document.getElementById("sommet");
      if (!inputSommet) return;
      const query = inputSommet.value.trim();
      const datalist = document.getElementById("summits-list");
      if (!datalist) return;
      if (!query || query.length < 2) { datalist.innerHTML = ""; return; }
      try {
        const res = await fetch("/api/sommets?q=" + encodeURIComponent(query));
        if (!res.ok) return;
        const sommets = await res.json();
        datalist.innerHTML = "";
        sommets.forEach((s) => {
          const option = document.createElement("option"); option.value = s.nom; datalist.appendChild(option);
        });
      } catch (err) { console.error("Erreur auto-complétion sommets :", err); }
    }, 300);
  }

  const inputSommet = document.getElementById("sommet");
  if (inputSommet) {
    inputSommet.addEventListener("input", updateSummitsDatalist);
    inputSommet.addEventListener("change", async () => {
      const val = inputSommet.value.trim();
      if (!val) return;
      try {
        const res = await fetch("/api/sommets?q=" + encodeURIComponent(val));
        if (!res.ok) return;
        const sommets = await res.json();
        const found = sommets.find((s) => (s.nom || "").toLowerCase() === val.toLowerCase());
        if (found) {
          const altInput = document.getElementById("altitude");
          if (altInput) altInput.value = found.altitude || "";
        }
      } catch (err) { console.error("Erreur récupération altitude :", err); }
    });
  }
});
