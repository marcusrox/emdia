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
    var form = field.matches("[data-auto-submit-on-change]")
      ? field.closest("form")
      : field.closest("form[data-auto-submit-on-change]");

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

  function startOperationalLogPolling() {
    var container = document.querySelector("[data-operational-logs]");

    if (!container || !window.fetch) {
      return;
    }

    var status = document.querySelector("[data-operational-log-status]");
    var intervalMs = 5000;

    function poll() {
      var apiUrl = container.getAttribute("data-api-url");
      var latestTimestamp = container.getAttribute("data-latest-timestamp") || "";
      var separator = apiUrl.indexOf("?") === -1 ? "?" : "&";
      var url = apiUrl + separator + "since=" + encodeURIComponent(latestTimestamp);

      setOperationalLogStatus(status, "Buscando novos registros...");

      fetch(url, { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Falha ao atualizar logs.");
          }

          return response.json();
        })
        .then(function (payload) {
          prependOperationalLogRows(container, payload.entries || []);
          setOperationalLogStatus(status, "Leitura automática ativa");
        })
        .catch(function () {
          setOperationalLogStatus(status, "Atualização automática pausada");
        });
    }

    window.setInterval(poll, intervalMs);
  }

  function prependOperationalLogRows(container, entries) {
    if (!entries.length) {
      return;
    }

    var empty = container.querySelector("[data-operational-log-empty]");
    var tbody = container.querySelector("[data-operational-log-rows]");

    if (empty || !tbody) {
      window.location.reload();
      return;
    }

    entries
      .slice()
      .reverse()
      .forEach(function (entry) {
        tbody.insertBefore(createOperationalLogRow(entry), tbody.firstChild);
      });

    var latest = entries.reduce(function (current, entry) {
      return entry.timestamp && entry.timestamp > current ? entry.timestamp : current;
    }, container.getAttribute("data-latest-timestamp") || "");

    container.setAttribute("data-latest-timestamp", latest);
  }

  function createOperationalLogRow(entry) {
    var row = document.createElement("tr");

    row.setAttribute("data-log-timestamp", entry.timestamp || "");
    appendCell(row, formatOperationalLogDate(entry.timestamp), "log-time", "Linha " + entry.lineNumber);
    appendLevelCell(row, entry.level);
    appendCodeCell(row, entry.event || "-");
    appendCell(row, entry.message || "-");
    appendCell(row, entry.username || entry.userId || "-");
    appendCell(row, detailsText(entry.details), "log-details");

    return row;
  }

  function appendCell(row, text, className, smallText) {
    var cell = document.createElement("td");

    if (className) {
      cell.className = className;
    }

    cell.appendChild(document.createTextNode(text));

    if (smallText) {
      var small = document.createElement("small");
      small.textContent = smallText;
      cell.appendChild(small);
    }

    row.appendChild(cell);
  }

  function appendLevelCell(row, level) {
    var cell = document.createElement("td");
    var badge = document.createElement("span");
    var normalized = ["info", "warn", "error"].indexOf(level) === -1 ? "info" : level;

    badge.className = "level-badge level-" + normalized;
    badge.textContent = levelLabel(normalized);
    cell.appendChild(badge);
    row.appendChild(cell);
  }

  function appendCodeCell(row, text) {
    var cell = document.createElement("td");
    var code = document.createElement("code");

    code.textContent = text;
    cell.appendChild(code);
    row.appendChild(cell);
  }

  function formatOperationalLogDate(value) {
    if (!value) {
      return "-";
    }

    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value));
    } catch (error) {
      return value;
    }
  }

  function detailsText(details) {
    if (!details) {
      return "-";
    }

    try {
      return JSON.stringify(details);
    } catch (error) {
      return "-";
    }
  }

  function levelLabel(level) {
    if (level === "warn") return "Alerta";
    if (level === "error") return "Erro";
    return "Informação";
  }

  function setOperationalLogStatus(status, text) {
    if (!status) {
      return;
    }

    var label = status.querySelector("strong");

    if (label) {
      label.textContent = text;
    }
  }

  document.addEventListener("click", closeDetailsOnOutsideClick);
  document.addEventListener("click", closeNotification);
  document.addEventListener("change", autoSubmitOnChange);
  document.addEventListener("submit", validateForms);
  restoreSettingsSections();
  collapseMobileEntryFilters();
  startOperationalLogPolling();
})();
