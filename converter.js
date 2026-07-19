(() => {
  const THZ_PER_CM1 = 0.0299792458;
  const EV_PER_CM1 = 0.0001239841984;
  const units = ["cm1", "um", "nm", "thz", "ev", "mev"];
  const toCm1 = (value, unit) => unit === "cm1" ? value : unit === "thz" ? value / THZ_PER_CM1 : unit === "nm" ? 1e7 / value : unit === "um" ? 1e4 / value : unit === "mev" ? value / (EV_PER_CM1 * 1e3) : value / EV_PER_CM1;
  const fromCm1 = (value, unit) => unit === "cm1" ? value : unit === "thz" ? value * THZ_PER_CM1 : unit === "nm" ? 1e7 / value : unit === "um" ? 1e4 / value : unit === "mev" ? value * EV_PER_CM1 * 1e3 : value * EV_PER_CM1;
  const format = (value) => {
    if (!Number.isFinite(value)) return "";
    return value.toFixed(4);
  };
  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    const toggle = document.querySelector(".theme-toggle");
    toggle.dataset.current = theme;
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  };
  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector(".theme-toggle");
    const currentTheme = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    toggle.dataset.current = currentTheme;
    toggle.setAttribute("aria-pressed", String(currentTheme === "dark"));
    toggle.addEventListener("click", () => setTheme(toggle.dataset.current === "dark" ? "light" : "dark"));
    document.querySelectorAll("a[href]").forEach((link) => {
      const destination = new URL(link.href, window.location.href);
      if (/^https?:$/.test(destination.protocol) && destination.origin !== window.location.origin) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    });

    const spectrumSlider = document.querySelector("#spectrum-slider");
    const spectrumMarker = document.querySelector("#spectrum-marker");
    const spectrumOutputs = {
      cm1: document.querySelector("#spectrum-cm1"),
      um: document.querySelector("#spectrum-um"),
      ev: document.querySelector("#spectrum-ev"),
      thz: document.querySelector("#spectrum-thz"),
      slider: document.querySelector("#spectrum-slider-value")
    };
    const spectrumFormat = (value) => Number(value.toPrecision(6)).toLocaleString("en-US", {maximumFractionDigits: 6});
    const spectrumScaleValue = (cm1, unit) => unit === "cm1" ? cm1 : unit === "um" ? 1e4 / cm1 : unit === "ev" ? cm1 * EV_PER_CM1 : cm1 * THZ_PER_CM1;
    document.querySelectorAll("[data-spectrum-scale]").forEach((row) => {
      const ticks = row.querySelector(".spectrum-scale-ticks");
      [0, 0.25, 0.5, 0.75, 1].forEach((position) => {
        const tick = document.createElement("span");
        const logCm1 = Number(spectrumSlider.min) + (Number(spectrumSlider.max) - Number(spectrumSlider.min)) * position;
        tick.style.left = `${position * 100}%`;
        tick.textContent = spectrumFormat(spectrumScaleValue(10 ** logCm1, row.dataset.spectrumScale));
        ticks.appendChild(tick);
      });
    });
    const updateSpectrum = () => {
      const logCm1 = Number(spectrumSlider.value);
      const cm1 = 10 ** logCm1;
      const thz = cm1 * THZ_PER_CM1;
      spectrumOutputs.cm1.textContent = spectrumFormat(cm1);
      spectrumOutputs.um.textContent = spectrumFormat(1e4 / cm1);
      spectrumOutputs.ev.textContent = spectrumFormat(cm1 * EV_PER_CM1);
      spectrumOutputs.thz.textContent = spectrumFormat(thz);
      spectrumOutputs.slider.textContent = `${spectrumFormat(cm1)} cm⁻¹`;
      spectrumMarker.style.left = `${((logCm1 - Number(spectrumSlider.min)) / (Number(spectrumSlider.max) - Number(spectrumSlider.min))) * 100}%`;
    };
    spectrumSlider.addEventListener("input", updateSpectrum);
    updateSpectrum();

    const inputs = Object.fromEntries(units.map((unit) => [unit, document.querySelector(`[data-unit="${unit}"]`)]));
    const error = document.querySelector("#converter-error");
    const setActive = (unit) => document.querySelectorAll(".unit-field").forEach((field) => field.classList.toggle("active", field.dataset.field === unit));
    const updateUnits = (unit, rawValue) => {
      setActive(unit);
      const value = Number(rawValue);
      const valid = rawValue.trim() !== "" && Number.isFinite(value) && value > 0;
      error.hidden = valid || rawValue.trim() === "";
      if (!valid) {units.forEach((target) => {if (target !== unit) inputs[target].value = "";}); return;}
      const cm1 = toCm1(value, unit);
      units.forEach((target) => {if (target !== unit) inputs[target].value = format(fromCm1(cm1, target));});
    };
    units.forEach((unit) => {
      inputs[unit].addEventListener("input", (event) => updateUnits(unit, event.target.value));
      inputs[unit].addEventListener("focus", () => setActive(unit));
      inputs[unit].addEventListener("blur", (event) => {
        const value = Number(event.target.value);
        if (event.target.value !== "" && Number.isFinite(value)) event.target.value = format(value);
      });
    });
    document.querySelector("#clear-converter").addEventListener("click", () => {units.forEach((unit) => inputs[unit].value = "");error.hidden = true;});
    const copy = async (text, button) => {if (!text || text === "—") return;await navigator.clipboard.writeText(text.replaceAll(",", ""));const previous=button.textContent;button.textContent="Copied";setTimeout(()=>button.textContent=previous,1200);};
    document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", () => copy(document.getElementById(button.dataset.copy).value, button)));
    const lineA = document.querySelector("#line-a");
    const lineB = document.querySelector("#line-b");
    const resultNodes = Object.fromEntries([...document.querySelectorAll("[data-result]")].map((node) => [node.dataset.result, node]));
    const updateDifference = () => {
      const a=Number(lineA.value), b=Number(lineB.value), valid=lineA.value!==""&&lineB.value!==""&&Number.isFinite(a)&&Number.isFinite(b)&&a>0&&b>0;
      if (!valid) {Object.values(resultNodes).forEach((node) => node.textContent="—");return;}
      const difference=Math.abs(a-b);
      const values={cm1:difference,equivalentUm:difference===0?null:1e4/difference,equivalentNm:difference===0?null:1e7/difference,wavelengthDifference:Math.abs(1e7/a-1e7/b),ev:difference*EV_PER_CM1,mev:difference*EV_PER_CM1*1e3,thz:difference*THZ_PER_CM1};
      Object.entries(resultNodes).forEach(([key,node]) => node.textContent=values[key]===null?"—":format(values[key]));
    };
    lineA.addEventListener("input",updateDifference);lineB.addEventListener("input",updateDifference);
    [lineA, lineB].forEach((input) => input.addEventListener("blur", () => {
      const value = Number(input.value);
      if (input.value !== "" && Number.isFinite(value)) input.value = format(value);
    }));
    document.querySelectorAll("[data-copy-result]").forEach((button) => button.addEventListener("click", () => copy(resultNodes[button.dataset.copyResult].textContent,button)));
  });
})();
