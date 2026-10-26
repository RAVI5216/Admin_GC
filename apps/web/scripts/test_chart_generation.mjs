/**
 * Automated Test Suite for SmartBin Telemetry Chart Generation
 * Tests chart generation across:
 *  1. Inactive / Stale Bins (1 month old -> flat line at bin's current level)
 *  2. Multi-bin isolation (SmartBin01 at 35% vs SmartBin02 at 70%)
 *  3. Live dynamic changes (telemetry rising: 20% -> 45% -> 70% -> 95%)
 *  4. Edge cases (invalid timestamps, null inputs)
 */

import assert from 'node:assert';

// Pure logic mirror of computeBinChartData
function computeBinChartData(bin, deviceHistory = [], currentTimeMs = Date.now()) {
  if (!bin) {
    return {
      chartData: [],
      isStale: false,
      staleLabel: '',
      mode: 'stale_flat_line',
    };
  }

  const lastUpdatedDate = bin.lastUpdated ? new Date(bin.lastUpdated) : null;
  const isInvalidDate = !lastUpdatedDate || isNaN(lastUpdatedDate.getTime());
  const msAgo = isInvalidDate ? Infinity : currentTimeMs - lastUpdatedDate.getTime();
  const hoursAgo = msAgo / (1000 * 60 * 60);
  const stale = isInvalidDate || hoursAgo >= 24;

  let staleText = '';
  if (stale) {
    if (hoursAgo === Infinity) {
      staleText = 'No recent telemetry';
    } else if (hoursAgo >= 24 * 30) {
      const months = Math.floor(hoursAgo / (24 * 30));
      staleText = `No change in ~${months} month${months > 1 ? 's' : ''}`;
    } else if (hoursAgo >= 24) {
      const days = Math.floor(hoursAgo / 24);
      staleText = `No change in ${days} day${days > 1 ? 's' : ''}`;
    } else {
      staleText = `No change in ${Math.floor(hoursAgo)} hours`;
    }
  }

  if (!stale && deviceHistory.length >= 2) {
    return {
      chartData: deviceHistory,
      isStale: false,
      staleLabel: '',
      mode: 'live_dynamic',
    };
  }

  if (!stale && deviceHistory.length === 1) {
    return {
      chartData: [
        { time: 'Earlier', value: bin.fillLevel },
        { time: deviceHistory[0].time, value: bin.fillLevel },
      ],
      isStale: false,
      staleLabel: 'Live (Level steady)',
      mode: 'live_steady',
    };
  }

  const flatPoints = [
    { time: '24h ago', value: bin.fillLevel },
    { time: '18h ago', value: bin.fillLevel },
    { time: '12h ago', value: bin.fillLevel },
    { time: '6h ago', value: bin.fillLevel },
    { time: 'Now', value: bin.fillLevel },
  ];

  return {
    chartData: flatPoints,
    isStale: stale,
    staleLabel: staleText,
    mode: 'stale_flat_line',
  };
}

// Simple ASCII chart renderer for CLI visualization
function renderAsciiChart(data, title) {
  console.log(`\n--- [Chart Preview: ${title}] ---`);
  const height = 8;
  const width = data.length;
  const grid = Array.from({ length: height }, () => Array(width).fill('   '));

  for (let c = 0; c < width; c++) {
    const val = data[c].value;
    const row = Math.min(height - 1, Math.max(0, Math.round((val / 100) * (height - 1))));
    grid[height - 1 - row][c] = ` ● `;
    // Fill underneath
    for (let fillRow = height - row; fillRow < height; fillRow++) {
      grid[fillRow][c] = ` ░ `;
    }
  }

  for (let r = 0; r < height; r++) {
    const pct = Math.round(((height - 1 - r) / (height - 1)) * 100);
    const label = `${pct}%`.padStart(4, ' ');
    console.log(`${label} |${grid[r].join('')}`);
  }
  console.log(`     +${'---'.repeat(width)}`);
  console.log(`      ${data.map(d => d.time.slice(0, 3).padEnd(3, ' ')).join('')}`);
  console.log(`Values: [${data.map(d => `${d.value}%`).join(', ')}]\n`);
}

