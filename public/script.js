// Gestion du DOM au chargement
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Connexion ----------
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      if (!username || !password) {
        alert('Veuillez remplir tous les champs');
        return;
      }

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.message || 'Erreur connexion');
          return;
        }

        const data = await res.json();
        alert(data.message);
        localStorage.setItem('aiguilog_user', JSON.stringify({ username: data.username }));
        window.location.href = 'mon-compte.html';
      } catch (err) {
        alert('Erreur réseau, veuillez réessayer plus tard.');
      }
    });

    // Bouton créer un compte
    const btnCreate = document.getElementById('btn-creer-compte');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => {
        window.location.href = 'creer-compte.html';
      });
    }
  }

  // ---------- Création compte ----------
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value.trim();
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-password-confirm').value;

      if (!username || !password || !confirmPassword) {
        alert('Veuillez remplir tous les champs');
        return;
      }
      if (password !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        return;
      }

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.message || 'Erreur inscription');
          return;
        }

        const data = await res.json();
        alert(data.message);
        window.location.href = 'connexion.html'; // ou 'index.html' selon nom fichier
      } catch (err) {
        alert('Erreur réseau, veuillez réessayer plus tard.');
      }
    });
  }

  // ---------- Gestion de la session ----------
  const userData = localStorage.getItem('aiguilog_user');
  if (userData) {
    const user = JSON.parse(userData);
    // Par exemple afficher le nom sur la page mon-compte, accueil connecté, etc.
    const elUserName = document.getElementById('user-name-display');
    if (elUserName) elUserName.textContent = user.username;
  } else {
    // Si page mon-compte, rediriger vers connexion
    if (window.location.pathname.endsWith('mon-compte.html')) {
      alert('Veuillez vous connecter');
      window.location.href = 'connexion.html'; // ou index.html avec login
    }
  }

  // ---------- Gestion sorties faites (exemple) ----------
  const formFait = document.getElementById('form-fait');
  const tableBodyFait = document.getElementById('table-body-fait');

  if (formFait && tableBodyFait) {
    formFait.addEventListener('submit', (e) => {
      e.preventDefault();

      // Récupérer valeurs
      const sommet = document.getElementById('sommet-fait').value.trim();
      const altitude = document.getElementById('altitude-fait').value;
      const denivele = document.getElementById('denivele-fait').value;
      const methode = document.getElementById('methode-fait').value;
      const cotation = document.getElementById('cotation-fait').value;
      const date = document.getElementById('date').value;
      const details = document.getElementById('details-fait').value.trim();

      if (!sommet || !altitude || !denivele || !methode || !cotation || !date) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Exemple simple stockage local (à adapter si tu as backend)
      const sortiesFaites = JSON.parse(localStorage.getItem('sortiesFaites') || '[]');
      sortiesFaites.push({ sommet, altitude, denivele, methode, cotation, date, details });
      localStorage.setItem('sortiesFaites', JSON.stringify(sortiesFaites));

      // Ajouter ligne tableau
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><button class="btn-supprimer">Supprimer</button></td>
        <td>${sommet}</td>
        <td>${altitude} m</td>
        <td>${denivele} m</td>
        <td>${methode}</td>
        <td>${cotation}</td>
        <td>${date}</td>
        <td>${details}</td>
      `;
      tableBodyFait.appendChild(tr);

      // Reset form
      formFait.reset();

      // Gestion suppression
      tr.querySelector('.btn-supprimer').addEventListener('click', () => {
        const index = Array.from(tableBodyFait.children).indexOf(tr);
        sortiesFaites.splice(index, 1);
        localStorage.setItem('sortiesFaites', JSON.stringify(sortiesFaites));
        tr.remove();
      });
    });

    // Chargement des sorties déjà stockées
    const sortiesFaites = JSON.parse(localStorage.getItem('sortiesFaites') || '[]');
    sortiesFaites.forEach(({ sommet, altitude, denivele, methode, cotation, date, details }) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><button class="btn-supprimer">Supprimer</button></td>
        <td>${sommet}</td>
        <td>${altitude} m</td>
        <td>${denivele} m</td>
        <td>${methode}</td>
        <td>${cotation}</td>
        <td>${date}</td>
        <td>${details}</td>
      `;
      tableBodyFait.appendChild(tr);
      tr.querySelector('.btn-supprimer').addEventListener('click', () => {
        const index = Array.from(tableBodyFait.children).indexOf(tr);
        sortiesFaites.splice(index, 1);
        localStorage.setItem('sortiesFaites', JSON.stringify(sortiesFaites));
        tr.remove();
      });
    });
  }

  // ... similaires pour sorties à faire, rechercher, etc.

});
