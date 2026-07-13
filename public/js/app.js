(function () {
  function closeDetailsOnOutsideClick(event) {
    document.querySelectorAll("details[open]").forEach(function (details) {
      if (details.hasAttribute("data-persistent-details")) {
        return;
      }

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

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Prefer keeping the native details behavior over surfacing storage errors.
    }
  }

  function restoreSettingsSections() {
    document.querySelectorAll("[data-settings-section]").forEach(function (details) {
      var key = details.getAttribute("data-storage-key");

      if (!key) {
        return;
      }

      var savedState = storageGet(key);

      if (savedState === "false") {
        details.removeAttribute("open");
      } else if (savedState === "true") {
        details.setAttribute("open", "");
      }

      details.addEventListener("toggle", function () {
        storageSet(key, details.open ? "true" : "false");
      });
    });
  }

  document.addEventListener("click", closeDetailsOnOutsideClick);
  document.addEventListener("click", closeNotification);
  restoreSettingsSections();
})();
