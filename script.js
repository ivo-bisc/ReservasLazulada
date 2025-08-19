document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('btnIncrementar');
  const label = document.getElementById('contador');
  let clicks = 0;

  button.addEventListener('click', () => {
    clicks += 1;
    label.textContent = String(clicks);
  });
});

