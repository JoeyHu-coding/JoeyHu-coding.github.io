document.querySelectorAll("#year").forEach((node) => {
  node.textContent = new Date().getFullYear();
});
