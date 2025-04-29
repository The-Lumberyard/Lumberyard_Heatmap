document.addEventListener("DOMContentLoaded", function () {
  window.onload = function () {
    console.log("✅ DateRangeCode.js loaded");

    const controls = document.querySelector('.controls');
    let qohData = {}, dataType = "Margin", sliderValues = [], availableDates = [];
    const slider = document.getElementById("slider");
    const dataSelect = document.getElementById("dataType");
    const modeLabel = document.getElementById('rangeLabel');
    const tooltip = document.getElementById("tooltip");
    const horizontalSideShift = 3.399;
    const verticalSideShift = .69;

    // --- BIN LAYOUT CONFIG ---
    const aisleConfig = [
      { aisle: "01", top: 14, binCount: 6, left: 73.9 },
      { aisle: "02", top: 21.5, binCount: 6, left: 73.9 },
      { aisle: "03", top: 28.515, binCount: 9, left: 63.5 },
      { aisle: "04", top: 36.5, binCount: 9, left: 63.5 },
      { aisle: "05", top: 44.033, binCount: 9, left: 63.5 },
      { aisle: "06", top: 51.58, binCount: 9, left: 63.5 },
      { aisle: "07", top: 59.2, binCount: 5, left: 61.85 }
    ];
    const rotatedAisleConfig = [
      { aisle: "08", top: 37.5, binCount: 6, left: 40.9 },
      { aisle: "09", top: 41.8, binCount: 7, left: 35.05 },
      { aisle: "10", top: 41.8, binCount: 7, left: 29.2 },
      { aisle: "11", top: 41.8, binCount: 7, left: 23.41 },
      { aisle: "12", top: 41.8, binCount: 7, left: 17.53 },
      { aisle: "13", top: 41.8, binCount: 7, left: 11.7 },
      { aisle: "14", top: 41.8, binCount: 7, left: 5.8 }
    ];

    // Tooltip logic (trendline with Chart.js if multi-day)
    window.showTooltip = function (binName) {
      let mode = document.querySelector('input[name="mode"]:checked')?.value;
      let dateRange = window.currentDateRange || [];
      let trendData = [];
      let trendLabels = [];
      let modeText = (mode === "total") ? "Total" : (mode === "average" ? "Average" : "Single Day");

      if (mode !== "single" && window.allBinData && dateRange.length > 1) {
        for (let date of dateRange) {
          const val = window.allBinData[date]?.[binName]?.[dataType];
          trendData.push(isNaN(val) ? null : Number(val));
          trendLabels.push(date.slice(5)); // MM-DD
        }
      }

      let binVal = qohData[binName]?.[dataType];
      let mainText = `<strong>${binName}</strong> — ${dataType} (${modeText}): ${binVal !== undefined ? binVal : 'N/A'}`;

      tooltip.innerHTML = mainText;

      // Add trendline chart if multi-day
      if (trendData.length > 1 && typeof Chart !== "undefined") {
        tooltip.innerHTML += `<canvas id="trendChart" width="140" height="40"></canvas>`;
        setTimeout(() => {
          const ctx = document.getElementById('trendChart')?.getContext('2d');
          if (ctx) {
            new Chart(ctx, {
              type: 'line',
              data: {
                labels: trendLabels,
                datasets: [{
                  label: `${binName}`,
                  data: trendData,
                  fill: false,
                  borderColor: '#007bff',
                  pointRadius: 2,
                  tension: 0.1
                }]
              },
              options: {
                plugins: { legend: { display: false } },
                scales: {
                  x: { display: true, ticks: { font: { size: 8 } } },
                  y: { display: true, ticks: { font: { size: 8 } } }
                }
              }
            });
          }
        }, 0);
      }

      tooltip.style.opacity = 1;
    };
    window.hideTooltip = function () {
      tooltip.style.opacity = 0;
    };
    document.addEventListener("mousemove", (e) => {
      tooltip.style.left = e.pageX + 10 + "px";
      tooltip.style.top = e.pageY + 10 + "px";
    });

    // Value color mapping
    function getValueColor(val) {
      if (isNaN(val)) return '#cccccc';
      if (val <= sliderValues[0]) return '#00cc66';
      if (val <= sliderValues[1]) return '#ffff66';
      if (val <= sliderValues[2]) return '#ff4d4d';
      return '#ff00ff';
    }

    function updateSliderAndMap() {
      dataType = dataSelect.value;
      const values = Object.values(qohData).map(d => parseFloat(d?.[dataType])).filter(v => !isNaN(v));
      if (values.length === 0) return;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const third = (max - min) / 3;
      sliderValues = [min + third, min + 2 * third, max];
      slider.noUiSlider.updateOptions({ range: { min, max }, start: sliderValues });
      document.getElementById("val-low").textContent = `≤ ${sliderValues[0].toFixed(1)}`;
      document.getElementById("val-mid").textContent = `≤ ${sliderValues[1].toFixed(1)}`;
      document.getElementById("val-high").textContent = `≤ ${sliderValues[2].toFixed(1)}`;
      renderMap();
    }

    function renderMap() {
      document.getElementById("store-container").innerHTML =
        '<img src="09-114_WHITE_MOUNTAIN_BIN_LOCATIONS.jpg" alt="Store Layout" class="store-image" />';
      aisleConfig.forEach(({ aisle, top, binCount, left }) => {
        generateBins(top, left, aisle, "L", binCount, horizontalSideShift, 1.6);
        generateBins(top, left, aisle, "R", binCount, horizontalSideShift, 1.6);
      });
      // Special handling for aisle 07 extensions
      generateBins(59.2, 78.8, "07", "L", 1, horizontalSideShift, 1.6, false, false, true, 6);
      generateBins(59.2, 78.8, "07", "R", 1, horizontalSideShift, 1.6, false, false, true, 6);
      generateBins(59.2, 80.69, "07", "L", 4, horizontalSideShift, 1.6, false, false, false, 7);
      generateBins(59.2, 80.69, "07", "R", 4, horizontalSideShift, 1.6, false, false, false, 7);
      rotatedAisleConfig.forEach(({ aisle, top, binCount, left }) => {
        generateBins(top, left, aisle, "L", binCount, 0, 4.4, true, true);
        generateBins(top, left, aisle, "R", binCount, 0, 4.4, true, true);
      });
    }

    function generateBins(startTop, startLeft, aisleNum, side, binCount, offsetX, offsetY, rotated = false, vertical = false, customSize = false, startIndex = 1) {
  let binsHTML = "";
  let width = customSize ? 1.8 : rotated ? 1.2 : 3.3;
  let height = rotated ? 4.4 : 1.4;
  let fontSize = customSize ? 0.5 : 0.8;
  for (let i = 0; i < binCount; i++) {
    let positionNum = (startIndex + i).toString().padStart(2, "0");
    let binName = `${aisleNum}${side}${positionNum}`.toUpperCase();
    let entry = qohData?.[binName];
    let val = entry ? entry[dataType] : undefined;
    let color = getValueColor(parseFloat(val));
    // <-- Moved these BEFORE binsHTML!
    let top = vertical ? (startTop - i * offsetY) : (startTop + (side === "R" ? offsetY : 0));
    let left = vertical ? (startLeft + (side === "R" ? verticalSideShift : -verticalSideShift)) : (startLeft + i * offsetX);
    binsHTML += `
      <div class="bin" style="top: ${top}%; left: ${left}%; width: ${width}%; height: ${height}%; font-size: ${fontSize}vw; background-color: ${color};"
           onmouseenter="showTooltip('${binName}')" onmouseleave="hideTooltip()">
        <div class="${rotated ? 'rotated-text' : ''}">${binName}</div>
      </div>
    `;
  }
  document.getElementById("store-container").insertAdjacentHTML("beforeend", binsHTML);
}


    // Date Label logic
    function updateDateLabel(mode, start, end) {
      if (!modeLabel) return;
      modeLabel.textContent = mode === "Single Day"
        ? `Data for: ${start}`
        : `Data ${mode} from ${start} to ${end}`;
    }

    // --- MAIN DATA AGGREGATION FOR MULTI-DAY ---
    function applyDateSelection(mode, dateRange) {
      if (!dateRange.length) return;
      window.currentDateRange = dateRange; // For trendline in tooltip
      if (mode === "single") {
        updateDateLabel("Single Day", dateRange[0], dateRange[0]);
        loadDataForDate(dateRange[0]);
        return;
      }

      // Prep for multi-day
      const type = mode === "total" ? "Total" : "Averaging";
      updateDateLabel(type, dateRange[0], dateRange.at(-1));
      let rangeData = {};
      let allBinsPerDay = [];
      let trulyMissingBins = new Set();
      let loadedCount = 0;

      // Store allBinData for trendlines
      window.allBinData = {};

      dateRange.forEach(date => {
        fetch(`bin-data-${date}.json`)
          .then(res => res.json())
          .then(data => {
            // Store for trendline
            window.allBinData[date] = data;
            allBinsPerDay.push(Object.keys(data));
            Object.entries(data).forEach(([bin, stats]) => {
              if (!rangeData[bin]) rangeData[bin] = {};
              Object.entries(stats).forEach(([key, val]) => {
                if (!rangeData[bin][key]) rangeData[bin][key] = [];
                rangeData[bin][key].push(parseFloat(val));
              });
            });
            loadedCount++;
            if (loadedCount === dateRange.length) finalizeRangeCalculation(mode, rangeData, dateRange, allBinsPerDay);
          })
          .catch((error) => {
            const min = availableDates[0];
            const max = availableDates.at(-1);
            alert(`Dude! You choose unwisely! No data for this date exists. The map will remain unchanged. Choose again if you dare. Valid dates range from ${min} to ${max}.`);
          });
      });
    }

    function finalizeRangeCalculation(mode, rangeData, dateRange, allBinsPerDay) {
      const result = {};
      let trulyMissingBins = new Set();

      // Find all possible bins in any day
      const allBins = Array.from(new Set(allBinsPerDay.flat()));

      // Any bin that is missing in any day is truly missing
      allBins.forEach(bin => {
        let missingForAnyDay = false;
        for (let dayBins of allBinsPerDay) {
          if (!dayBins.includes(bin)) {
            missingForAnyDay = true;
            break;
          }
        }
        if (missingForAnyDay) {
          trulyMissingBins.add(bin);
        }
      });

      for (const bin in rangeData) {
        // Only calculate if not truly missing
        if (trulyMissingBins.has(bin)) continue;
        result[bin] = {};
        for (const key in rangeData[bin]) {
          const values = rangeData[bin][key].filter(v => !isNaN(v));
          const total = values.reduce((a, b) => a + b, 0);
          result[bin][key] = mode === "total" ? total : (values.length ? total / values.length : undefined);
        }
      }

      qohData = result;
      updateSliderAndMap();

      if (trulyMissingBins.size > 0) {
        // Only alert if there are truly missing bins
        alert(`Some Bins are Missing Data for this Date Range:\n${Array.from(trulyMissingBins).join(", ")}`);
      }
    }

    // Load data for a single date
    function loadDataForDate(dateStr) {
      qohData = {};
      window.currentDateRange = [dateStr]; // For single day trendline (just one point)
      fetch(`bin-data-${dateStr}.json`)
        .then(res => res.json())
        .then(data => {
          qohData = data;
          window.qohData = qohData;
          window.allBinData = {};
          window.allBinData[dateStr] = data;
          // Dynamically load dataType options
          const keys = new Set();
          Object.values(data).forEach(entry => {
            Object.keys(entry).forEach(k => keys.add(k));
          });
          const sortedKeys = [...keys].sort();
          const previouslySelected = dataSelect.value;
          dataSelect.innerHTML = "";
          sortedKeys.forEach(key => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = key;
            dataSelect.appendChild(opt);
          });
          dataSelect.value = sortedKeys.includes(previouslySelected) ? previouslySelected : sortedKeys[0];
          dataSelect.addEventListener("change", updateSliderAndMap, { once: true });
          updateSliderAndMap();
        })
        .catch((error) => {
          const min = availableDates[0];
          const max = availableDates.at(-1);
          alert(`Dude! You choose unwisely! No data for this date exists. The map will remain unchanged. Choose again if you dare. Valid dates range from ${min} to ${max}.`);
        });
    }

    // ----- Mode Controls -----
// Remove old bubbles if present
const modeControlsDiv = document.getElementById('mode-controls');
modeControlsDiv.innerHTML = `
  <label style="margin-right: 1rem;"><input type="radio" name="mode" value="single" checked> Single Day</label>
  <label style="margin-right: 1rem;"><input type="radio" name="mode" value="average"> Average</label>
  <label><input type="radio" name="mode" value="total"> Total</label>
`;


    // ----- Date Range Picker -----
    function setupDatePicker(singleMode, availableDates, latest) {
      $('#dateInput').daterangepicker('remove'); // Remove previous picker if exists
      $('#dateInput').daterangepicker({
        showDropdowns: true,
        autoUpdateInput: true,
        locale: { format: 'YYYY-MM-DD' },
        isInvalidDate: date => !availableDates.includes(date.format('YYYY-MM-DD')),
        startDate: latest,
        endDate: latest,
        singleDatePicker: singleMode
      }, function (start, end) {
        const mode = document.querySelector('input[name="mode"]:checked')?.value;
        const startStr = start.format('YYYY-MM-DD');
        const endStr = end.format('YYYY-MM-DD');

        if (mode === "single") {
          if (!availableDates.includes(startStr)) {
            alert("Dude that is outside of my range of emotions. Can't calculate because I don't have data.");
            return;
          }
          loadDataForDate(startStr);
          updateDateLabel("Single Day", startStr, startStr);
        } else {
          // Get all dates in range
          let startIdx = availableDates.indexOf(startStr);
          let endIdx = availableDates.indexOf(endStr);
          if (startIdx === -1 || endIdx === -1) {
            alert("Dude that is outside of my range of emotions. Can't calculate because I don't have data.");
            return;
          }
          let range = availableDates.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
          if (!range.length) {
            alert("Dude that is outside of my range of emotions. Can't calculate because I don't have data.");
            return;
          }
          applyDateSelection(mode, range);
        }
      });
    }

    fetch("date-index.json")
      .then(res => res.json())
      .then(dates => {
        availableDates = dates;
        const latest = dates.at(-1);

        // --- Initial picker setup
        setupDatePicker(true, availableDates, latest);

        // Listen for mode changes
        modeControlsDiv.addEventListener('change', () => {
          const mode = document.querySelector('input[name="mode"]:checked')?.value;
          const single = (mode === "single");
          setupDatePicker(single, availableDates, $('#dateInput').data('daterangepicker').startDate.format('YYYY-MM-DD'));
        });

        // Default load on startup
        const defaultMode = document.querySelector('input[name="mode"]:checked')?.value || "single";
        if (defaultMode === "single") {
          loadDataForDate(latest);
          updateDateLabel("Single Day", latest, latest);
        }
      });

    // ----- SLIDER -----
    noUiSlider.create(slider, {
      start: [0, 1, 2],
      connect: [false, true, true, true],
      range: { min: 0, max: 3 },
      behaviour: 'drag',
      tooltips: false
    });
    slider.noUiSlider.on("update", values => {
      sliderValues = values.map(v => parseFloat(v));
      document.getElementById("val-low").textContent = `≤ ${sliderValues[0].toFixed(1)}`;
      document.getElementById("val-mid").textContent = `≤ ${sliderValues[1].toFixed(1)}`;
      document.getElementById("val-high").textContent = `≤ ${sliderValues[2].toFixed(1)}`;
      renderMap();
    });

  };
});