function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING SMARTBIN CHART GENERATION TEST SUITE');
  console.log('========================================================\n');

  const now = new Date('2026-10-26T12:00:00Z').getTime();

  // -------------------------------------------------------------------------
  // TEST 1: Stale bin with no updates for 1 month (SmartBin02 at 70%)
  // -------------------------------------------------------------------------
  console.log('TEST 1: Inactive bin with no updates for 1 month (SmartBin02 at 70%)');
  const bin30DaysOld = {
    deviceId: 'SmartBin02',
    fillLevel: 70,
    lastUpdated: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  };

  const result1 = computeBinChartData(bin30DaysOld, [], now);
  assert.strictEqual(result1.isStale, true, 'Bin should be marked stale');
  assert.strictEqual(result1.mode, 'stale_flat_line', 'Mode should be stale_flat_line');
  assert.strictEqual(result1.chartData.length, 5, 'Should have 5 checkpoint points');
  assert.ok(result1.staleLabel.includes('month'), 'Label should mention ~1 month');
  result1.chartData.forEach((pt) => {
    assert.strictEqual(pt.value, 70, `Point ${pt.time} should equal 70%`);
  });
  console.log('✅ PASS: Resulted in a flat line at 70% with label:', result1.staleLabel);
  renderAsciiChart(result1.chartData, 'SmartBin02 (1 Month Idle @ 70%)');

  // -------------------------------------------------------------------------
  // TEST 2: Multi-bin comparison (SmartBin01 at 35% vs SmartBin02 at 70%)
  // -------------------------------------------------------------------------
  console.log('TEST 2: Independent bin values (SmartBin01 at 35% vs SmartBin02 at 70%)');
  const bin01Stale = {
    deviceId: 'SmartBin01',
    fillLevel: 35,
    lastUpdated: new Date(now - 48 * 60 * 60 * 1000).toISOString(), // 48h ago
  };
  const result2 = computeBinChartData(bin01Stale, [], now);
  assert.strictEqual(result2.isStale, true);
  result2.chartData.forEach((pt) => {
    assert.strictEqual(pt.value, 35, 'SmartBin01 should be flat at 35%, NOT 70%');
  });
  console.log('✅ PASS: SmartBin01 correctly rendered its own level (35%) independently of SmartBin02.');
  renderAsciiChart(result2.chartData, 'SmartBin01 (48h Idle @ 35%)');

  // -------------------------------------------------------------------------
  // TEST 3: Real-Time Dynamic Changes (Waste level rising over time)
  // -------------------------------------------------------------------------
  console.log('TEST 3: Live dynamic changes (Waste filling up: 20% -> 45% -> 70% -> 92%)');
  const activeBin = {
    deviceId: 'SmartBin03',
    fillLevel: 92,
    lastUpdated: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  };
  const liveStream = [
    { time: '10:00', value: 20 },
    { time: '10:30', value: 45 },
    { time: '11:00', value: 70 },
    { time: '11:30', value: 92 },
  ];
  const result3 = computeBinChartData(activeBin, liveStream, now);
  assert.strictEqual(result3.isStale, false, 'Should be active');
  assert.strictEqual(result3.mode, 'live_dynamic', 'Mode should be live_dynamic');
  assert.strictEqual(result3.chartData.length, 4, 'Should contain all 4 dynamic points');
  assert.strictEqual(result3.chartData[0].value, 20);
  assert.strictEqual(result3.chartData[3].value, 92);
  console.log('✅ PASS: Real-time curve dynamically plotted incoming fill values.');
  renderAsciiChart(result3.chartData, 'SmartBin03 (Live Filling Up: 20% -> 92%)');

  // -------------------------------------------------------------------------
  // TEST 4: Bin History Isolation (No cross-talk between different bins)
  // -------------------------------------------------------------------------
  console.log('TEST 4: Device History Isolation (Ensure device A points do not leak to device B)');
  const mockDeviceHistories = {
    SmartBin01: [{ time: '09:00', value: 30 }, { time: '09:15', value: 35 }],
    SmartBin02: [{ time: '09:00', value: 80 }, { time: '09:15', value: 85 }],
  };

  const bin01Chart = computeBinChartData(
    { deviceId: 'SmartBin01', fillLevel: 35, lastUpdated: new Date(now - 10000).toISOString() },
    mockDeviceHistories.SmartBin01,
    now
  );
  const bin02Chart = computeBinChartData(
    { deviceId: 'SmartBin02', fillLevel: 85, lastUpdated: new Date(now - 10000).toISOString() },
    mockDeviceHistories.SmartBin02,
    now
  );

  assert.deepStrictEqual(bin01Chart.chartData.map(p => p.value), [30, 35]);
  assert.deepStrictEqual(bin02Chart.chartData.map(p => p.value), [80, 85]);
  console.log('✅ PASS: SmartBin01 and SmartBin02 remain strictly isolated.');

  // -------------------------------------------------------------------------
  // TEST 5: Edge Cases
  // -------------------------------------------------------------------------
  console.log('TEST 5: Edge cases (null bin, missing timestamp)');
  const nullResult = computeBinChartData(null, [], now);
  assert.strictEqual(nullResult.chartData.length, 0);

  const missingDateResult = computeBinChartData({ deviceId: 'X', fillLevel: 50, lastUpdated: null }, [], now);
  assert.strictEqual(missingDateResult.isStale, true);
  assert.strictEqual(missingDateResult.chartData[0].value, 50);
  console.log('✅ PASS: Edge cases handled safely without runtime errors.');

  console.log('\n========================================================');
  console.log('🎉 ALL 5 TEST CASES PASSED SUCCESSFULLY!');
  console.log('========================================================\n');
}

runTests();
