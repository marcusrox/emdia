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

  function validateForms(event) {
    var form = event.target;

    if (!form.matches("[data-validate-form]")) {
      return;
    }

    clearFieldErrors(form);

    var firstInvalid = null;
    form.querySelectorAll("[data-validate-money]").forEach(function (field) {
      if (isValidMoney(field.value, field.required)) {
        return;
      }

      showFieldError(field, field.getAttribute("data-error-message") || "Informe um valor válido, como 100,00.");
      firstInvalid = firstInvalid || field;
    });

    if (firstInvalid) {
      event.preventDefault();
      firstInvalid.focus();
    }
  }

  function autoSubmitOnChange(event) {
    var field = event.target;
    var form = field.closest("form[data-auto-submit-on-change]");

    if (!form || !field.name) {
      return;
    }

    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }

    form.submit();
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".field-error").forEach(function (error) {
      error.remove();
    });

    form.querySelectorAll("[aria-invalid='true']").forEach(function (field) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    });
  }

  function showFieldError(field, message) {
    var error = document.createElement("small");
    var errorId = field.name + "-client-error";

    error.className = "field-error";
    error.id = errorId;
    error.textContent = message;
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", errorId);
    field.insertAdjacentElement("afterend", error);
  }

  function isValidMoney(value, required) {
    var raw = String(value || "").trim();

    if (!raw) {
      return !required;
    }

    var cleaned = raw.replace(/\s/g, "").replace(/^R\$/i, "");
    return /^\d+(,\d{1,2})?$/.test(cleaned) || /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned);
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

  function collapseMobileEntryFilters() {
    if (!window.matchMedia || !window.matchMedia("(max-width: 980px)").matches) {
      return;
    }

    document.querySelectorAll(".entries-filter-details").forEach(function (details) {
      var form = details.querySelector("form");

      if (!form || hasActiveEntryFilter(form)) {
        return;
      }

      details.removeAttribute("open");
    });
  }

  function hasActiveEntryFilter(form) {
    return Array.prototype.some.call(form.elements, function (field) {
      if (!field.name || field.name === "competence" || field.type === "hidden") {
        return false;
      }

      return String(field.value || "").trim() !== "";
    });
  }

  document.addEventListener("click", closeDetailsOnOutsideClick);
  document.addEventListener("click", closeNotification);
  document.addEventListener("change", autoSubmitOnChange);
  document.addEventListener("submit", validateForms);
  restoreSettingsSections();
  collapseMobileEntryFilters();
})();
