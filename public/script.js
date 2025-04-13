document.addEventListener("DOMContentLoaded", () => {
    const btnRegister = document.getElementById("btnRegister");
    if (btnRegister) {
      btnRegister.addEventListener("click", () => {
        fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "testUser",
            password: "testPassword",
            birthdate: "1990-01-01"
          })
        })
        .then(response => response.json())
        .then(data => {
          console.log("Réponse API :", data);
          alert("Inscription réussie !");
        })
        .catch(err => console.error("Erreur :", err));
      });
    }
  });
  