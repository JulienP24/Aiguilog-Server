document.addEventListener("DOMContentLoaded", () => {
  // ===== Contrôle de la connexion sur les pages protégées =====
  const protectedPages = ["/mon-compte.html", "/sorties-a-faire.html", "/sorties-faites.html"];
  // Utiliser window.location.pathname pour obtenir le chemin de la page
  const currentPath = window.location.pathname;
  console.log("Chemin actuel :", currentPath);
  if (protectedPages.some(page => currentPath.endsWith(page))) {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    console.log("Token trouvé :", token);
    console.log("User trouvé :", user);
    if (!token || !user) {
      // Rediriger l'utilisateur non connecté vers la page de connexion
      window.location.href = "utilisateur.html";
    }
  }

  // ===== Pour index.html =====
  const btnGoLogin = document.getElementById("btn-go-login");
  if (btnGoLogin) {
    btnGoLogin.addEventListener("click", () => {
      window.location.href = "utilisateur.html";
    });
  }

  // ===== Pour utilisateur.html (Connexion) =====
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value.trim();
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          // Stockage persistant : on utilise localStorage pour garder la connexion
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "mon-compte.html";
        } else {
          alert("Erreur de connexion : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de la connexion:", err);
        alert("Erreur lors de la connexion");
      }
    });
    const btnCreerCompte = document.getElementById("btn-creer-compte");
    if (btnCreerCompte) {
      btnCreerCompte.addEventListener("click", () => {
        window.location.href = "creer-compte.html";
      });
    }
  }

  // ===== Pour creer-compte.html (Inscription) =====
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Récupération des champs
      const firstName = document.getElementById("register-firstname").value.trim();
      const lastName = document.getElementById("register-lastname").value.trim();
      const username = document.getElementById("register-username").value.trim();
      const password = document.getElementById("register-password").value.trim();
      const birthdate = document.getElementById("register-birthdate").value;
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, username, password, birthdate })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          // Stocker dans localStorage pour persister la connexion
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location.href = "mon-compte.html";
        } else {
          alert("Erreur d'inscription : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de l'inscription:", err);
        alert("Erreur lors de l'inscription");
      }
    });
  }

  // ===== Pour mon-compte.html (Profil utilisateur) =====
  if (document.getElementById("titre-bienvenue")) {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      window.location.href = "utilisateur.html";
    } else {
      const userData = JSON.parse(storedUser);
      const titreBienvenue = document.getElementById("titre-bienvenue");
      const infoMembre = document.getElementById("info-membre");
      titreBienvenue.textContent = `Bienvenue, ${userData.firstName} ${userData.lastName} (${userData.username})`;
      if (userData.birthdate) {
        const date = new Date(userData.birthdate);
        infoMembre.textContent = `Né(e) le ${date.toLocaleDateString("fr-FR")}`;
      }
    }
  }
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "index.html";
    });
  }

  // ===== Pour sorties-a-faire.html (Sorties à faire) =====
  const formAFaire = document.getElementById("form-a-faire");
  if (formAFaire) {
    const methodeSelect = document.getElementById("methode");
    const cotationSelect = document.getElementById("cotation");
    const yearSelect = document.getElementById("year");
    const tableBodyAFaire = document.getElementById("table-body-afaire");
    const cotationsParMéthode = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c"]
    };

    if (methodeSelect && cotationSelect) {
      methodeSelect.addEventListener("change", () => {
        const methode = methodeSelect.value;
        cotationSelect.innerHTML = '<option value="" disabled selected>Cotation</option>';
        if (cotationsParMéthode[methode]) {
          cotationsParMéthode[methode].forEach(cot => {
            const opt = document.createElement("option");
            opt.value = cot;
            opt.textContent = cot;
            cotationSelect.appendChild(opt);
          });
        }
      });
    }

    // Génération de la liste des années pour "sorties à faire"
    if (yearSelect) {
      const currentYear = new Date().getFullYear();
      const range = 10;
      for (let i = 0; i < range; i++) {
        const option = document.createElement("option");
        option.value = currentYear + i;
        option.textContent = currentYear + i;
        yearSelect.appendChild(option);
      }
    }

    formAFaire.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sommet = document.getElementById("sommet").value.trim();
      const altitudeVal = document.getElementById("altitude").value.trim();
      const deniveleVal = document.getElementById("denivele").value.trim();
      const details = document.getElementById("details").value.trim();
      const methode = methodeSelect.value;
      const cotation = cotationSelect.value;
      const year = yearSelect.value;
      const sortieData = {
        type: "a-faire",
        sommet,
        altitude: altitudeVal,
        denivele: deniveleVal,
        details,
        methode,
        cotation,
        annee: year
      };

      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/sorties", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(sortieData)
        });
        const data = await res.json();
        if (res.ok) {
          const newRow = document.createElement("tr");
          newRow.innerHTML = `
            <td><button class="edit-btn" onclick="toggleEdit(this)">✏️</button></td>
            <td>${sommet}</td>
            <td>${formatValue(altitudeVal)}</td>
            <td>${formatValue(deniveleVal)}</td>
            <td>${details}</td>
            <td>${methode}</td>
            <td>${cotation}</td>
            <td>${year}</td>
          `;
          tableBodyAFaire.appendChild(newRow);
          formAFaire.reset();
          cotationSelect.innerHTML = '<option value="" disabled selected>Cotation</option>';
          alert("Sortie ajoutée avec succès !");
        } else {
          alert("Erreur lors de l'ajout de la sortie : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de la requête :", err);
        alert("Erreur lors de la connexion au serveur");
      }
    });
  }

  // ===== Pour sorties-faites.html (Sorties déjà réalisées) =====
  const formFait = document.getElementById("form-fait");
  if (formFait) {
    const methodeFait = document.getElementById("methode-fait");
    const cotationFait = document.getElementById("cotation-fait");
    const dateInput = document.getElementById("date"); // champ type date
    const tableBodyFait = document.getElementById("table-body-fait");
    const cotationsParMéthode = {
      "Alpinisme": ["F", "PD", "AD", "D", "TD", "ED"],
      "Randonnée": ["Facile", "Moyen", "Difficile", "Expert"],
      "Escalade": ["4a", "4b", "4c", "5a", "5b", "5c", "6a", "6b", "6c"]
    };

    if (methodeFait && cotationFait) {
      methodeFait.addEventListener("change", () => {
        const methode = methodeFait.value;
        cotationFait.innerHTML = '<option value="" disabled selected>Cotation</option>';
        if (cotationsParMéthode[methode]) {
          cotationsParMéthode[methode].forEach(cot => {
            const opt = document.createElement("option");
            opt.value = cot;
            opt.textContent = cot;
            cotationFait.appendChild(opt);
          });
        }
      });
    }

    formFait.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sommet = document.getElementById("sommet-fait").value.trim();
      const altitudeVal = document.getElementById("altitude-fait").value.trim();
      const deniveleVal = document.getElementById("denivele-fait").value.trim();
      const details = document.getElementById("details-fait").value.trim();
      const methode = methodeFait.value;
      const cotation = cotationFait.value;
      const date = dateInput.value;  // Champ type date
      const sortieData = {
        type: "fait",
        sommet,
        altitude: altitudeVal,
        denivele: deniveleVal,
        details,
        methode,
        cotation,
        date
      };

      const token = localStorage.getItem("token");
      try {
        const res = await fetch("/api/sorties", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify(sortieData)
        });
        const data = await res.json();
        if (res.ok) {
          const newRow = document.createElement("tr");
          newRow.innerHTML = `
            <td><button class="edit-btn" onclick="toggleEdit(this)">✏️</button></td>
            <td>${sommet}</td>
            <td>${formatValue(altitudeVal)}</td>
            <td>${formatValue(deniveleVal)}</td>
            <td>${details}</td>
            <td>${methode}</td>
            <td>${cotation}</td>
            <td>${date}</td>
          `;
          tableBodyFait.appendChild(newRow);
          formFait.reset();
          cotationFait.innerHTML = '<option value="" disabled selected>Cotation</option>';
          alert("Sortie ajoutée avec succès !");
        } else {
          alert("Erreur lors de l'ajout de la sortie : " + (data.error || "Inconnue"));
        }
      } catch (err) {
        console.error("Erreur lors de la requête :", err);
        alert("Erreur lors de la connexion au serveur");
      }
    });
  }

  // ===== Fonction de basculement du mode édition =====
  window.toggleEdit = function(btn) {
    const row = btn.parentElement.parentElement;
    const isEditing = row.getAttribute("data-editing") === "true";
    const cells = row.querySelectorAll("td:not(:first-child)");
    if (!isEditing) {
      cells.forEach(cell => {
        cell.contentEditable = "true";
        cell.classList.add("editable");
      });
      row.setAttribute("data-editing", "true");
      btn.textContent = "✔️";
    } else {
      cells.forEach(cell => {
        cell.contentEditable = "false";
        cell.classList.remove("editable");
      });
      row.setAttribute("data-editing", "false");
      btn.textContent = "✏️";
    }
  };

  // Utilitaire pour formater des valeurs numériques
  function formatValue(val) {
    return val ? `~${val}m` : "";
  }
});
