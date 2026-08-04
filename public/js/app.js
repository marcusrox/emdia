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

  function closeParentDetails(event) {
    var button = event.target.closest("[data-close-details]");

    if (!button) {
      return;
    }

    var details = button.closest("details");

    if (details) {
      details.removeAttribute("open");
      details.querySelector("summary")?.focus();
    }
  }

  function validateForms(event) {
    var form = event.target;

    if (!form.matches("[data-validate-form]")) {
      return;
    }

    updateSettlementProjection(form);
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

  function confirmFormSubmission(event) {
    var form = event.target;
    var message = form.getAttribute("data-confirm");

    if (message && !window.confirm(message)) {
      event.preventDefault();
    }
  }

  function disableRepeatedSubmission(event) {
    var form = event.target;

    if (event.defaultPrevented || !form.matches("[data-disable-on-submit]")) {
      return;
    }

    form.querySelectorAll("button[type='submit'], input[type='submit']").forEach(function (button) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    });
  }

  function fillSignupTimezone() {
    var field = document.querySelector("[data-timezone-field]");

    if (!field) {
      return;
    }

    try {
      var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        field.value = timezone;
      }
    } catch (error) {
      // O valor seguro renderizado pelo servidor permanece como fallback.
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

  function moneyToCents(value) {
    var raw = String(value || "").trim().replace(/\s/g, "").replace(/^R\$/i, "");

    if (!raw) {
      return 0;
    }

    var usesThousands = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw);
    var normalized = usesThousands || raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw;
    var amount = Number(normalized);
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  }

  function formatCents(cents) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  }

  function updateSettlementProjection(form) {
    if (!form || !form.matches("[data-settlement-form]")) {
      return;
    }

    var expectedCents = Number(form.getAttribute("data-expected-cents")) || 0;
    var realizedCents = Number(form.getAttribute("data-realized-cents")) || 0;
    var totalCents = 0;

    form.querySelectorAll("[data-settlement-value]").forEach(function (field) {
      var cents = moneyToCents(field.value);
      totalCents += field.hasAttribute("data-settlement-discount") ? -cents : cents;
    });

    var projectedRealizedCents = realizedCents + totalCents;
    var excessCents = Math.max(0, projectedRealizedCents - expectedCents);
    var shortfallCents = Math.max(0, expectedCents - projectedRealizedCents);
    var warning = form.querySelector("[data-settlement-excess-warning]");
    var confirmation = form.elements.confirm_excess;
    var shortfall = form.querySelector("[data-settlement-shortfall]");
    var completion = form.elements.settlement_completion;

    if (!warning || !confirmation || !shortfall || !completion) {
      return;
    }

    warning.hidden = excessCents <= 0;
    confirmation.required = excessCents > 0;
    shortfall.hidden = shortfallCents <= 0;

    if (excessCents > 0) {
      warning.querySelector("[data-settlement-excess-message]").textContent =
        "O valor realizado ficará " + formatCents(excessCents) + " acima do valor previsto.";
    } else {
      confirmation.checked = false;
    }

    if (shortfallCents > 0) {
      shortfall.querySelector("[data-settlement-shortfall-value]").textContent = formatCents(shortfallCents);
      shortfall.querySelector("[data-settlement-partial-label]").textContent =
        "Manter " + formatCents(shortfallCents) + " em aberto";
    } else {
      completion.value = "PARTIAL";
    }
  }

  function updateSettlementProjectionOnInput(event) {
    updateSettlementProjection(event.target.closest("[data-settlement-form]"));
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

  function loadWhatsAppStatus() {
    var card = document.querySelector("[data-whatsapp-status]");

    if (!card) {
      return;
    }

    var state = card.querySelector("[data-whatsapp-status-state]");
    var message = card.querySelector("[data-whatsapp-status-message]");
    var url = card.getAttribute("data-status-url");

    if (!window.fetch || !url) {
      finishWhatsAppStatus(card, state, message, {
        ok: false,
        state: "INDISPONÍVEL",
        message: "Não foi possível verificar a integração neste navegador.",
      });
      return;
    }

    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Falha ao consultar o status do WhatsApp.");
        }

        return response.json();
      })
      .then(function (payload) {
        if (!payload || typeof payload !== "object" || typeof payload.state !== "string") {
          throw new Error("Resposta inválida ao consultar o status do WhatsApp.");
        }

        finishWhatsAppStatus(card, state, message, payload);
      })
      .catch(function () {
        finishWhatsAppStatus(card, state, message, {
          ok: false,
          state: "ERROR",
          message: "Não foi possível consultar a integração com o WhatsApp.",
        });
      });
  }

  function finishWhatsAppStatus(card, state, message, payload) {
    var loading = card.querySelector("[data-whatsapp-status-loading]");
    var spinner = card.querySelector(".settings-status-spinner");

    card.classList.remove("is-loading", "is-success", "is-error");
    card.classList.add(payload.ok ? "is-success" : "is-error");
    card.setAttribute("aria-busy", "false");

    if (spinner) {
      spinner.remove();
    }

    if (loading) {
      loading.classList.remove("settings-status-loading");
    }

    if (state) {
      state.textContent = payload.state || "UNKNOWN";
    }

    if (message) {
      message.textContent = payload.message || (payload.ok ? "Integração disponível." : "Integração indisponível.");
    }
  }

  function initializeCategoryIconPickers() {
    document.querySelectorAll("[data-category-icon-picker]").forEach(function (picker) {
      var nativeSelect = picker.querySelector("[data-category-icon-native]");
      var enhanced = picker.querySelector("[data-category-icon-enhanced]");
      var trigger = picker.querySelector("[data-category-icon-trigger]");
      var current = picker.querySelector("[data-category-icon-current]");
      var currentLabel = document.getElementById("category-icon-current-label");
      var listbox = picker.querySelector("[data-category-icon-options]");
      var options = Array.prototype.slice.call(picker.querySelectorAll("[data-category-icon-option]"));

      if (!nativeSelect || !enhanced || !trigger || !current || !listbox || !options.length) {
        return;
      }

      nativeSelect.classList.add("category-icon-native-enhanced");
      nativeSelect.setAttribute("aria-hidden", "true");
      nativeSelect.tabIndex = -1;
      enhanced.hidden = false;

      function selectedOption() {
        return options.find(function (option) {
          return option.getAttribute("data-value") === nativeSelect.value;
        }) || options[0];
      }

      function syncSelection() {
        var selected = selectedOption();
        var selectedContent = selected.querySelectorAll(".category-icon-picker-icon, .category-icon-picker-label");
        var selectedLabel = selected.querySelector(".category-icon-picker-label");

        current.replaceChildren.apply(current, Array.prototype.map.call(selectedContent, function (node) {
          return node.cloneNode(true);
        }));

        if (currentLabel && selectedLabel) {
          currentLabel.textContent = selectedLabel.textContent;
        }

        options.forEach(function (option) {
          option.setAttribute("aria-selected", option === selected ? "true" : "false");
        });
      }

      function isOpen() {
        return trigger.getAttribute("aria-expanded") === "true";
      }

      function openPicker() {
        trigger.setAttribute("aria-expanded", "true");
        listbox.hidden = false;
        selectedOption().focus();
      }

      function closePicker(restoreFocus) {
        trigger.setAttribute("aria-expanded", "false");
        listbox.hidden = true;

        if (restoreFocus) {
          trigger.focus();
        }
      }

      function chooseOption(option) {
        nativeSelect.value = option.getAttribute("data-value") || "";
        syncSelection();
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker(true);
      }

      function focusRelativeOption(offset) {
        var currentIndex = options.indexOf(document.activeElement);
        var nextIndex = currentIndex < 0 ? 0 : (currentIndex + offset + options.length) % options.length;
        options[nextIndex].focus();
      }

      trigger.addEventListener("click", function () {
        if (isOpen()) {
          closePicker(false);
        } else {
          openPicker();
        }
      });

      trigger.addEventListener("keydown", function (event) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].indexOf(event.key) === -1) {
          if (event.key === "Escape" && isOpen()) {
            event.preventDefault();
            closePicker(false);
          }
          return;
        }

        event.preventDefault();
        openPicker();

        if (event.key === "ArrowUp") {
          focusRelativeOption(-1);
        }
      });

      listbox.addEventListener("click", function (event) {
        var option = event.target.closest("[data-category-icon-option]");

        if (option) {
          chooseOption(option);
        }
      });

      listbox.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          focusRelativeOption(event.key === "ArrowDown" ? 1 : -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          options[event.key === "Home" ? 0 : options.length - 1].focus();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          chooseOption(document.activeElement);
        } else if (event.key === "Escape") {
          event.preventDefault();
          closePicker(true);
        } else if (event.key === "Tab") {
          closePicker(false);
        }
      });

      nativeSelect.addEventListener("change", syncSelection);
      document.addEventListener("click", function (event) {
        if (isOpen() && !picker.contains(event.target)) {
          closePicker(false);
        }
      });

      syncSelection();
    });
  }

  function initializeReceiptReviewForms() {
    document.querySelectorAll("[data-receipt-review-form]").forEach(function (form) {
      var actionFields = form.querySelectorAll("input[name='approval_action']");
      var panels = form.querySelectorAll("[data-receipt-mode-panel]");
      var submitLabel = form.querySelector("[data-receipt-submit-label]");
      var search = form.querySelector("[data-receipt-entry-search]");

      function currentAction() {
        var checked = form.querySelector("input[name='approval_action']:checked");
        return checked ? checked.value : "NEW";
      }

      function updateMode() {
        var action = currentAction();
        panels.forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-receipt-mode-panel") !== action;
        });
        if (submitLabel) {
          submitLabel.textContent = action === "EXISTING"
            ? "Aprovar e registrar baixa"
            : "Aprovar e criar despesa";
        }
        updateReceiptSettlementProjection();
      }

      function updateReceiptSettlementProjection() {
        var selectedEntry = form.querySelector("input[name='financial_entry_id']:checked");
        var amountField = form.elements.amount;
        var shortfall = form.querySelector("[data-receipt-shortfall]");
        var shortfallValue = form.querySelector("[data-receipt-shortfall-value]");
        var excess = form.querySelector("[data-receipt-excess]");
        var excessMessage = form.querySelector("[data-receipt-excess-message]");
        var excessConfirmation = form.elements.confirm_excess;
        if (!selectedEntry || !amountField || !shortfall || !excess) return;

        var expectedCents = Number(selectedEntry.getAttribute("data-entry-expected-cents")) || 0;
        var realizedCents = Number(selectedEntry.getAttribute("data-entry-realized-cents")) || 0;
        var projectedCents = realizedCents + moneyToCents(amountField.value);
        var shortfallCents = Math.max(0, expectedCents - projectedCents);
        var excessCents = Math.max(0, projectedCents - expectedCents);
        shortfall.hidden = shortfallCents <= 0;
        excess.hidden = excessCents <= 0;
        if (shortfallValue) shortfallValue.textContent = formatCents(shortfallCents);
        if (excessMessage) {
          excessMessage.textContent = "Confirmo que o total realizado ficará "
            + formatCents(excessCents) + " acima do valor previsto.";
        }
        if (excessConfirmation) {
          excessConfirmation.required = excessCents > 0 && currentAction() === "EXISTING";
          if (excessCents <= 0) excessConfirmation.checked = false;
        }
      }

      function normalizeSearch(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      }

      function filterEntries() {
        if (!search) return;
        var query = normalizeSearch(search.value).trim();
        var list = form.querySelector("[data-receipt-entry-list]");
        var empty = form.querySelector("[data-receipt-entry-search-empty]");
        var visible = 0;
        if (!list) return;
        list.querySelectorAll("[data-receipt-entry-card]").forEach(function (card) {
          var matches = !query || normalizeSearch(card.getAttribute("data-search")).includes(query);
          card.hidden = !matches;
          if (matches) visible += 1;
        });
        if (empty) empty.hidden = visible > 0;
      }

      actionFields.forEach(function (field) { field.addEventListener("change", updateMode); });
      form.addEventListener("input", updateReceiptSettlementProjection);
      form.addEventListener("change", updateReceiptSettlementProjection);
      if (search) search.addEventListener("input", filterEntries);
      updateMode();
      filterEntries();
    });
  }

  document.addEventListener("click", closeDetailsOnOutsideClick);
  document.addEventListener("click", closeNotification);
  document.addEventListener("click", closeParentDetails);
  document.addEventListener("change", autoSubmitOnChange);
  document.addEventListener("input", updateSettlementProjectionOnInput);
  document.addEventListener("submit", validateForms);
  document.addEventListener("submit", confirmFormSubmission);
  document.addEventListener("submit", disableRepeatedSubmission);
  document.querySelectorAll("[data-settlement-form]").forEach(updateSettlementProjection);
  restoreSettingsSections();
  collapseMobileEntryFilters();
  startOperationalLogPolling();
  loadWhatsAppStatus();
  initializeCategoryIconPickers();
  initializeReceiptReviewForms();
  fillSignupTimezone();
})();
