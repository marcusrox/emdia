(function () {
  function closeDetailsOnOutsideClick(event) {
    document.querySelectorAll("details[open]").forEach(function (details) {
      if (!details.contains(event.target)) {
        details.removeAttribute("open");
      }
    });
  }

  document.addEventListener("click", closeDetailsOnOutsideClick);
})();
