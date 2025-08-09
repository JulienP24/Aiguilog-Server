// header.js

document.addEventListener('DOMContentLoaded', () => {
  const logo = document.getElementById('logo');
  const nav = document.getElementById('nav-links');
  const userIcon = document.getElementById('user-icon');

  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  function redirectToLogin() {
    window.location.href = '/index.html';
  }

  function redirectToHome() {
    window.location.href = '/home.html';
  }

  logo.addEventListener('click', () => {
    if (token) {
      redirectToHome();
    } else {
      redirectToLogin();
    }
  });

  userIcon.addEventListener('click', () => {
    if (token) {
      window.location.href = '/mon-compte.html';
    } else {
      redirectToLogin();
    }
  });

  nav.innerHTML = '';

  if (token) {
    // connecté : message + liens Fait/À faire + user icon
    const greeting = document.createElement('span');
    greeting.textContent = `Bonjour ${username} !`;
    greeting.style.alignSelf = 'center';

    const faitLink = document.createElement('a');
    faitLink.href = '/sorties-faites.html';
    faitLink.textContent = 'Fait';
    faitLink.style.cursor = 'pointer';
    faitLink.style.color = '#007AFF';
    faitLink.style.textDecoration = 'none';

    const aFaireLink = document.createElement('a');
    aFaireLink.href = '/sorties-a-faire.html';
    aFaireLink.textContent = 'À faire';
    aFaireLink.style.cursor = 'pointer';
    aFaireLink.style.color = '#007AFF';
    aFaireLink.style.textDecoration = 'none';

    nav.appendChild(greeting);
    nav.appendChild(faitLink);
    nav.appendChild(aFaireLink);

    userIcon.style.display = 'block';
  } else {
    // pas connecté : liens connexion + créer compte
    const loginLink = document.createElement('a');
    loginLink.href = '/index.html';
    loginLink.textContent = 'Connexion';
    loginLink.style.cursor = 'pointer';
    loginLink.style.color = '#007AFF';
    loginLink.style.textDecoration = 'none';

    const registerLink = document.createElement('a');
    registerLink.href = '/register.html';
    registerLink.textContent = 'Créer un compte';
    registerLink.style.cursor = 'pointer';
    registerLink.style.color = '#007AFF';
    registerLink.style.textDecoration = 'none';

    nav.appendChild(loginLink);
    nav.appendChild(registerLink);

    userIcon.style.display = 'none';
  }
});
