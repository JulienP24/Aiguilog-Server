// script.js

document.addEventListener('DOMContentLoaded', () => {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

  // --- Fonction pour rediriger le clic sur le logo selon état connexion ---
  const logoLinks = document.querySelectorAll('.logo-link, .logo-link-mobile');
  logoLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      if (loggedInUser) {
        window.location.href = 'accueil-connecte.html';
      } else {
        window.location.href = 'index.html';
      }
    });
  });

  // --- Protection des pages à accès restreint ---
  const protectedPages = ['sorties-faites.html', 'sorties-a-faire.html', 'mon-compte.html', 'accueil-connecte.html'];
  const currentPage = window.location.pathname.split('/').pop();

  if (protectedPages.includes(currentPage) && !loggedInUser) {
    // Si utilisateur pas connecté et essaie d’accéder à une page protégée
    alert("Vous devez être connecté pour accéder à cette page.");
    window.location.href = 'connexion.html';
  }

  // --- Sur page accueil-connecte.html : afficher infos utilisateur ---
  if (currentPage === 'accueil-connecte.html' && loggedInUser) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
      userInfo.textContent = `Bonjour, ${loggedInUser.firstname} ${loggedInUser.lastname} !`;
    }
  }

  // --- Sur page connexion.html : gestion formulaire connexion ---
  if (currentPage === 'connexion.html') {
    const formLogin = document.getElementById('login-form');
    if (formLogin) {
      formLogin.addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        // On récupère la liste des utilisateurs en localStorage
        const usersJSON = localStorage.getItem('users');
        if (!usersJSON) {
          alert("Aucun utilisateur enregistré. Veuillez créer un compte.");
          return;
        }
        const users = JSON.parse(usersJSON);
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
          // Connexion réussie : on stocke user connecté
          localStorage.setItem('loggedInUser', JSON.stringify(user));
          alert(`Bienvenue ${user.firstname} !`);
          window.location.href = 'accueil-connecte.html';
        } else {
          alert("Identifiant ou mot de passe incorrect.");
        }
      });
    }
  }

  // --- Sur page creer-compte.html : gestion formulaire inscription ---
  if (currentPage === 'creer-compte.html') {
    const formRegister = document.getElementById('register-form');
    if (formRegister) {
      formRegister.addEventListener('submit', e => {
        e.preventDefault();

        const firstname = document.getElementById('register-firstname').value.trim();
        const lastname = document.getElementById('register-lastname').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const birthdate = document.getElementById('register-birthdate').value;

        if (!firstname || !lastname || !username || !password || !birthdate) {
          alert("Veuillez remplir tous les champs.");
          return;
        }

        // Récupérer la liste des utilisateurs
        let users = [];
        const usersJSON = localStorage.getItem('users');
        if (usersJSON) {
          users = JSON.parse(usersJSON);
          if (users.some(u => u.username === username)) {
            alert("Cet identifiant est déjà utilisé.");
            return;
          }
        }

        const newUser = { firstname, lastname, username, password, birthdate };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
        window.location.href = 'connexion.html';
      });
    }
  }

  // --- Sur pages sorties-faites.html et sorties-a-faire.html ---
  if (currentPage === 'sorties-faites.html' || currentPage === 'sorties-a-faire.html') {
    // Chargement des sorties de l'utilisateur connecté
    const user = loggedInUser;
    if (!user) return;

    // Sélection du tbody et formulaire selon page
    const tbodyId = currentPage === 'sorties-faites.html' ? 'table-body-fait' : 'table-body-afaire';
    const formId = currentPage === 'sorties-faites.html' ? 'form-fait' : 'form-a-faire';

    const tbody = document.getElementById(tbodyId);
    const form = document.getElementById(formId);

    // Charge les sorties depuis localStorage sous clé avec username pour isoler par utilisateur
    const sortiesKey = currentPage === 'sorties-faites.html' ? `sortiesFaites_${user.username}` : `sortiesAFaire_${user.username}`;
    let sorties = JSON.parse(localStorage.getItem(sortiesKey)) || [];

    // Fonction pour afficher la table
    function renderTable() {
      tbody.innerHTML = '';
      sorties.forEach((s, i) => {
        const tr = document.createElement('tr');

        // Actions : bouton supprimer + bouton déplacer (si a faire -> fait)
        const actionsTd = document.createElement('td');
        // bouton supprimer
        const btnDel = document.createElement('button');
        btnDel.textContent = 'Supprimer';
        btnDel.addEventListener('click', () => {
          sorties.splice(i, 1);
          localStorage.setItem(sortiesKey, JSON.stringify(sorties));
          renderTable();
        });
        actionsTd.appendChild(btnDel);

        // Si sur "À faire", bouton "Marquer fait"
        if (currentPage === 'sorties-a-faire.html') {
          const btnDone = document.createElement('button');
          btnDone.textContent = 'Marquer fait';
          btnDone.style.marginLeft = '0.5rem';
          btnDone.addEventListener('click', () => {
            // On enlève de a faire
            sorties.splice(i, 1);
            localStorage.setItem(sortiesKey, JSON.stringify(sorties));
            // On ajoute dans sorties faites
            const sortiesFaitesKey = `sortiesFaites_${user.username}`;
            let faites = JSON.parse(localStorage.getItem(sortiesFaitesKey)) || [];
            faites.push(s);
            localStorage.setItem(sortiesFaitesKey, JSON.stringify(faites));
            renderTable();
          });
          actionsTd.appendChild(btnDone);
        }

        tr.appendChild(actionsTd);

        // Ajouter toutes les autres colonnes selon l'objet s
        // Colonnes : Sommet, Altitude, Dénivelé, Méthode, Cotation, Année ou Date, Détails
        function createTd(text) {
          const td = document.createElement('td');
          td.textContent = text;
          return td;
        }

        tr.appendChild(createTd(s.sommet));
        tr.appendChild(createTd(s.altitude));
        tr.appendChild(createTd(s.denivele));
        tr.appendChild(createTd(s.methode));
        tr.appendChild(createTd(s.cotation));

        if (currentPage === 'sorties-a-faire.html') {
          tr.appendChild(createTd(s.year));
        } else {
          tr.appendChild(createTd(s.date));
        }

        tr.appendChild(createTd(s.details || ''));

        tbody.appendChild(tr);
      });
    }

    renderTable();

    // Gestion ajout sortie
    form.addEventListener('submit', e => {
      e.preventDefault();

      // Récupération des champs selon page
      let sortie = {};
      if (currentPage === 'sorties-a-faire.html') {
        sortie = {
          sommet: document.getElementById('sommet').value.trim(),
          altitude: document.getElementById('altitude').value.trim(),
          denivele: document.getElementById('denivele').value.trim(),
          methode: document.getElementById('methode').value,
          cotation: document.getElementById('cotation').value,
          year: document.getElementById('year').value,
          details: document.getElementById('details').value.trim(),
        };
      } else {
        sortie = {
          sommet: document.getElementById('sommet-fait').value.trim(),
          altitude: document.getElementById('altitude-fait').value.trim(),
          denivele: document.getElementById('denivele-fait').value.trim(),
          methode: document.getElementById('methode-fait').value,
          cotation: document.getElementById('cotation-fait').value,
          date: document.getElementById('date').value,
          details: document.getElementById('details-fait').value.trim(),
        };
      }

      // Validation simple
      if (!sortie.sommet || !sortie.altitude || !sortie.denivele || !sortie.methode || !sortie.cotation || (!sortie.year && !sortie.date)) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
      }

      sorties.push(sortie);
      localStorage.setItem(sortiesKey, JSON.stringify(sorties));
      renderTable();

      form.reset();
    });
  }

  // --- Ajout bouton déconnexion dans menu si connecté ---
  if (loggedInUser) {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && !document.getElementById('btn-deconnexion')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'btn-deconnexion';
      logoutBtn.textContent = 'Déconnexion';
      logoutBtn.style.marginLeft = '1rem';
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('loggedInUser');
        alert("Vous êtes déconnecté.");
        window.location.href = 'index.html';
      });
      navLinks.appendChild(logoutBtn);
    }
  }
});
