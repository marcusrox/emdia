(function () {
  function closeDetailsOnOutsideClick(event) {
    document.querySelectorAll("details[open]").forEach(function (details) {
      if (!details.contains(event.target)) {
        details.removeAttribute("open");
      }
    });
  }

  function closeNotification(event) {
    var button = event.target.closest(".notification-close");

    if (!button) {
      return;
    }

    var notification = button.closest(".notification");

    if (notification) {
      notification.remove();
    }
  }

  document.addEventListener("click", closeDetailsOnOutsideClick);
  document.addEventListener("click", closeNotification);
})();
